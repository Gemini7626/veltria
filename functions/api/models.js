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

  const requestedLimit = Number(
    input.searchParams.get("limit") || "80"
  );

  const limit =
    Number.isInteger(requestedLimit) &&
    requestedLimit >= 1 &&
    requestedLimit <= 80
      ? requestedLimit
      : 80;

  params.set("limit", String(limit));
  // Model Hub: khong ep loc SFW

  const query = (input.searchParams.get("query") || "")
    .trim().slice(0, 100);

  if (query) params.set("query", query);

  const username = (
    input.searchParams.get("username") || ""
  ).trim().slice(0, 100);

  if (username) {
    params.set("username", username);
  }

  const type = input.searchParams.get("type");
  const allowedTypes = [
  "Checkpoint", "LORA", "LoCon", "LyCORIS",
  "DoRA", "VAE", "Controlnet", "Upscaler",
  "TextualInversion", "Hypernetwork",
  "MotionModule", "Workflows", "Poses",
  "Wildcards", "UNET", "TextEncoder",
  "LLM", "VLM", "Detection",
  "AestheticGradient", "Other"
];

if (allowedTypes.includes(type)) {
  params.set("types", type);
}

  const sort = input.searchParams.get("sort") || "Newest";
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
  } else {
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
      const invalidFilter = response.status === 400;
      return json({
        error: invalidFilter
          ? "Civitai Red API không chấp nhận bộ lọc này."
          : "Civitai Red API tạm thời không khả dụng.",
        upstreamStatus: response.status,
        requestedType: type || null
      }, invalidFilter ? 400 : 502);
    }

    const data = await response.json();

    // Chỉ xuất model và ảnh xem trước SFW.
    const items = (data.items || [])
      .filter(m => m && m.id)
      .map(m => {
        const images = (m.modelVersions || [])
          .flatMap(v => v.images || []);

        
const previewMedia = images
  .filter(i =>
    typeof i.url === "string" &&
    i.url.startsWith("https://")
  )
  .map(i => ({
    url: i.url,
    type: i.type || null,
    mimeType: i.mimeType || null
  }));

const isVideo = i =>
      /video/i.test(String(i.type || "")) ||
      /^video\//i.test(String(i.mimeType || "")) ||
      /\.(mp4|webm|mov)(?:\?|$)/i.test(i.url);

    const safeImages = [...new Set(
      previewMedia.filter(i => !isVideo(i)).map(i => i.url)
    )].slice(0, 24);

    const previewVideos = [...new Set(
      previewMedia.filter(isVideo).map(i => i.url)
    )].slice(0, 12);

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
      previewMedia,
      previewVideos,
          previewStatus,
          totalImages,
          url: `https://civitai.red/models/${m.id}`
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
