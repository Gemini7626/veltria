const API = "https://civitai.com/api/v1/models";

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
  const input = new URL(request.url);
  const mode = input.searchParams.get("mode") || "public";

  // Không cho truy cập nội dung 18+ trước khi
  // có xác thực tài khoản và kiểm tra quyền server-side.
  if (mode !== "public") {
    return json({
      error: "OBSIDIAN cần xác thực tài khoản và quyền 18+."
    }, 403);
  }

  const params = new URLSearchParams();

  params.set("limit", "40");
  params.set("nsfw", "false");

  const query = (input.searchParams.get("query") || "")
    .trim().slice(0, 100);

  if (query) params.set("query", query);

  const type = input.searchParams.get("type");
  if (["Checkpoint", "LORA"].includes(type)) {
    params.set("types", type);
  }

  const sort = input.searchParams.get("sort");
  if (["Most Downloaded", "Newest", "Highest Rated"]
      .includes(sort)) {
    params.set("sort", sort);
  }

  const page = Number(input.searchParams.get("page") || "1");
  if (!Number.isSafeInteger(page) || page < 1 || page > 100) {
    return json({ error: "Trang không hợp lệ." }, 400);
  }

// Civitai không hỗ trợ page khi tìm kiếm bằng query.
if (query) {
  const cursor = input.searchParams.get("cursor");
  if (cursor && cursor.length <= 500) {
    params.set("cursor", cursor);
  }
} else {
  params.set("page", String(page));
}


  const headers = { Accept: "application/json" };

  if (env.CIVITAI_API_KEY) {
    headers.Authorization = `Bearer ${env.CIVITAI_API_KEY}`;
  }

  try {
    const response = await fetch(`${API}?${params}`, {
      headers,
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      return json({
        error: "Civitai API tạm thời không khả dụng.",
        upstreamStatus: response.status
      }, 502);
    }

    const data = await response.json();

    // Chỉ xuất model và ảnh xem trước SFW.
    const items = (data.items || [])
      .filter(m => !m.nsfw)
      .map(m => {
        const images = (m.modelVersions || [])
          .flatMap(v => v.images || []);

        const safeImage = images.find(i =>
          i.nsfwLevel === 1 || i.nsfw === "None"
        );

        return {
          id: m.id,
          name: m.name,
          type: m.type,
          creator: m.creator?.username || "",
          image: safeImage?.url || null,
          url: `https://civitai.com/models/${m.id}`
        };
      });

    return json({
      items,
      page,
      hasMore: Boolean(data.metadata?.nextPage),
    nextCursor: query
      ? (data.metadata?.nextCursor || (() => {
          try { return new URL(data.metadata?.nextPage || "").searchParams.get("cursor"); }
          catch { return null; }
        })())
      : null
    });
  } catch {
    return json({
      error: "Không thể kết nối Civitai."
    }, 502);
  }
}
