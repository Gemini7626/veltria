export async function onRequestGet({ env }) {
  if (!env.DB) {
    return Response.json(
      { ok: false, error: "D1 unavailable" },
      { status: 503 }
    );
  }

  try {
    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM models"
    ).first();

    const state = await env.DB.prepare(
      `SELECT sync_key, status, total_processed,
              cursor, next_page, updated_at
       FROM sync_state
       ORDER BY updated_at DESC
       LIMIT 10`
    ).all();

    return Response.json({
      ok: true,
      database: "connected",
      totalModels: count?.total ?? 0,
      syncJobs: (state.results || []).map(s => ({
        key: s.sync_key,
        status: s.status,
        totalProcessed: s.total_processed,
        hasCursor: Boolean(s.cursor),
        hasNextPage: Boolean(s.next_page),
        updatedAt: s.updated_at
      }))
    });
  } catch (error) {
    console.error("Sync status:", error);
    return Response.json(
      { ok: false, error: "Database query failed" },
      { status: 500 }
    );
  }
}
