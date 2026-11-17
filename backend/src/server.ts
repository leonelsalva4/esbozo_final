import {requestError} from "./http.js";
import express from "express";
import { systemRouter } from "./routes/system.js";
import { operationsRouter } from "./routes/operations.js";
import { accountsRouter } from "./routes/accounts.js";
import cors from "cors";
import { pool } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { sketchesRouter } from "./routes/sketches.js";
import { assetsRouter } from "./routes/assets.js";
import { lotesRouter } from "./routes/lotes.js";

import { reviewsRouter } from "./routes/reviews.js";

import {provenanceRouter} from "./routes/provenance.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/system", systemRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/operations", operationsRouter);
app.use("/api/sketches", sketchesRouter);
app.use("/api/assets", assetsRouter);
app.use("/api/lotes", provenanceRouter);
app.use("/api/lotes", reviewsRouter);
app.use("/api/lotes", lotesRouter);

// No es un ping: corre una consulta real contra el esquema, así que si la
// base está caída, el rol no existe, o el schema.sql no se cargó, el
// motivo aparece acá en vez de en una pantalla en blanco.
app.get("/api/health", async (_req, res) => {
  try {
    const version = await pool.query("SELECT version()");
    const tablas = await pool.query(
      "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'"
    );
    const usuarios = await pool.query("SELECT count(*)::int AS n FROM app_user");
    const schemaVersion = await pool.query(
      "SELECT value FROM system_metadata WHERE key = 'schema_version'"
    );

    const migrationTable = (await pool.query("SELECT to_regclass('schema_migration') AS name")).rows[0]?.name;
    const ready = !!migrationTable && (await pool.query("SELECT name FROM schema_migration WHERE name='007_reference_identity.sql'")).rowCount === 1;
    res.set("Cache-Control", "no-store").json({
      ok: true,
      ready,
      instanceId: process.env.ESBOZO_INSTANCE_ID ?? null,
      postgres_version: version.rows[0].version as string,
      tablas: tablas.rows[0].n as number,
      usuarios: usuarios.rows[0].n as number,
      schema_version: schemaVersion.rows[0]?.value ?? "sin registrar",
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    });
  }
});

app.use(requestError);

const port = Number(process.env.PORT) || 4000;
const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});

server.on("error", (error: NodeJS.ErrnoException) => { console.error(`No se pudo iniciar el servidor local: ${error.code ?? 'error'}`); process.exitCode = 1; pool.end(); });
async function shutdown() { server.close(async () => { await pool.end(); process.exit(0); }); }
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
