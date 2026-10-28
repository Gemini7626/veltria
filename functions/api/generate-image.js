import { hasAISession } from "../_lib/ai-session.js";
export async function onRequestPost({ request, env }) {
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });

  // 1. Kiem tra Workers AI
  if (!env.AI) {
    return json({
      ok: false,
      error: "AI_BINDING_NOT_CONFIGURED"
    }, 503);
  }

  // 2. Kiem tra cong tac API
  if (env.IMAGE_API_ENABLED !== "true") {
    return json({
      ok: false,
      error: "IMAGE_API_DISABLED"
    }, 403);
  }

  // 3. Kiem tra Secret tren Cloudflare
  const secret = env.VELTRIA_AI_SECRET;

  if (typeof secret !== "string" || !secret) {
    return json({
      ok: false,
      error: "SERVER_SECRET_MISSING"
    }, 503);
  }

  // 4. Kiem tra khoa nguoi dung
  const supplied = request.headers.get("X-Veltria-Key");
  const sessionValid = await hasAISession(request, env);

  if (!sessionValid && (!supplied || supplied !== secret)) {
    return json({
      ok: false,
      error: "UNAUTHORIZED"
    }, 401);
  }

  // 5. Doc prompt
  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      ok: false,
      error: "INVALID_JSON"
    }, 400);
  }

  const prompt = String(body.prompt || "").trim();

  if (prompt.length < 3 || prompt.length > 1000) {
    return json({
      ok: false,
      error: "INVALID_PROMPT"
    }, 400);
  }

  // 6. Goi AI tao anh
  try {
    const supportedModels = {
      "flux-schnell": "@cf/black-forest-labs/flux-1-schnell",
      "sdxl-lightning": "@cf/bytedance/stable-diffusion-xl-lightning"
    };

    const requestedModel = String(body.model || "flux-schnell");
    const selectedModel = supportedModels[requestedModel];

    if (!selectedModel) {
      return json({
        ok: false,
        error: "MODEL_NOT_SUPPORTED"
      }, 400);
    }

    const result = await env.AI.run(
      selectedModel,
      { prompt }
    );

    if (requestedModel === "sdxl-lightning") {
      const bytes = new Uint8Array(await new Response(result).arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      return json({
        ok: true,
        image: "data:image/png;base64," + btoa(binary)
      });
    }

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

  } catch (error) {
    console.error("AI generation failed", error);

    return json({
      ok: false,
      error: "IMAGE_GENERATION_FAILED"
    }, 502);
  }
}
