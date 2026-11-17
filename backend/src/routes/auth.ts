import {asyncHandler} from "../http.js";
import { Router } from "express";
import argon2 from "argon2";
import { pool } from "../db.js";
import { signToken, requireAuth } from "../auth.js";

export const authRouter = Router();

async function logAudit(
  userId: number | null,
  action: "session.login" | "session.login_failed" | "session.logout",
  entityId: string
) {
  await pool.query(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id)
     VALUES ($1, $2, 'app_user', $3)`,
    [userId, action, entityId]
  );
}

authRouter.post("/login", asyncHandler(async (req, res) => {
  const { username, password } = req.body ?? {};

  if (typeof username !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Usuario y contraseña son obligatorios" });
    return;
  }

  const { rows } = await pool.query(
    `SELECT id, username, password_hash, display_name, role, is_active, session_version
     FROM app_user WHERE username = $1 AND deleted_at IS NULL`,
    [username]
  );
  const user = rows[0];

  // Mismo mensaje genérico si el usuario no existe o la contraseña no
  // coincide: no hay que darle a un atacante pistas sobre cuál de las dos
  // falló. La cuenta desactivada sí se distingue: es un estado legítimo
  // que la propia pantalla de login remite a "lo gestiona el administrador".
  if (!user) {
    await logAudit(null, "session.login_failed", username);
    res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    return;
  }

  if (!user.is_active) {
    await logAudit(user.id, "session.login_failed", username);
    res.status(403).json({ error: "Esta cuenta no está activa. La gestiona el administrador del sistema." });
    return;
  }

  const validPassword = await argon2.verify(user.password_hash, password);
  if (!validPassword) {
    await logAudit(user.id, "session.login_failed", username);
    res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    return;
  }

  await pool.query(`UPDATE app_user SET last_login_at = now() WHERE id = $1`, [user.id]);
  await logAudit(user.id, "session.login", String(user.id));

  const token = signToken({
    sub: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    sessionVersion: user.session_version,
  });

  res.json({
    token,
    user: {
      username: user.username,
      displayName: user.display_name,
      role: user.role,
    },
  });
}));

authRouter.post("/logout", requireAuth, asyncHandler(async (req, res) => {
  await logAudit(req.user!.sub, "session.logout", String(req.user!.sub));
  res.status(204).end();
}));

authRouter.get("/me", requireAuth, (req, res) => {
  const { username, displayName, role } = req.user!;
  res.json({ username, displayName, role });
});
