const API = "https://civitai.red/api/v1/models";

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

  params.set("limit", "80");
  // Model Hub: khong ep loc SFW

  const query = (input.searchParams.get("query") || "")
    .trim().slice(0, 100);

  if (query) params.set("query", query);

  const type = input.searchParams.get("type");
  if (["Checkpoint", "LORA", "TextualInversion", "Hypernetwork", "AestheticGradient", "Controlnet", "Poses", "Wildcards", "VAE", "Upscaler", "MotionModule", "Workflows", "Other"].includes(type)) {
    params.set("types", type);
  }

  const sort = input.searchParams.get("sort");
  if (["Most Downloaded", "Newest", "Highest Rated"]
      .includes(sort)) {
    params.set("sort", sort);
  }

  // Civitai pagination: prefer cursor returned by nextPage.
  const cursor = input.searchParams.get("cursor");
  const page = Number(input.searchParams.get("page") || "1");
  if (cursor) {
    if (cursor.length > 1000) return json({error:"Cursor không hợp lệ."},400);
    params.set("cursor", cursor);
  } else if (!query) {
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000)
      return json({error:"Trang không hợp lệ."},400);
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
      .filter(m => m && m.id)
      .map(m => {
        const images = (m.modelVersions || [])
          .flatMap(v => v.images || []);

        const safeImages = [...new Set(
  images.filter(i => typeof i.url === "string" && i.url.startsWith("https://")).map(i => i.url)
)].slice(0, 24);
const safeImage = safeImages[0] || null;
const totalImages = images.length;
const previewStatus = safeImages.length
  ? "available"
  : totalImages ? "unavailable" : "missing";

        return {
          id: m.id,
          name: m.name,
          type: m.type,
          creator: m.creator?.username || "",
          image: safeImage,
previewImages: safeImages,
          previewStatus,
          totalImages,
          url: `https://civitai.com/models/${m.id}`
        };
      });

    const nextPageUrl = data.metadata?.nextPage || "";
    let nextCursor = data.metadata?.nextCursor || null;
    let nextPage = null;
    if (nextPageUrl) {
      try {
        const u = new URL(nextPageUrl, API);
        nextCursor ||= u.searchParams.get("cursor");
        const n = Number(u.searchParams.get("page"));
        if (Number.isSafeInteger(n) && n > 0) nextPage = n;
      } catch {}
    }
    return json({
      items,
      page,
      nextCursor,
      nextPage,
      hasMore: Boolean(nextCursor || nextPage),
      resultCount: items.length,
      totalItems: data.metadata?.totalItems ?? null
    });
  } catch {
    return json({
      error: "Không thể kết nối Civitai."
    }, 502);
  }
}
