const COOKIE = "veltria_ai_session";
const MAX_AGE = 7 * 24 * 60 * 60;

function encode(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sign(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return encode(await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(value)
  ));
}

export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) {
    return new Response('{"ok":false}', { status: 403, headers });
  }

  const secret = env.VELTRIA_AI_SECRET;
  if (!secret) {
    return new Response('{"ok":false}', { status: 503, headers });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('{"ok":false}', { status: 400, headers });
  }

  if (typeof body.key !== "string" || body.key !== secret) {
    return new Response('{"ok":false}', { status: 401, headers });
  }

  const expires = Math.floor(Date.now() / 1000) + MAX_AGE;
  const signature = await sign(secret, String(expires));

  headers["Set-Cookie"] =
    `${COOKIE}=${expires}.${signature}; ` +
    `Path=/api/; Max-Age=${MAX_AGE}; ` +
    "HttpOnly; Secure; SameSite=Strict";

  return new Response('{"ok":true}', { status: 200, headers });
}
