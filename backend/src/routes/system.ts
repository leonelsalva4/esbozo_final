import { readFileSync } from "node:fs";
import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../auth.js";
export const systemRouter = Router();
function applicationVersion(): string | null {
  if (process.env.ESBOZO_APP_VERSION) return process.env.ESBOZO_APP_VERSION;
  try { return JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")).version ?? null; }
  catch { return null; }
}
systemRouter.get("/about", requireAuth, async (_req, res) => {
  try {
    const rows = (await pool.query("SELECT key,value FROM system_metadata WHERE key IN ('schema_version','dossier_schema_version')")).rows;
    const values = Object.fromEntries(rows.map(row => [row.key, row.value]));
    res.set("Cache-Control", "no-store").json({ applicationVersion: applicationVersion(), schemaVersion: values.schema_version ?? null, dossierSchemaVersion: values.dossier_schema_version ?? null });
  } catch { res.status(503).json({ error: "No se pudieron consultar las versiones del sistema." }); }
});
