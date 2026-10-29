export async function onRequestGet({ request, env }) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };

  const reply = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers });

  if (!env.ANIME_DB) {
    return reply({ ok: false, error: "DB_UNAVAILABLE" }, 503);
  }

  const url = new URL(request.url);
  const name = (url.searchParams.get("name") || "").trim();

  if (name.length < 2 || name.length > 100) {
    return reply({ ok: false, error: "INVALID_NAME" }, 400);
  }

  try {
    const result = await env.ANIME_DB.prepare(`
      SELECT
        c.id,
        c.name_full,
        c.description,
        c.image_url,
        a.title_romaji,
        a.title_english
      FROM characters c
      LEFT JOIN anime a ON a.id = c.anime_id
      WHERE LOWER(c.name_full) LIKE LOWER(?)
         OR LOWER(COALESCE(c.name_alternative, '')) LIKE LOWER(?)
      LIMIT 10
    `).bind("%" + name + "%", "%" + name + "%").all();

    return reply({
      ok: true,
      characters: result.results || []
    });
  } catch {
    return reply({ ok: false, error: "LOOKUP_FAILED" }, 500);
  }
}
