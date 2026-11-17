import pg from "pg";
import dotenv from "dotenv";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
const test = process.argv.includes("--test");
const through = process.argv.find(arg => arg.startsWith("--through="))?.slice(10);
if (through && !/^\d{3}$/.test(through)) throw new Error("--through debe ser un número de tres dígitos");
if (test)
  Object.assign(
    process.env,
    dotenv.parse(
      readFileSync(
        new URL("../../data/testing/p00/backend.env", import.meta.url),
      ),
    ),
  );
else dotenv.config();
if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
const database = decodeURIComponent(
  new URL(process.env.DATABASE_URL).pathname.slice(1),
);
if (test && !database.startsWith("esbozo_test_"))
  throw new Error("La migración de prueba exige una copia esbozo_test_*");
if (!test && !process.argv.includes("--apply"))
  throw new Error(
    "Usá --test para la copia; --apply para una instalación respaldada.",
  );
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(723184601)");
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migration(name TEXT PRIMARY KEY,sha256 TEXT NOT NULL,applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
  );
  const dir = new URL("../db/migrations/", import.meta.url);
  for (const name of readdirSync(dir)
    .filter((name) => name.endsWith(".sql") && (!through || name.slice(0,3) <= through))
    .sort()) {
    const sql = readFileSync(new URL(name, dir), "utf8");
    const hash = createHash("sha256").update(sql).digest("hex");
    const saved = (
      await client.query("SELECT sha256 FROM schema_migration WHERE name=$1", [
        name,
      ])
    ).rows[0];
    if (saved) {
      if (saved.sha256 !== hash)
        throw new Error(`Cambió una migración ya aplicada: ${name}`);
      continue;
    }
    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migration(name,sha256) VALUES($1,$2)",
      [name, hash],
    );
    console.log(`Aplicada: ${name}`);
  }
  await client.query("COMMIT");
  console.log(`Migraciones verificadas en ${database}`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
