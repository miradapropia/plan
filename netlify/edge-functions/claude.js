// Netlify EDGE Function — proxy a la API de Anthropic con streaming SSE.
//
// Por qué una Edge Function (y no una Function normal):
// las Functions estándar del tier gratuito se cortan a los 10 segundos, y el
// streaming NO evita ese límite. Las Edge Functions corren en Deno y permiten
// respuestas largas en streaming, así que el timeout desaparece.
//
// ENDURECIMIENTO (protección de costes):
// - el MODELO se fija aquí en el servidor: se ignora el que pida el cliente
// - max_tokens con tope
// - solo se reenvían a la API los campos de la lista blanca
// - límites de tamaño en messages y system
// - header Origin OBLIGATORIO y comprobado contra los dominios permitidos
//   (los previews *.netlify.app solo se aceptan si son de este mismo sitio)
// - contador diario agregado de peticiones en netlify blobs (store "metricas-ia")
//
// Despliegue: netlify/edge-functions/claude.js — sirve la ruta /api/claude.

const MODEL = "claude-sonnet-4-6";       // único modelo permitido (el cliente no elige)
const MAX_TOKENS_CAP = 8000;             // tope de tokens de salida por petición
const MAX_MESSAGES = 60;                 // tope de mensajes por conversación enviada
const MAX_SYSTEM_CHARS = 60000;          // tope del system prompt
const MAX_BODY_CHARS = 3000000;          // tope aproximado del cuerpo saliente (~3 MB)

const ALLOWED_ORIGINS = [
  "https://plan.miradapropia.org",
  "http://localhost:8888",   // netlify dev
  "http://localhost:3000",
  "http://127.0.0.1:8888",
];

function originAllowed(origin, context) {
  // los navegadores SIEMPRE envían Origin en un POST hecho con fetch();
  // una petición sin Origin viene de curl/bots, no de la app → se rechaza.
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // previews de deploy y subdominio por defecto, pero SOLO los de este sitio
  try {
    const host = new URL(origin).hostname;
    const site = context && context.site && context.site.name;
    if (site) {
      if (host === `${site}.netlify.app` || host.endsWith(`--${site}.netlify.app`)) return true;
    } else if (host.endsWith(".netlify.app")) {
      // sin metadatos del sitio: se mantiene el comportamiento anterior
      return true;
    }
  } catch (_) {}
  return false;
}

function corsFor(origin, context) {
  return {
    "Access-Control-Allow-Origin": originAllowed(origin, context) && origin ? origin : "https://plan.miradapropia.org",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// ─── contador diario de peticiones (netlify blobs) ──────────────────────────
// dato agregado y anónimo: cuántas peticiones llegan a la ia cada día.
// import dinámico + try/catch + carrera con timeout: si blobs no está
// disponible o tarda, el proxy sigue funcionando exactamente igual.
async function bumpDailyCounter() {
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore("metricas-ia");
    // clave del día en hora de madrid (regla de la casa: nunca toISOString para días locales)
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
    const cur = parseInt((await store.get(day)) || "0", 10) || 0;
    await store.set(day, String(cur + 1));
  } catch (_) { /* el contador jamás bloquea el proxy */ }
}

function jsonError(status, type, message, cors) {
  return new Response(
    JSON.stringify({ error: { type, message } }),
    { status, headers: { ...cors, "Content-Type": "application/json" } }
  );
}

export default async (request, context) => {
  const origin = request.headers.get("origin");
  const cors = corsFor(origin, context);

  // Preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== "POST") {
    return jsonError(405, "method_not_allowed", "Method Not Allowed", cors);
  }
  if (!originAllowed(origin, context)) {
    return jsonError(403, "forbidden_origin", "origen no permitido.", cors);
  }

  // API key desde las variables de entorno de Netlify
  const apiKey =
    (typeof Netlify !== "undefined" && Netlify.env.get("ANTHROPIC_API_KEY")) ||
    (typeof Deno !== "undefined" && Deno.env.get("ANTHROPIC_API_KEY"));

  if (!apiKey) {
    return jsonError(500, "config_error",
      "ANTHROPIC_API_KEY no está configurada en netlify (site settings → environment variables).", cors);
  }

  // Parsear el cuerpo entrante
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonError(400, "invalid_request", "Invalid JSON in request body", cors);
  }

  // Validaciones de forma y tamaño
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return jsonError(400, "invalid_request", "messages debe ser un array no vacío.", cors);
  }
  if (body.messages.length > MAX_MESSAGES) {
    return jsonError(400, "invalid_request", "demasiados mensajes en la conversación.", cors);
  }
  if (body.system !== undefined && (typeof body.system !== "string" || body.system.length > MAX_SYSTEM_CHARS)) {
    return jsonError(400, "invalid_request", "system inválido o demasiado largo.", cors);
  }

  // LISTA BLANCA: solo estos campos viajan a la API; modelo y tope de tokens
  // los decide el servidor, se pida lo que se pida desde el cliente.
  const requestedMax = Number(body.max_tokens);
  const outbound = {
    model: MODEL,
    max_tokens: Math.min(Number.isFinite(requestedMax) && requestedMax > 0 ? requestedMax : MAX_TOKENS_CAP, MAX_TOKENS_CAP),
    stream: true,
    messages: body.messages,
  };
  if (typeof body.system === "string") outbound.system = body.system;

  const outboundStr = JSON.stringify(outbound);
  if (outboundStr.length > MAX_BODY_CHARS) {
    return jsonError(413, "invalid_request",
      "la petición es demasiado grande. si has adjuntado archivos, prueba con una versión más ligera.", cors);
  }

  // contar la petición del día (máx. 400 ms; nunca bloquea la respuesta)
  await Promise.race([bumpDailyCounter(), new Promise(r => setTimeout(r, 400))]);

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: outboundStr,
    });
  } catch (err) {
    return jsonError(502, "upstream_error", "No se pudo conectar con anthropic: " + err.message, cors);
  }

  // Si Anthropic devolvió un estado no-OK, pasar su error JSON tal cual
  const upstreamType = upstream.headers.get("content-type") || "";
  if (!upstream.ok && !upstreamType.includes("event-stream")) {
    const errText = await upstream.text();
    return new Response(errText, {
      status: upstream.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Devolver el SSE al navegador en streaming
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      ...cors,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
};

// Esta edge function sirve la ruta /api/claude
export const config = { path: "/api/claude" };
