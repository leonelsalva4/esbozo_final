import {asyncHandler} from "../http.js";
import { Router } from "express";
import type { PoolClient } from "pg";
import { pool } from "../db.js";
import { requireAuth } from "../auth.js";
import { verifyLot } from "../services/lot-verification.js";

export const lotesRouter = Router();

// Reabrir consulta los recursos actuales; no modifica la fecha ni la verificación histórica guardada.
lotesRouter.get("/:loteId/open", requireAuth, asyncHandler(async (req, res) => {
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const row = (await client.query(
      `SELECT l.id,l.sequence,l.generated_at,l.sketch_id,o.obtained_at,CASE WHEN u.deleted_at IS NULL THEN u.username::text ELSE u.display_name END AS obtained_by
       FROM lote l JOIN lote_obtencion o ON o.lote_id=l.id JOIN app_user u ON u.id=o.user_id WHERE l.id=$1`, [req.params.loteId])).rows[0];
    if (!row) { await client.query("ROLLBACK"); res.status(404).json({ error: "El lote no fue obtenido o no está registrado" }); return; }
    const verification = await verifyLot(client, row.id, row.sketch_id);
    await client.query("COMMIT");
    res.status(verification.ok ? 200 : 422).json({ lote: { id: row.id, sequence: row.sequence, generated_at: row.generated_at }, sketchId: row.sketch_id, obtainedAt: row.obtained_at, obtainedBy: row.obtained_by, ...verification });
  } catch {
    if (client) await client.query("ROLLBACK").catch(() => undefined);
    res.status(500).json({ error: "No se pudo reabrir el lote. El lote activo se conserva." });
  } finally { client?.release(); }
}));

// Metadatos del conjunto precomputado; las operaciones conservan sus registros individuales.
lotesRouter.get("/:loteId/generation-run", requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT gr.id, gr.run_at, gr.gpu, gr.base_model_name, gr.base_model_sha256,
            gr.base_model_revision, gr.inference_config,
            gr.library_versions, gr.notes
     FROM generation_run gr
     JOIN lote l ON l.run_id = gr.id
     WHERE l.id = $1`,
    [req.params.loteId]
  );

  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: "Corrida de generación no encontrada para este lote" });
    return;
  }

  res.json(row);
}));

// El detalle técnico completo de UNA proyección (para "Trazabilidad" —
// las listas de /projections no necesitan estos campos, así que no se
// les agregan ahí).
lotesRouter.get("/:loteId/projections/:projectionId", requireAuth, asyncHandler(async (req, res) => {
  try {
  const { rows } = await pool.query(
    `SELECT p.id, p.position, p.generated_at, p.seed, p.steps, p.cfg_scale,
            p.scheduler, p.width, p.height, p.branch_label, p.lora_weight,
            p.lora_checkpoint_epoch, p.prompt, p.negative_prompt, p.not_applicable,
            p.asset_id, a.mime_type,
            COALESCE(lc.projection_id = p.id, false) AS is_candidate,
            CASE WHEN lc.projection_id = p.id THEN u.display_name END AS candidate_display_name,
            CASE WHEN lc.projection_id = p.id THEN lc.set_at END AS candidate_set_at
     FROM projection p
     JOIN asset a ON a.id = p.asset_id
     LEFT JOIN lote_candidate lc ON lc.lote_id = p.lote_id
     LEFT JOIN app_user u ON u.id = lc.user_id
     WHERE p.lote_id = $1 AND p.id = $2`,
    [req.params.loteId, req.params.projectionId]
  );

  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: "Proyección no encontrada en este lote" });
    return;
  }

  res.set("Cache-Control","no-store").json(row);
  } catch { res.status(503).json({error:"No se pudo recuperar la ficha de trazabilidad"}); }
}));

// Operaciones del lote: obtención, candidatura y conformidades.
// Cada registro conserva responsable y fecha, incluido el retiro en cascada.
lotesRouter.get("/:loteId/audit-log", requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.action, a.occurred_at, u.display_name
     FROM audit_log a
     JOIN app_user u ON u.id = a.user_id
     WHERE a.entity_type = 'lote' AND a.entity_id = $1
     ORDER BY a.occurred_at DESC`,
    [req.params.loteId]
  );
  res.json(rows);
}));

// Trae, junto con cada proyección, quién marcó la candidata y cuándo —
// ese dato sólo aplica a la fila candidata (CASE lo apaga en las demás).
lotesRouter.get("/:loteId/projections", requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.position, p.branch_label, p.seed, p.source_filename, p.generated_at, p.asset_id,
            COALESCE(lc.projection_id = p.id, false) AS is_candidate,
            CASE WHEN lc.projection_id = p.id AND u.deleted_at IS NULL THEN u.username END AS candidate_username,
            CASE WHEN lc.projection_id = p.id THEN u.display_name END AS candidate_display_name,
            CASE WHEN lc.projection_id = p.id THEN lc.set_at END AS candidate_set_at
     FROM projection p
     JOIN lote l ON l.id=p.lote_id AND l.sketch_id=p.sketch_id
     LEFT JOIN lote_candidate lc ON lc.lote_id = p.lote_id
     LEFT JOIN app_user u ON u.id = lc.user_id
     WHERE p.lote_id = $1
     ORDER BY p.position`,
    [req.params.loteId]
  );
  res.json(rows);
}));
