export async function onRequestPost({ request }) {
  const origin = request.headers.get("Origin");

  if (origin && origin !== new URL(request.url).origin) {
    return new Response(
      JSON.stringify({ ok: false, error: "FORBIDDEN" }),
      { status: 403 }
    );
  }

  return new Response(
    JSON.stringify({ ok: true }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Set-Cookie":
          "veltria_ai_session=; Path=/api/; Max-Age=0; HttpOnly; Secure; SameSite=Strict"
      }
    }
  );
}
