const reply = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });

export async function onRequestGet({request, env}) {
  const url = new URL(request.url);

  const id = Number(url.searchParams.get("id") || "1752421");

  if (!Number.isSafeInteger(id) || id < 1)
    return reply({error:"Invalid model ID"}, 400);

  // Chỉ bật endpoint khi đã đặt secret kiểm thử.
  if (!env.VELTRIA_DEV_TOKEN)
    return reply({error:"Dev test disabled"}, 503);

  const token = request.headers.get("X-Dev-Token");

  if (token !== env.VELTRIA_DEV_TOKEN)
    return reply({error:"Unauthorized"}, 401);

  const headers = {Accept:"application/json"};

  if (env.CIVITAI_API_KEY)
    headers.Authorization = `Bearer ${env.CIVITAI_API_KEY}`;

  const hosts = [
    "https://civitai.com",
    "https://civitai.red"
  ];

  const results = [];

  for (const host of hosts) {
    try {
      const response = await fetch(
        `${host}/api/v1/models/${id}`,
        {
          headers,
          signal:AbortSignal.timeout(10000)
        }
      );

      if (!response.ok) {
        results.push({
          host,
          status:response.status,
          ok:false
        });
        continue;
      }

      const model = await response.json();
      const versions = model.modelVersions || [];
      const images = versions.flatMap(v=>v.images || []);

      results.push({
        host,
        status:response.status,
        ok:true,
        id:model.id,
        name:model.name,
        type:model.type,
        versions:versions.length,
        images:images.length,
        usableImages:images.filter(i=>
          typeof i.url === "string" &&
          i.url.startsWith("https://")
        ).length
      });

    } catch (error) {
      results.push({
        host,
        ok:false,
        error:"Upstream request failed"
      });
    }
  }

  return reply({
    modelId:id,
    results
  });
}
