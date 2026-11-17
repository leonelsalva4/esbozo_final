import { createHash } from "node:crypto";
import { Router } from "express";
import type { PoolClient } from "pg";
import { pool } from "../db.js";
import { requireAuth } from "../auth.js";
import { readReview, ReviewError } from "../services/stage-review.js";
export const provenanceRouter = Router();
provenanceRouter.get("/:loteId/projections/:projectionId/dossier", requireAuth, async (req, res) => {
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const info = (await client.query(`
      SELECT p.id,p.position,p.branch_label,p.seed,p.width,p.height,p.asset_id,
        p.production_notes,p.date_documented,l.id AS lot_id,l.source_identifier,
        l.date_documented AS lot_date,l.sketch_id,l.package_id,g.base_model_name,
        g.base_model_revision,g.library_versions,g.inference_config,
        v.label AS adapter,v.file_sha256 AS adapter_sha256,v.training_params,
        a.sha256,a.mime_type,sp.manifest_sha256,sp.export_date
      FROM projection p JOIN lote l ON l.id=p.lote_id
      JOIN generation_run g ON g.id=l.run_id
      JOIN lora_version v ON v.id=l.lora_version_id
      JOIN asset a ON a.id=p.asset_id JOIN source_package sp ON sp.id=l.package_id
      WHERE p.lote_id=$1 AND p.id=$2`, [req.params.loteId, req.params.projectionId])).rows[0];
    if (!info) throw new ReviewError(404, "Ficha no disponible");
    const review = await readReview(client, req.params.loteId, req.params.projectionId);
    const external = (await client.query("SELECT person,date_documented,modality,evidence_sha256 FROM external_selection WHERE projection_id=$1", [info.id])).rows[0] ?? null;
    const records = (await client.query(`
      SELECT DISTINCT r.sha256,r.mime_type,r.byte_size,o.original_path,pl.field_path
      FROM provenance_link pl JOIN provenance_resource r ON r.sha256=pl.source_sha256
      LEFT JOIN LATERAL(SELECT original_path FROM provenance_origin
        WHERE resource_sha256=r.sha256 ORDER BY length(original_path),original_path LIMIT 1)o ON true
      WHERE pl.target_sha256=ANY($1::text[]) ORDER BY r.sha256,pl.field_path`,
      [[info.sha256, ...review.stages.map(s => (s.resource as {sha256?: string} | null)?.sha256).filter(Boolean)]])).rows;
    const operations=(await client.query(`SELECT id,stage_key,source_sha256,adoption,parameters->>'key' AS call_label,parameters->>'seed' AS seed,parameters->>'utc' AS date_documented,parameters->'parameters'->>'pipeline' AS pipeline FROM production_operation WHERE projection_id=$1 ORDER BY id`,[info.id])).rows;
    const inputs=(await client.query(`SELECT i.operation_id,i.field_path,i.role_documented,i.sha256,r.asset_id,r.mime_type,
      COALESCE(identity.records,'[]'::jsonb) AS identities FROM operation_resource i
      JOIN production_operation o ON o.id=i.operation_id LEFT JOIN provenance_resource r ON r.sha256=i.resource_sha256
      LEFT JOIN LATERAL(SELECT jsonb_agg(jsonb_build_object('title',m.title_documented,'inventory',m.inventory_documented,'sourceSha256',m.source_sha256,'field',m.field_path) ORDER BY m.source_sha256,m.field_path) AS records FROM reference_identity m WHERE m.resource_sha256=i.sha256)identity ON true
      WHERE o.projection_id=$1 ORDER BY i.operation_id,i.field_path,i.sha256`,[info.id])).rows;
    await client.query("COMMIT");
    res.set("Cache-Control", "no-store").json({ info, review, externalSelection: external, records, operations, inputs });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => undefined);
    res.status(error instanceof ReviewError ? error.status : 503).json({ error: error instanceof ReviewError ? error.message : "No se pudo recuperar la ficha de procedencia" });
  } finally { client?.release(); }
});
provenanceRouter.get("/resources/:sha256", requireAuth, async (req, res) => {
  try {
    if (!/^[a-f0-9]{64}$/.test(req.params.sha256)) {
      res.status(400).json({ error: "Identificador inválido" }); return;
    }
    const row = (await pool.query("SELECT mime_type,content,asset_id FROM provenance_resource WHERE sha256=$1", [req.params.sha256])).rows[0];
    if (!row) { res.status(404).json({ error: "Recurso no incorporado al conjunto activo" }); return; }
    res.set("Cache-Control", "no-store");
    if (row.asset_id) { res.json({ assetId: row.asset_id }); return; }
    if (!Buffer.isBuffer(row.content) || createHash("sha256").update(row.content).digest("hex") !== req.params.sha256)
      throw new Error("Integridad del registro inválida");
    res.set("Content-Type", row.mime_type).set("X-Content-Type-Options", "nosniff").send(row.content);
  } catch { res.status(503).json({ error: "No se pudo recuperar el registro" }); }
});
