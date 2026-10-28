function reply(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function onRequestPost({ request, env }) {
  const expected = env.SYNC_SECRET;
  const supplied = request.headers.get("Authorization");

  if (!expected || supplied !== `Bearer ${expected}`) {
    return reply({ ok: false, error: "UNAUTHORIZED" }, 401);
  }

  if (!env.ANIME_DB) {
    return reply({ ok: false, error: "ANIME_DB_UNAVAILABLE" }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return reply({ ok: false, error: "INVALID_JSON" }, 400);
  }

  const anime = body?.anime;

  if (!Array.isArray(anime) || anime.length < 1 || anime.length > 20) {
    return reply({ ok: false, error: "INVALID_ANIME_LIST" }, 400);
  }

  let saved = 0;

  try {
    for (const item of anime) {
      if (!Number.isSafeInteger(item?.id) || item.id <= 0) {
        return reply({ ok: false, error: "INVALID_ANIME_ID" }, 400);
      }

      const title = item.title || {};
      if (!title.romaji && !title.english && !title.native) {
        return reply({ ok: false, error: "INVALID_TITLE" }, 400);
      }

      await env.ANIME_DB.prepare(`
        INSERT INTO anime (
          anilist_id, mal_id, title_romaji,
          title_english, title_native, description,
          format, status, season, season_year,
          episodes, cover_image, is_adult,
          source, last_synced_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'anilist', CURRENT_TIMESTAMP)
        ON CONFLICT(anilist_id) DO UPDATE SET
          mal_id = excluded.mal_id,
          title_romaji = excluded.title_romaji,
          title_english = excluded.title_english,
          title_native = excluded.title_native,
          description = excluded.description,
          format = excluded.format,
          status = excluded.status,
          season = excluded.season,
          season_year = excluded.season_year,
          episodes = excluded.episodes,
          cover_image = excluded.cover_image,
          is_adult = excluded.is_adult,
          last_synced_at = CURRENT_TIMESTAMP
      `).bind(
        item.id,
        item.idMal ?? null,
        title.romaji ?? null,
        title.english ?? null,
        title.native ?? null,
        item.description ?? null,
        item.format ?? null,
        item.status ?? null,
        item.season ?? null,
        item.seasonYear ?? null,
        item.episodes ?? null,
        item.coverImage?.large ?? null,
        item.isAdult ? 1 : 0
      ).run();

      saved++;
    }

    return reply({ ok: true, saved });
  } catch {
    return reply({ ok: false, error: "IMPORT_FAILED", saved }, 500);
  }
}
