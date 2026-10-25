const COOKIE = "veltria_ai_session";

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
    "HMAC",
    key,
    new TextEncoder().encode(value)
  ));
}

export async function hasAISession(request, env) {
  const secret = env.VELTRIA_AI_SECRET;
  if (!secret) return false;

  const cookies = request.headers.get("Cookie") || "";
  const value = cookies
    .split(";")
    .map(x => x.trim())
    .find(x => x.startsWith(COOKIE + "="))
    ?.slice(COOKIE.length + 1);

  if (!value) return false;

  const parts = value.split(".");
  if (parts.length !== 2) return false;

  const [expires, signature] = parts;

  if (!/^\d{10}$/.test(expires)) return false;
  if (Number(expires) <= Date.now() / 1000) return false;

  const expected = await sign(secret, expires);
  return signature === expected;
}
