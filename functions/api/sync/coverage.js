export async function onRequestGet({ env }) {
  if (!env.DB) {
    return Response.json(
      { ok: false, error: "D1 unavailable" },
      { status: 503 }
    );
  }

  try {
    const result = await env.DB.prepare(`
      SELECT
        CAST(id / 100000 AS INTEGER) * 100000 AS idStart,
        COUNT(*) AS modelCount,
        MIN(id) AS minId,
        MAX(id) AS maxId
      FROM models
      GROUP BY CAST(id / 100000 AS INTEGER)
      ORDER BY idStart ASC
    `).all();

    return Response.json({
      ok: true,
      source: "VELTRIA D1",
      bucketSize: 100000,
      ranges: result.results || []
    }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("Coverage error:", error);
    return Response.json(
      { ok: false, error: "Coverage query failed" },
      { status: 500 }
    );
  }
}
