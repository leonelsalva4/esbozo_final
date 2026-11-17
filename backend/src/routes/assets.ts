import {logTechnicalError} from "../technical-log.js";
import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../auth.js";
import { inspectImage } from "../services/stage-review.js";

export const assetsRouter = Router();

assetsRouter.get("/:id/content", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.mime_type, a.sha256, a.byte_size, a.width, a.height, b.data
       FROM asset a JOIN asset_blob b ON b.asset_id = a.id WHERE a.id = $1`,
      [req.params.id]
    );
    const row = rows[0];
    res.set("Cache-Control", "no-store");
    if (!row) {
      res.status(404).json({ error: "Imagen no disponible", resourceId: req.params.id });
      return;
    }
    if (!inspectImage(row).ok) {
      res.status(422).json({ error: "No se pudo verificar la integridad de la imagen", resourceId: req.params.id });
      return;
    }
    res.set({ "Content-Type": row.mime_type, ETag: row.sha256 });
    res.send(row.data);
  } catch (error) {
    logTechnicalError("asset.read", error);
    res.status(503).json({ error: "No se pudo recuperar la imagen", resourceId: req.params.id });
  }
});
