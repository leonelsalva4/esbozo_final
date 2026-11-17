import pg from "pg";
import { logTechnicalError } from "./technical-log.js";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Falta DATABASE_URL. Copiá backend/.env.example a backend/.env y completalo (ver SETUP.md)."
  );
}

export const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000 });
pool.on("error", error => logTechnicalError("database.idle-connection", error));

// Una desconexión puede emitir error mientras el cliente está reservado por una transacción.
pool.on("connect", client => {
  client.on("error", error => logTechnicalError("database.connection", error));
});
