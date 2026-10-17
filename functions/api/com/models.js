const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });

export async function onRequestGet({ request, env }) {
  if (!env.CIVITAI_COM_API_KEY) {
    return json({ error: "COM API key missing" }, 503);
  }

  const input = new URL(request.url);
  const params = new URLSearchParams();

  params.set("limit", "30");

  const query = input.searchParams.get("query");
  if (query) params.set("query", query.slice(0, 100));

  const page = Number(input.searchParams.get("page") || "1");
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000) {
    return json({ error: "Invalid page" }, 400);
  }
  params.set("page", String(page));

  try {
    const response = await fetch(
      `https://civitai.com/api/v1/models?${params}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${env.CIVITAI_COM_API_KEY}`
        },
        signal: AbortSignal.timeout(12000)
      }
    );

    if (!response.ok) {
      return json({
        source: "com",
        error: "Upstream API error",
        upstreamStatus: response.status
      }, 502);
    }

    const data = await response.json();

    return json({
      source: "com",
      items: data.items || [],
      metadata: data.metadata || {}
    });
  } catch {
    return json({
      source: "com",
      error: "COM API unavailable"
    }, 502);
  }
}
