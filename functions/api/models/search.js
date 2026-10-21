export async function onRequestGet({ request, env }) {
  const json = (data, status = 200) =>
    Response.json(data, {
      status,
      headers: { "Cache-Control": "no-store" }
    });

  if (!env.DB) {
    return json({ error: "D1 chưa kết nối" }, 503);
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("query") || "").trim();
  const username = (url.searchParams.get("username") || "").trim();
  const type = (url.searchParams.get("type") || "").trim();
  const sort = url.searchParams.get("sort") || "Newest";

  const limit = Math.min(
    80,
    Math.max(1, Number(url.searchParams.get("limit")) || 40)
  );

  const page = Math.min(
    1000,
    Math.max(1, Number(url.searchParams.get("page")) || 1)
  );

  const conditions = [];
  const values = [];

  if (query) {
    const words = query.split(/\\s+/).filter(Boolean).slice(0, 6);
    const escapeLike = value =>
      value.replace(/[\\\\%_]/g, char => "\\\\" + char);

    const wordConditions = words.map(word => {
      values.push(`%${escapeLike(word)}%`);
      return "name LIKE ? COLLATE NOCASE";
    });

    if (/^\\d+$/.test(query) && Number.isSafeInteger(Number(query))) {
      conditions.push(
        "(id = ? OR (" + wordConditions.join(" AND ") + "))"
      );
      values.splice(values.length - words.length, 0, Number(query));
    } else {
      conditions.push("(" + wordConditions.join(" AND ") + ")");
    }
  }

  if (username) {
    conditions.push("creator = ? COLLATE NOCASE");
    values.push(username);
  }

  if (type) {
    conditions.push("type = ? COLLATE NOCASE");
    values.push(type);
  }

  const where = conditions.length
    ? "WHERE " + conditions.join(" AND ")
    : "";

  const order = sort === "Oldest"
    ? "ORDER BY id ASC"
    : "ORDER BY id DESC";

  try {
    const sql = `
      SELECT id, name, type, creator, description,
             url, nsfw, raw_json
      FROM models
      ${where}
      ${order}
      LIMIT ? OFFSET ?
    `;

    const result = await env.DB.prepare(sql)
      .bind(...values, limit + 1, (page - 1) * limit)
      .all();

    const rows = result.results || [];
    const hasMore = rows.length > limit;

    const items = rows.slice(0, limit).map(row => {
      let raw = {};

      try {
        raw = JSON.parse(row.raw_json || "{}");
      } catch {}

      const versions = Array.isArray(raw.modelVersions)
        ? raw.modelVersions : [];

      const previewImages = versions
        .flatMap(v => Array.isArray(v.images) ? v.images : [])
        .map(img => typeof img === "string" ? img : img?.url)
        .filter(u => typeof u === "string" && /^https:\/\//i.test(u))
        .slice(0, 24);

      return {
        ...raw,
        id: row.id,
        name: row.name,
        type: row.type,
        creator: row.creator || raw.creator?.username || null,
        description: row.description,
        url: row.url,
        nsfw: Boolean(row.nsfw),
        image: previewImages[0] || null,
        previewImages
      };
    });

    return json({
      items,
      page,
      nextPage: hasMore ? page + 1 : null,
      nextCursor: null,
      hasMore,
      resultCount: items.length,
      source: "VELTRIA D1"
    });
  } catch (error) {
    console.error("D1 search error:", error);
    return json({ error: "Lỗi tìm kiếm D1" }, 500);
  }
}
