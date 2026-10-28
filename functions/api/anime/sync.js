const ANILIST_API = "https://graphql.anilist.co";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function onRequestPost({ request, env }) {
  const expected = env.SYNC_SECRET;
  const supplied = request.headers.get("Authorization");

  if (!expected || supplied !== `Bearer ${expected}`) {
    return json({ ok: false, error: "UNAUTHORIZED" }, 401);
  }

  if (!env.ANIME_DB) {
    return json({ ok: false, error: "ANIME_DB_UNAVAILABLE" }, 503);
  }

  const query = `
    query {
      Page(page: 1, perPage: 10) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          id
          idMal
          title { romaji english native }
          description(asHtml: false)
          format
          status
          season
          seasonYear
          episodes
          coverImage { large }
          isAdult
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      return json({
        ok: false,
        error: "ANILIST_REQUEST_FAILED",
        status: response.status
      }, 502);
    }

    const data = await response.json();

    if (data.errors) {
      return json({ ok: false, error: "ANILIST_GRAPHQL_ERROR" }, 502);
    }

    const anime = data.data?.Page?.media || [];
    let saved = 0;

    for (const item of anime) {
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
        item.id, item.idMal,
        item.title?.romaji || null,
        item.title?.english || null,
        item.title?.native || null,
        item.description || null,
        item.format || null,
        item.status || null,
        item.season || null,
        item.seasonYear || null,
        item.episodes || null,
        item.coverImage?.large || null,
        item.isAdult ? 1 : 0
      ).run();

      saved++;
    }

    return json({ ok: true, saved });
  } catch (error) {
    return json({ ok: false, error: "ANIME_SYNC_FAILED" }, 500);
  }
}
