import {logTechnicalError} from "../technical-log.js";
import {asyncHandler} from "../http.js";
import { Router } from "express";
import type { PoolClient } from "pg";
import { pool } from "../db.js";
import { requireAuth } from "../auth.js";
import { verifyLot } from "../services/lot-verification.js";

export const sketchesRouter = Router();

sketchesRouter.get("/", requireAuth, asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, title, series, author, date_documented, technique,
            dimensions_cm, provenance, asset_id,
            (SELECT count(*)::integer FROM lote WHERE sketch_id = sketch.id) AS lot_count
     FROM sketch
     ORDER BY id`
  );
  res.json(rows);
}));

// Próximo lote aún no obtenido del boceto.
sketchesRouter.get("/:id/lote", requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT l.id, l.sequence, l.generated_at
     FROM lote l
     WHERE l.sketch_id = $1
       AND NOT EXISTS (SELECT 1 FROM lote_obtencion o WHERE o.lote_id=l.id)
     ORDER BY l.sequence ASC
     LIMIT 1`,
    [req.params.id]
  );

  if (rows.length === 0) {
    res.json({ available: false });
    return;
  }

  res.json({ available: true, lote: rows[0] });
}));

// El lote YA obtenido más reciente de este boceto (si hay alguno) — a
// diferencia de /lote (que busca el próximo NO obtenido), esto es lo que
// habilita navegar directo a "Obtención lote" o "Alternativas" sin pasar
// de nuevo por el botón, incluso en una sesión nueva: la disponibilidad
// depende de lo que hay en la base, no de qué pantallas se visitaron.
// verification sale tal cual quedó guardado — no se vuelve a verificar.
sketchesRouter.get("/:id/lote-obtenido", requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT l.id, l.sequence, l.generated_at, o.verification, o.obtained_at,
            CASE WHEN u.deleted_at IS NULL THEN u.username::text ELSE u.display_name END AS obtained_by
     FROM lote l
     JOIN lote_obtencion o ON o.lote_id = l.id
     JOIN app_user u ON u.id = o.user_id
     WHERE l.sketch_id = $1
     ORDER BY o.obtained_at DESC
     LIMIT 1`,
    [req.params.id]
  );

  if (rows.length === 0) {
    res.json({ obtained: false });
    return;
  }

  const row = rows[0];
  res.json({
    obtained: true,
    lote: { id: row.id, sequence: row.sequence, generated_at: row.generated_at },
    steps: row.verification,
    obtainedAt: row.obtained_at,
    obtainedBy: row.obtained_by,
  });
}));

// Historial documental: consultar no vuelve a obtener ni verifica los lotes.
sketchesRouter.get("/:id/lotes", requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT l.id, l.sequence, l.generated_at, o.obtained_at,
            CASE WHEN u.deleted_at IS NULL THEN u.username::text ELSE u.display_name END AS obtained_by,
            cp.position AS candidate_position, cp.seed AS candidate_seed, cp.branch_label AS candidate_branch,
            (SELECT count(*)::integer FROM projection p WHERE p.lote_id = l.id) AS projection_count
     FROM lote l
     LEFT JOIN lote_obtencion o ON o.lote_id = l.id
     LEFT JOIN app_user u ON u.id = o.user_id
     LEFT JOIN lote_candidate lc ON lc.lote_id=l.id
     LEFT JOIN projection cp ON cp.id=lc.projection_id
     WHERE l.sketch_id = $1
     ORDER BY l.sequence DESC, l.id`,
    [req.params.id]
  );
  res.json(rows);
}));

// La fila del boceto serializa obtenciones concurrentes sin reemplazar registros previos.
sketchesRouter.post("/:id/lote/obtain", requireAuth, asyncHandler(async (req, res) => {
  const requestedId = req.body?.loteId;
  if (requestedId !== undefined && typeof requestedId !== "string") { res.status(400).json({ error: "Identificador de lote inválido" }); return; }
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const sketch = await client.query("SELECT id FROM sketch WHERE id=$1 FOR UPDATE", [req.params.id]);
    if (!sketch.rowCount) { await client.query("ROLLBACK"); res.status(404).json({ error: "Boceto no encontrado" }); return; }
    if (requestedId) {
      const previous = (await client.query(
        `SELECT l.id,l.sequence,l.generated_at,o.obtained_at,CASE WHEN u.deleted_at IS NULL THEN u.username::text ELSE u.display_name END AS username FROM lote l
         JOIN lote_obtencion o ON o.lote_id=l.id JOIN app_user u ON u.id=o.user_id
         WHERE l.id=$1 AND l.sketch_id=$2`, [requestedId, req.params.id])).rows[0];
      if (previous) {
        const verification = await verifyLot(client, previous.id, req.params.id);
        await client.query("COMMIT");
        res.status(verification.ok ? 200 : 422).json({ lote: { id:previous.id,sequence:previous.sequence,generated_at:previous.generated_at }, ...verification, obtainedAt:previous.obtained_at, obtainedBy:previous.username, reused:true });
        return;
      }
    }
    const lote = (await client.query(
      `SELECT l.id, l.sequence, l.generated_at FROM lote l WHERE l.sketch_id=$1 AND ($2::text IS NULL OR l.id=$2)
       AND NOT EXISTS (SELECT 1 FROM lote_obtencion o WHERE o.lote_id=l.id)
       ORDER BY l.sequence, l.id LIMIT 1 FOR UPDATE`, [req.params.id, requestedId ?? null])).rows[0];
    if (!lote) {
      const conservedLot = (await client.query(`SELECT l.id,l.sketch_id,(SELECT count(*)::integer FROM projection p WHERE p.lote_id=l.id) AS projection_count FROM lote l JOIN lote_obtencion o ON o.lote_id=l.id WHERE l.sketch_id=$1 ORDER BY o.obtained_at DESC,l.sequence DESC LIMIT 1`,[req.params.id])).rows[0] ?? null;
      await client.query("ROLLBACK"); res.status(409).json({ error: "No hay más lotes disponibles", failure: "exhausted", conservedLot }); return;
    }
    const verification = await verifyLot(client, lote.id, req.params.id);
    if (!verification.ok) { await client.query("ROLLBACK"); res.status(422).json({ error: verification.failure === "integrity" ? "La verificación de integridad falló" : "El lote está incompleto", lote, ...verification }); return; }
    const saved = (await client.query(
      "INSERT INTO lote_obtencion (lote_id,user_id,verification,obtained_at) VALUES ($1,$2,$3,now()) RETURNING obtained_at",
      [lote.id, req.user!.sub, JSON.stringify(verification.steps)])).rows[0];
    await client.query("INSERT INTO audit_log (user_id,action,entity_type,entity_id) VALUES ($1,'lote.obtain','lote',$2)", [req.user!.sub, lote.id]);
    await client.query("COMMIT");
    res.json({ lote, ...verification, obtainedAt: saved.obtained_at, obtainedBy: req.user!.username });
  } catch (error) {
    logTechnicalError("lot.obtain", error);
    if (client) await client.query("ROLLBACK").catch(() => undefined);
    res.status(500).json({ error: "No se pudo completar la operación. El estado anterior se conserva.", failure: "operation" });
  } finally { client?.release(); }
}));
