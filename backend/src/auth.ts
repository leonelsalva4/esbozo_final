import jwt from "jsonwebtoken";
import { pool } from "./db.js";
import type { Request, Response, NextFunction } from "express";

// La sesión permanece en memoria y vence al terminar la jornada.
const TOKEN_TTL = "12h";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET debe tener al menos 32 caracteres aleatorios en backend/.env");
  }
  return secret;
}

getSecret();

export interface SessionPayload {
  sub: number; // app_user.id
  username: string;
  displayName: string;
  role: string;
  sessionVersion?: number;
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): SessionPayload {
  return jwt.verify(token, getSecret()) as unknown as SessionPayload;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  let payload: SessionPayload;
  try { payload = verifyToken(token); }
  catch { res.status(401).json({ error: "Sesión inválida o expirada", code: "SESSION_EXPIRED" }); return; }
  try {
    const user = (await pool.query("SELECT username,display_name,role,is_active,session_version,deleted_at FROM app_user WHERE id=$1",[payload.sub])).rows[0];
    if (!user || user.deleted_at || !user.is_active) { res.status(403).json({ error: "La cuenta no está activa. La gestiona el administrador del sistema.", code: "ACCOUNT_INACTIVE" }); return; }
    if ((payload.sessionVersion ?? 0) !== user.session_version) { res.status(401).json({ error: "La sesión dejó de ser válida. Volvé a ingresar.", code: "SESSION_REVOKED" }); return; }
    req.user = { ...payload, username: user.username, displayName: user.display_name, role: user.role };
    next();
  } catch { res.status(503).json({ error: "No se pudo comprobar la sesión. Intentá nuevamente." }); }
}
