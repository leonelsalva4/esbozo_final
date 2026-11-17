// Servidor de comprobación visual. Sólo escribe en un esquema test_reviews_visual_* descartable.
// Las imágenes y conformidades de esta fixture NO representan un registro de producción.
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import pg from "pg";
import dotenv from "dotenv";
import png from "pngjs";
import { readReview } from "../dist/services/stage-review.js";
const config = dotenv.parse(
  readFileSync(new URL("../../data/testing/p00/backend.env", import.meta.url)),
);
if (!new URL(config.DATABASE_URL).pathname.startsWith("/esbozo_test_"))
  throw new Error("Sólo se admite una copia esbozo_test_*");
const schema = `test_reviews_visual_${process.pid}`,
  source = new pg.Pool({ connectionString: config.DATABASE_URL });
const url = new URL(config.DATABASE_URL);
url.searchParams.set("options", `-c search_path=${schema}`);
const db = new pg.Pool({ connectionString: url.href });
let server;
let finish;
const ended = new Promise((resolve) => {
  finish = resolve;
});
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => finish());
try {
  await source.query(`CREATE SCHEMA ${schema}`);
  for (const { tablename } of (
    await source.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('schema_migration','production_stage','stage_review')",
    )
  ).rows)
    await source.query(
      `CREATE TABLE ${schema}."${tablename}" AS TABLE public."${tablename}"`,
    );
  for (const table of ["app_user", "asset", "projection"])
    await db.query(`ALTER TABLE ${table} ADD PRIMARY KEY(id)`);
  await db.query("ALTER TABLE lote_candidate ADD PRIMARY KEY(lote_id)");
  await db.query("CREATE SEQUENCE audit_id START 1000000");
  await db.query(
    "ALTER TABLE audit_log ALTER COLUMN id SET DEFAULT nextval('audit_id')",
  );
  await db.query(
    readFileSync(
      new URL("../db/migrations/001_stage_review.sql", import.meta.url),
      "utf8",
    ),
  );
  const user = (
    await db.query(
      "UPDATE app_user SET display_name='Usuario institucional · prueba visual' RETURNING id",
    )
  ).rows[0].id;
  await db.query(
    "INSERT INTO asset SELECT (jsonb_populate_record(NULL::asset,to_jsonb(a)||jsonb_build_object('id','fixture-missing-stage'))).* FROM asset a WHERE id=(SELECT asset_id FROM projection WHERE position=3 LIMIT 1)",
  );
  for (const [position, seed] of [
    [1, 2718],
    [2, 1890],
    [3, 1977],
    [4, 314],
  ]) {
    const id = `PRJ-1582-L01-A0${position}`;
    {
      const files = {
        2718: "E07_Detalle_Alternativa_1_2718_es_la_candidata_v02.png",
        1890: "M01_Detalle_Alternativa_2_1890_faltan_conformidades_v01.png",
        314: "M02_Detalle_Alternativa_4_314_otra_alternativa_es_candidata_v01.png",
        1977: "N14_Trazabilidad_ficha_no_disponible_A03_v01.png",
      };
      const original = png.PNG.sync.read(
        readFileSync(
          new URL(
            `../../data/references/mockups-v1/${files[seed]}`,
            import.meta.url,
          ),
        ),
      );
      const [x, y, width, height] =
        seed === 1977 ? [164, 356, 609, 444] : [116, 214, 704, 514];
      const image = new png.PNG({ width, height });
      png.PNG.bitblt(original, image, x, y, width, height, 0, 0);
      const bytes = png.PNG.sync.write(image),
        asset = `fixture-visual-${seed}`;
      await db.query(
        "INSERT INTO asset(id,kind,filename,mime_type,width,height,byte_size,sha256) VALUES($1,'projection',$1,'image/png',$4,$5,$2,$3)",
        [
          asset,
          bytes.length,
          createHash("sha256").update(bytes).digest("hex"),
          image.width,
          image.height,
        ],
      );
      await db.query("INSERT INTO asset_blob(asset_id,data) VALUES($1,$2)", [
        asset,
        bytes,
      ]);
      await db.query("UPDATE projection SET asset_id=$2,seed=$3 WHERE id=$1", [
        id,
        asset,
        seed,
      ]);
    }
    for (const key of ["base", "figures", "finish"])
      await db.query(
        `INSERT INTO production_stage(projection_id,stage_key,applicability,asset_id,description,provenance) SELECT id,$2,$3,CASE WHEN $3<>'applicable' THEN NULL WHEN position=3 THEN 'fixture-missing-stage' ELSE asset_id END,'Fixture visual de prueba. No documenta un proceso pictórico real.','Esquema descartable de comprobación visual' FROM projection WHERE id=$1`,
        [
          id,
          key,
          key === "finish" && position === 1 ? "not_applicable" : "applicable",
        ],
      );
    const client = await db.connect();
    try {
      for (const key of position === 1 || position === 4
        ? ["base", "figures", ...(position === 4 ? ["finish"] : [])]
        : position === 2
          ? ["base"]
          : []) {
        const stage = (
          await readReview(client, "LOT-1582-L01", id)
        ).stages.find((stage) => stage.key === key);
        await client.query(
          "INSERT INTO stage_review(projection_id,stage_key,user_id,asset_sha256,stage_fingerprint) VALUES($1,$2,$3,$4,$5)",
          [id, key, user, stage.resource.sha256, stage.fingerprint],
        );
      }
    } finally {
      client.release();
    }
  }
  await db.query(
    "UPDATE lote_candidate SET projection_id='PRJ-1582-L01-A01' WHERE lote_id='LOT-1582-L01'",
  );
  if (process.argv.includes("--missing-dossier"))
    await db.query("ALTER TABLE projection DROP COLUMN cfg_scale");
  server = spawn(process.execPath, ["dist/server.js"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      DATABASE_URL: url.href,
      JWT_SECRET: config.JWT_SECRET,
      PORT: "4000",
    },
    stdio: ["ignore", "inherit", "inherit"],
  });
  server.once("exit", () => finish());
  console.log(
    `Fixture visual aislada: ${schema}. Finalizá con Ctrl+C para eliminarla.`,
  );
  await ended;
} finally {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
  }
  await db.end();
  await source.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await source.end();
  console.log("Esquema visual descartado.");
}
