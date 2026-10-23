export async function onRequestPost({ request, env }) {
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });

  // Chưa cấu hình AI thì không thực hiện yêu cầu.
  if (!env.AI) {
    return json({
      ok: false,
      error: "AI_BINDING_NOT_CONFIGURED"
    }, 503);
  }

  // Chưa bật API công khai.
  if (env.IMAGE_API_ENABLED !== "true") {
    return json({
      ok: false,
      error: "IMAGE_API_DISABLED"
    }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "INVALID_JSON" }, 400);
  }

  const prompt = String(body.prompt || "").trim();

  if (prompt.length < 3 || prompt.length > 1000) {
    return json({
      ok: false,
      error: "INVALID_PROMPT"
    }, 400);
  }

  try {
    const result = await env.AI.run(
      "@cf/black-forest-labs/flux-1-schnell",
      { prompt }
    );

    if (!result?.image) {
      return json({
        ok: false,
        error: "NO_IMAGE_RETURNED"
      }, 502);
    }

    return json({
      ok: true,
      image: `data:image/jpeg;base64,${result.image}`
    });
  } catch (err) {
    console.error("Image generation failed:", err);
    return json({
      ok: false,
      error: "IMAGE_GENERATION_FAILED"
    }, 502);
  }
}
