import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../auth.js";
export const operationsRouter = Router();
function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
operationsRouter.get("/filters", requireAuth, async (_req, res) => {
  try { res.set("Cache-Control", "no-store").json({ lots: (await pool.query("SELECT id,sketch_id FROM lote ORDER BY sketch_id,sequence")).rows }); }
  catch { res.status(503).json({ error: "No se pudieron consultar los filtros." }); }
});
operationsRouter.get("/", requireAuth, async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1), offset = (page - 1) * 20;
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(offset)) { res.status(400).json({ error: "Página inválida." }); return; }
    const admin = req.user!.role === "admin", values: unknown[] = [], where: string[] = [];
    const add = (sql: string, value: unknown) => { values.push(value); where.push(sql.replace("?", `$${values.length}`)); };
    if (!admin) { add("(a.entity_type='lote' OR (a.user_id=? AND a.action LIKE 'session.%'))", req.user!.sub); where.push("a.action NOT LIKE 'account.%'"); }
    if (req.query.action) {
      if (typeof req.query.action !== "string" || req.query.action.length > 80) { res.status(400).json({ error: "Acción inválida." }); return; }
      add("a.action=?", req.query.action);
    }
    for (const [key, sql] of [
      ["from", "a.occurred_at >= (?::date::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')"],
      ["to", "a.occurred_at < ((?::date + 1)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')"],
    ]) if (req.query[key]) {
      if (!validDate(req.query[key])) { res.status(400).json({ error: "Fecha inválida." }); return; }
      add(sql, req.query[key]);
    }
    if (req.query.from && req.query.to && String(req.query.from) > String(req.query.to)) { res.status(400).json({ error: "El inicio del período debe ser anterior al final." }); return; }
    for (const [key, column] of [["lot", "l.id"], ["inventory", "l.sketch_id"], ["projection", "p.id"]]) if (req.query[key]) {
      if (typeof req.query[key] !== "string") { res.status(400).json({ error: "Filtro inválido." }); return; }
      add(`${column}=?`, req.query[key]);
    }
    const filter = where.length ? "WHERE " + where.join(" AND ") : "";
    const joins = `FROM audit_log a
      LEFT JOIN app_user u ON u.id=a.user_id
      LEFT JOIN app_user affected ON a.entity_type='app_user' AND affected.id::text=a.entity_id
      LEFT JOIN lote l ON a.entity_type='lote' AND l.id=a.entity_id
      LEFT JOIN projection p ON p.id=a.payload->>'projection_id' AND p.lote_id=l.id`;
    const total = Number((await pool.query(`SELECT count(*) ${joins} ${filter}`, values)).rows[0].count);
    const rows = (await pool.query(`SELECT a.id,a.occurred_at,a.action,a.entity_type,
      CASE WHEN a.action='session.login_failed' THEN 'Sesión no iniciada' ELSE a.entity_id END AS entity_id,
      CASE WHEN a.action='session.login_failed' THEN 'Sesión no iniciada'
        WHEN affected.deleted_at IS NOT NULL THEN 'Cuenta eliminada'
        WHEN affected.id IS NOT NULL THEN affected.username::text
        WHEN p.id IS NOT NULL THEN 'Alternativa ' || p.position || ' · ' || COALESCE(p.branch_label,p.seed::text,'No documentado')
        ELSE a.entity_id END AS resource_label,
      CASE WHEN a.action='session.login_failed' THEN NULL ELSE a.payload END AS payload,
      CASE WHEN a.action='session.login_failed' THEN 'Sin cuenta autenticada'
        ELSE COALESCE(u.display_name,'Cuenta no disponible') END AS display_name,
      CASE WHEN a.action<>'session.login_failed' AND u.deleted_at IS NULL THEN u.username ELSE NULL END AS username,
      l.sketch_id,l.id AS lot_id,p.id AS projection_id,p.position AS projection_position,p.branch_label AS projection_branch ${joins} ${filter} ORDER BY a.occurred_at DESC,a.id DESC LIMIT 20 OFFSET $${values.length + 1}`,
      [...values, offset])).rows;
    res.set("Cache-Control", "no-store").json({ rows, total, page, pages: Math.max(1, Math.ceil(total / 20)) });
  } catch { res.status(503).json({ error: "No se pudo consultar el registro de operaciones." }); }
});
