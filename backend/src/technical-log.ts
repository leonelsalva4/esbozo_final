import { appendFileSync, mkdirSync, renameSync, statSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export function logTechnicalError(operation: string, error: unknown): void {
  const code = (error as { code?: unknown })?.code;
  const errorCode = typeof code === "string" && /^[A-Z0-9_]{3,40}$/.test(code) ? code : "UNEXPECTED_ERROR";
  const entry = JSON.stringify({ at: new Date().toISOString(), operation, code: errorCode });
  // No se guardan mensajes SQL, datos de usuarios, cuerpos de peticiones ni credenciales.
  const base = process.platform === "darwin" ? path.join(homedir(), "Library", "Application Support")
    : process.platform === "win32" ? process.env.APPDATA ?? path.join(homedir(), "AppData", "Roaming")
    : process.env.XDG_STATE_HOME ?? path.join(homedir(), ".local", "state");
  const file = process.env.ESBOZO_LOG_FILE ?? path.join(base, "Esbozo", "logs", "backend.log");
  try {
    mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    if (existsSync(file) && statSync(file).size > 2 * 1024 * 1024) renameSync(file, file + ".1");
    appendFileSync(file, entry + "\n", { mode: 0o600 });
  } catch {
    console.error(entry);
  }
}
