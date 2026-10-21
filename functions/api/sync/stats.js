export async function onRequestGet({ env }) {
  if (!env.DB) {
    return Response.json(
      { ok: false, error: "D1 unavailable" },
      { status: 503 }
    );
  }

  try {
    const models = await env.DB.prepare(`
      SELECT
        COUNT(*) AS totalModels,
        SUM(CASE WHEN name IS NULL OR TRIM(name) = '' THEN 1 ELSE 0 END) AS missingNames,
        SUM(CASE WHEN creator IS NULL OR TRIM(creator) = '' THEN 1 ELSE 0 END) AS missingCreators,
        SUM(CASE WHEN description IS NULL OR TRIM(description) = '' THEN 1 ELSE 0 END) AS missingDescriptions,
        SUM(CASE WHEN raw_json IS NULL OR raw_json = '' THEN 1 ELSE 0 END) AS missingRawData
      FROM models
    `).first();

    const versions = await env.DB.prepare(`
      SELECT COUNT(*) AS totalVersions,
             COUNT(DISTINCT model_id) AS modelsWithVersions
      FROM model_versions
    `).first();

    const totalModels = models?.totalModels || 0;
    const modelsWithVersions = versions?.modelsWithVersions || 0;

    return Response.json({
      ok: true,
      source: "VELTRIA D1",
      totalModels,
      totalVersions: versions?.totalVersions || 0,
      modelsWithVersions,
      modelsWithoutVersions: Math.max(
        0,
        totalModels - modelsWithVersions
      ),
      missingNames: models?.missingNames || 0,
      missingCreators: models?.missingCreators || 0,
      missingDescriptions: models?.missingDescriptions || 0,
      missingRawData: models?.missingRawData || 0
    }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("Model stats error:", error);
    return Response.json(
      { ok: false, error: "Statistics query failed" },
      { status: 500 }
    );
  }
}
