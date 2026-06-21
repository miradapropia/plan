// Netlify EDGE Function — proxy to the Anthropic API with SSE streaming.
//
// Why an Edge Function (not a normal /netlify/functions one):
// Standard Netlify Functions on the free tier are killed after 10 seconds.
// Streaming does NOT bypass that cap, which is what caused the recurring
// "la lectura del archivo tardó demasiado" timeout when the model needed
// more than 10s to generate a full plan. Edge Functions run on Deno at the
// edge and allow long-lived streaming responses, so the timeout disappears.
//
// Deploy: place this file at  netlify/edge-functions/claude.js
// It serves the route /api/claude (see the config export at the bottom).

export default async (request, context) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: { message: "Method Not Allowed" } }),
      { status: 405, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  // API key from Netlify environment variables
  const apiKey =
    (typeof Netlify !== "undefined" && Netlify.env.get("ANTHROPIC_API_KEY")) ||
    (typeof Deno !== "undefined" && Deno.env.get("ANTHROPIC_API_KEY"));

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: {
          type: "config_error",
          message:
            "ANTHROPIC_API_KEY no está configurada en netlify (site settings → environment variables).",
        },
      }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  // Parse the incoming request body
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: { message: "Invalid JSON in request body" } }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  // Force streaming on the upstream call so bytes flow continuously
  body.stream = true;

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: { type: "upstream_error", message: "No se pudo conectar con anthropic: " + err.message },
      }),
      { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  // If Anthropic returned a non-OK status, pass its JSON error straight through
  const upstreamType = upstream.headers.get("content-type") || "";
  if (!upstream.ok && !upstreamType.includes("event-stream")) {
    const errText = await upstream.text();
    return new Response(errText, {
      status: upstream.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Stream the SSE body straight back to the browser
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      ...cors,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
};

// Route this edge function at /api/claude
export const config = { path: "/api/claude" };
