const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });

export async function onRequestGet({ request, env }) {
  const input = new URL(request.url);
  const id = Number(input.searchParams.get("modelId"));

  if (!Number.isSafeInteger(id) || id < 1)
    return json({ error: "Invalid model ID" }, 400);

  const limit = Math.min(
    100,
    Math.max(1, Number(input.searchParams.get("limit")) || 50)
  );

  const params = new URLSearchParams({
    modelId: String(id),
    limit: String(limit)
  });

  const headers = { Accept: "application/json" };

  if (env.CIVITAI_API_KEY)
    headers.Authorization = `Bearer ${env.CIVITAI_API_KEY}`;

  try {
    const response = await fetch(
      `https://civitai.red/api/v1/images?${params}`,
      {
        headers,
        signal: AbortSignal.timeout(12000)
      }
    );

    if (!response.ok)
      return json({
        error: "RED Gallery unavailable",
        upstreamStatus: response.status
      }, 502);

    const data = await response.json();

    const items = (data.items || [])
      .filter(x => typeof x.url === "string" &&
                   x.url.startsWith("https://"))
      .map(x => ({
        id: x.id ?? null,
        url: x.url,
        type: x.type || "image",
        mimeType: x.mimeType || null,
        nsfwLevel: x.nsfwLevel ?? null,
        sources: ["red"]
      }));

    return json({
      modelId: id,
      source: "red",
      total: items.length,
      sources: [{
        source: "red",
        ok: true,
        count: items.length
      }],
      items
    });
  } catch {
    return json({ error: "RED Gallery connection failed" }, 502);
  }
}
