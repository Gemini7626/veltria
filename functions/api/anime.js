export async function onRequestGet({ env }) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };

  if (!env.ANIME_DB) {
    return new Response(JSON.stringify({
      ok: false,
      error: "ANIME_DB_NOT_CONNECTED"
    }), { status: 503, headers });
  }

  try {
    const result = await env.ANIME_DB.prepare(
      `SELECT id, title_romaji, title_english,
              title_native, format, status,
              season_year, episodes, cover_image,
              is_adult
       FROM anime
       WHERE is_adult = 0
       ORDER BY id DESC
       LIMIT 20`
    ).all();

    return new Response(JSON.stringify({
      ok: true,
      anime: result.results || []
    }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: "DATABASE_QUERY_FAILED"
    }), { status: 500, headers });
  }
}
