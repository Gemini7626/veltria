const API = "https://civitai.red/api/v1/models";

function reply(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

function authorized(request, env) {
  const expected = env.SYNC_SECRET;
  const supplied = request.headers.get("Authorization");
  return Boolean(
    expected &&
    supplied &&
    supplied === `Bearer ${expected}`
  );
}

export async function onRequestPost({ request, env }) {
  if (!authorized(request, env)) {
    return reply({ ok: false, error: "Unauthorized" }, 401);
  }

  if (!env.DB) {
    return reply({ ok: false, error: "D1 unavailable" }, 503);
  }

  const db = env.DB;
  const key = "civitai-red-backfill";

  try {
    const state = await db.prepare(
      "SELECT cursor, next_page, total_processed FROM sync_state WHERE sync_key = ?"
    ).bind(key).first();

    const params = new URLSearchParams({
      limit: "40",
      sort: "Newest",
      page: "2"
    });

    if (state?.cursor) {
      params.set("cursor", state.cursor);
    }

    const url = state?.next_page ||
      `${API}?${params.toString()}`;

    const headers = { Accept: "application/json" };

    if (env.CIVITAI_API_KEY) {
      headers.Authorization =
        `Bearer ${env.CIVITAI_API_KEY}`;
    }

    const upstream = await fetch(url, {
      headers,
      redirect: "follow"
    });

    if (!upstream.ok) {
      return reply({
        ok: false,
        error: "Civitai Red request failed",
        upstreamStatus: upstream.status
      }, 502);
    }

    const data = await upstream.json();
    const items = Array.isArray(data.items)
      ? data.items : [];

    const meta = data.metadata || {};
    let saved = 0;

    for (const model of items) {
      if (!Number.isSafeInteger(Number(model.id))) continue;

      await db.prepare(`
        INSERT INTO models
          (id, name, type, creator, description,
           url, nsfw, raw_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          type = excluded.type,
          creator = excluded.creator,
          description = excluded.description,
          url = excluded.url,
          nsfw = excluded.nsfw,
          raw_json = excluded.raw_json,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        Number(model.id),
        model.name || "",
        model.type || null,
        model.creator?.username || null,
        model.description || null,
        `https://civitai.red/models/${model.id}`,
        model.nsfw ? 1 : 0,
        JSON.stringify(model),
      ).run();

      for (const version of model.modelVersions || []) {
        if (!Number.isSafeInteger(Number(version.id))) continue;

        await db.prepare(`
          INSERT INTO model_versions
            (id, model_id, name, base_model,
             created_at, raw_json)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            base_model = excluded.base_model,
            raw_json = excluded.raw_json
        `).bind(
          Number(version.id),
          Number(model.id),
          version.name || null,
          version.baseModel || null,
          version.createdAt || null,
          JSON.stringify(version)
        ).run();

        if (version.baseModel) {
          await db.prepare(`
            INSERT OR IGNORE INTO base_models(name)
            VALUES (?)
          `).bind(version.baseModel).run();
        }
      }

      saved++;
    }

    let nextPage = meta.nextPage || null;
    let nextCursor = meta.nextCursor || null;

    if (nextPage) {
      const next = new URL(nextPage, API);

      if (next.origin !== new URL(API).origin ||
          !next.pathname.startsWith("/api/v1/models")) {
        return reply({
          ok: false,
          error: "Unexpected pagination URL"
        }, 502);
      }

      nextPage = next.toString();
      nextCursor =
        next.searchParams.get("cursor") || nextCursor;
    }

    const hasMore = Boolean(nextPage || nextCursor);
    const total = (state?.total_processed || 0) + saved;

    await db.prepare(`
      INSERT INTO sync_state
        (sync_key, cursor, next_page, status,
         total_processed, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(sync_key) DO UPDATE SET
        cursor = excluded.cursor,
        next_page = excluded.next_page,
        status = excluded.status,
        total_processed = excluded.total_processed,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      key,
      hasMore ? nextCursor : null,
      hasMore ? nextPage : null,
      hasMore ? "running" : "completed",
      total
    ).run();

    return reply({
      ok: true,
      saved,
      totalProcessed: total,
      hasMore,
      status: hasMore ? "running" : "completed"
    });

  } catch (error) {
    console.error("Sync error:", error);
    return reply({
      ok: false,
      error: "Sync failed; check server logs"
    }, 500);
  }
}
