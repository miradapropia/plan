// Netlify EDGE Function — proxy a la API de Anthropic con streaming SSE.
//
// Por qué una Edge Function (y no una Function normal):
// las Functions estándar del tier gratuito se cortan a los 10 segundos, y el
// streaming NO evita ese límite. Las Edge Functions corren en Deno y permiten
// respuestas largas en streaming, así que el timeout desaparece.
//
// ENDURECIMIENTO (protección de costes):
// - el MODELO lo decide el SERVIDOR a partir de la INTENCIÓN declarada:
//   se ignora por completo el modelo que pida el cliente
// - max_tokens con tope por intención
// - solo se reenvían a la API los campos de la lista blanca
// - límites de tamaño en messages y system
// - header Origin OBLIGATORIO y comprobado contra los dominios permitidos
//   (los previews *.netlify.app solo se aceptan si son de este mismo sitio)
// - presupuesto diario por cliente y global en netlify blobs (permisivo, y
//   SIEMPRE fail-open: si blobs falla, la herramienta sigue funcionando)
//
// CACHÉ DE PROMPT:
// el system puede llegar como array de bloques. El primer bloque es el prompt
// estático de plan (~3.300 tokens, por encima del mínimo de 2.048 que exige
// sonnet) y se marca con cache_control efímero: las lecturas de caché se
// facturan a 0,1x la tarifa de entrada. El contexto volátil del estudiante va
// en un bloque posterior, para no romper el prefijo cacheable.
//
// Despliegue: netlify/edge-functions/claude.js — sirve la ruta /api/claude.

// ─── intenciones ────────────────────────────────────────────────────────────
// el cliente declara PARA QUÉ pide, no CON QUÉ. el servidor traduce.
// nota: max_tokens es un TECHO, no una reserva: solo se paga lo que se genera.
// por eso los techos de las intenciones de usuario son generosos (no recortan
// funcionalidad) y solo existen para frenar una generación desbocada.
const INTENTS = {
  // conversación y replanificación: el estudiante espera respuesta completa
  chat:   { model: "claude-sonnet-4-6", maxTokens: 8000 },
  // ingesta de pdf/imagen → plan entero: la salida más larga del sistema
  ingest: { model: "claude-sonnet-4-6", maxTokens: 8000 },
  // capa 1 — comprobaciones de fondo, invisibles. barata por construcción.
  check:  { model: "claude-haiku-4-5-20251001", maxTokens: 400 },
};
const DEFAULT_INTENT = "chat";

const MAX_MESSAGES = 60;                 // tope de mensajes por conversación enviada
const MAX_SYSTEM_CHARS = 60000;          // tope del system (sumando bloques)
const MAX_SYSTEM_BLOCKS = 4;
const MAX_BODY_CHARS = 3000000;          // tope aproximado del cuerpo saliente (~3 MB)

// ─── presupuesto diario (deliberadamente permisivo) ─────────────────────────
// un estudiante intensivo gasta ~30 peticiones en todo un cuatrimestre.
// 300/día por cliente son diez veces lo que necesita el uso más pesado que
// hemos visto, así que nadie legítimo lo va a rozar; solo frena bucles y abuso.
// el techo global protege la factura: a ~0,03 $ de media por petición,
// 3.000/día es el peor caso que estamos dispuestos a pagar en un día.
// subir o bajar aquí es la única palanca que hace falta tocar.
const MAX_REQUESTS_PER_CLIENT_DAY = 300;
const MAX_REQUESTS_GLOBAL_DAY = 3000;
const BUDGET_TIMEOUT_MS = 700;           // pasado esto se deja pasar la petición
const CLIENT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

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
    "Access-Control-Allow-Headers": "Content-Type, X-Plan-Client",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// clave del día en hora de madrid
// (regla de la casa: nunca toISOString para días locales)
function madridDay() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}

// ─── presupuesto diario en netlify blobs ────────────────────────────────────
// dato agregado y anónimo: cuántas peticiones llegan cada día, en total y por
// cliente. el identificador de cliente lo genera el navegador al azar, no
// identifica a nadie y no se cruza con ningún otro dato.
//
// FAIL-OPEN por diseño: si blobs no está, tarda o falla, la petición PASA.
// prioridad del proyecto: que la herramienta funcione. un fallo de
// infraestructura de contadores nunca puede dejar a un estudiante sin ia.
async function checkBudget(clientId) {
  const { getStore } = await import("@netlify/blobs");
  const store = getStore("metricas-ia");
  const day = madridDay();
  const globalKey = day;
  const clientKey = clientId ? `c:${day}:${clientId}` : null;

  const [globalRaw, clientRaw] = await Promise.all([
    store.get(globalKey),
    clientKey ? store.get(clientKey) : Promise.resolve(null),
  ]);

  const globalCount = parseInt(globalRaw || "0", 10) || 0;
  const clientCount = parseInt(clientRaw || "0", 10) || 0;

  if (globalCount >= MAX_REQUESTS_GLOBAL_DAY) return { blocked: "global" };
  if (clientKey && clientCount >= MAX_REQUESTS_PER_CLIENT_DAY) return { blocked: "client" };

  await Promise.all([
    store.set(globalKey, String(globalCount + 1)),
    clientKey ? store.set(clientKey, String(clientCount + 1)) : Promise.resolve(),
  ]);
  return { blocked: null };
}

// devuelve {blocked} o {blocked:null}. nunca lanza, nunca bloquea por timeout.
async function budgetGate(clientId) {
  try {
    const result = await Promise.race([
      checkBudget(clientId),
      new Promise((r) => setTimeout(() => r({ blocked: null, timedOut: true }), BUDGET_TIMEOUT_MS)),
    ]);
    return result || { blocked: null };
  } catch (_) {
    return { blocked: null };
  }
}

function jsonError(status, type, message, cors) {
  return new Response(
    JSON.stringify({ error: { type, message } }),
    { status, headers: { ...cors, "Content-Type": "application/json" } }
  );
}

// system: acepta string (compatibilidad) o array de bloques de texto.
// solo el PRIMER bloque puede marcar caché, y siempre efímera — así el cliente
// no puede pedir la caché de 1 hora, que se factura al doble en escritura.
function normalizeSystem(raw) {
  if (raw === undefined) return { value: undefined };

  if (typeof raw === "string") {
    if (raw.length > MAX_SYSTEM_CHARS) return { error: "system demasiado largo." };
    return { value: raw };
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0 || raw.length > MAX_SYSTEM_BLOCKS) {
      return { error: "system: número de bloques inválido." };
    }
    let total = 0;
    const blocks = [];
    for (let i = 0; i < raw.length; i++) {
      const b = raw[i];
      if (!b || typeof b !== "object" || typeof b.text !== "string") {
        return { error: "system: bloque inválido." };
      }
      total += b.text.length;
      const out = { type: "text", text: b.text };
      if (i === 0 && b.cache_control) out.cache_control = { type: "ephemeral" };
      blocks.push(out);
    }
    if (total > MAX_SYSTEM_CHARS) return { error: "system demasiado largo." };
    return { value: blocks };
  }

  return { error: "system inválido." };
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

  const sys = normalizeSystem(body.system);
  if (sys.error) return jsonError(400, "invalid_request", sys.error, cors);

  // INTENCIÓN → modelo y techo de tokens. lo decide el servidor.
  const intent = INTENTS[body.intent] ? body.intent : DEFAULT_INTENT;
  const { model, maxTokens } = INTENTS[intent];

  // presupuesto diario (permisivo, fail-open)
  const rawClientId = request.headers.get("x-plan-client") || "";
  const clientId = CLIENT_ID_RE.test(rawClientId) ? rawClientId : null;
  const budget = await budgetGate(clientId);
  if (budget.blocked === "client") {
    return jsonError(429, "daily_limit",
      "has usado la ia muchísimas veces hoy. vuelve mañana y sigue donde lo dejaste: tu plan está intacto y el resto de la herramienta funciona con normalidad.", cors);
  }
  if (budget.blocked === "global") {
    return jsonError(429, "service_limit",
      "la ia está al límite de uso de hoy. el resto de plan funciona con normalidad; inténtalo mañana.", cors);
  }

  // LISTA BLANCA: solo estos campos viajan a la API; modelo y tope de tokens
  // los decide el servidor, se pida lo que se pida desde el cliente.
  const requestedMax = Number(body.max_tokens);
  // los chequeos de fondo (capa 1) NO van por streaming: nadie los mira
  // mientras se generan, y en json el cliente se ahorra parsear sse.
  const wantsStream = intent !== "check";
  const outbound = {
    model,
    max_tokens: Math.min(Number.isFinite(requestedMax) && requestedMax > 0 ? requestedMax : maxTokens, maxTokens),
    stream: wantsStream,
    messages: body.messages,
  };
  if (sys.value !== undefined) outbound.system = sys.value;

  const outboundStr = JSON.stringify(outbound);
  if (outboundStr.length > MAX_BODY_CHARS) {
    return jsonError(413, "invalid_request",
      "la petición es demasiado grande. si has adjuntado archivos, prueba con una versión más ligera.", cors);
  }

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

  // Devolver el SSE al navegador en streaming, o el json tal cual si no lo hay
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      ...cors,
      "Content-Type": wantsStream
        ? "text/event-stream; charset=utf-8"
        : (upstreamType || "application/json"),
      "Cache-Control": "no-cache",
    },
  });
};

// Esta edge function sirve la ruta /api/claude
export const config = { path: "/api/claude" };
