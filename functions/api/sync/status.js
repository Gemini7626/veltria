export async function onRequestGet({ env }) {
  if (!env.DB) {
    return Response.json(
      { ok: false, error: "D1 binding missing" },
      { status: 503 }
    );
  }

  try {
    const result = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM models"
    ).first();

    return Response.json({
      ok: true,
      database: "connected",
      totalModels: result?.total ?? 0
    });
  } catch {
    return Response.json(
      { ok: false, error: "Database query failed" },
      { status: 500 }
    );
  }
}
