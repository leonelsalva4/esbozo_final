import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createHash } from "node:crypto";
import pg from "pg";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
const config = dotenv.parse(
  readFileSync(new URL("../../data/testing/p00/backend.env", import.meta.url)),
);
assert(new URL(config.DATABASE_URL).pathname.startsWith("/esbozo_test_"));
const schema = `test_reviews_${process.pid}_${Date.now()}`,
  lot = "LOT-1582-L01",
  one = "PRJ-1582-L01-A01",
  two = "PRJ-1582-L01-A02";
const source = new pg.Pool({ connectionString: config.DATABASE_URL }),
  url = new URL(config.DATABASE_URL);
url.searchParams.set("options", `-c search_path=${schema}`);
const db = new pg.Pool({ connectionString: url.href });
let server, origin, token;
const request = async (path, method = "GET", body) => {
  const response = await fetch(origin + "/api/lotes/" + lot + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
};
const read = async (id = one) =>
  (await request(`/projections/${id}/review`)).body;
const act = async (id, key, method = "POST", revision) =>
  request(`/projections/${id}/stages/${key}/review`, method, {
    expectedRevision: revision ?? (await read(id)).revision,
  });
const candidate = async (id = one, method = "PUT", revision) =>
  request("/candidate", method, {
    projectionId: id,
    expectedRevision: revision ?? (await read(id)).revision,
  });
const snapshot = async () =>
  JSON.stringify({
    reviews: (
      await db.query(
        "SELECT * FROM stage_review ORDER BY projection_id,stage_key",
      )
    ).rows,
    candidates: (await db.query("SELECT * FROM lote_candidate")).rows,
    audit: (await db.query("SELECT * FROM audit_log ORDER BY id")).rows,
  });
async function document(id = one, finish = "not_applicable") {
  // Fixture sólo en el esquema descartable. No representa el proceso pictórico de las imágenes copiadas.
  for (const key of ["base", "figures", "finish"])
    await db.query(
      `INSERT INTO production_stage(projection_id,stage_key,applicability,asset_id,description,provenance) SELECT id,$2,$3,CASE WHEN $3='applicable' THEN asset_id ELSE NULL END,'Fixture técnica de prueba','Esquema descartable' FROM projection WHERE id=$1`,
      [id, key, key === "finish" ? finish : "applicable"],
    );
}
async function complete(id = one) {
  assert.equal((await act(id, "base")).status, 200);
  assert.equal((await act(id, "figures")).status, 200);
  if ((await read(id)).stages[2].applicability === "applicable")
    assert.equal((await act(id, "finish")).status, 200);
}
before(async () => {
  await source.query(`CREATE SCHEMA ${schema}`);
  for (const table of [
    "app_user",
    "asset",
    "asset_blob",
    "lote",
    "projection",
    "lote_obtencion",
    "lote_candidate",
    "audit_log",
  ])
    await source.query(
      `CREATE TABLE ${schema}.${table} AS TABLE public.${table}`,
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
  const user = (await db.query("SELECT * FROM app_user ORDER BY id LIMIT 1"))
    .rows[0];
  token = jwt.sign(
    {
      sub: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
    },
    config.JWT_SECRET,
    { expiresIn: "30m" },
  );
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  origin = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ["dist/server.js"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      DATABASE_URL: url.href,
      JWT_SECRET: config.JWT_SECRET,
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("No inició el servidor")),
      10000,
    );
    server.stdout.on("data", (data) => {
      if (String(data).includes("Backend escuchando")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.once("error", reject);
  });
});
beforeEach(async () => {
  await db.query("DELETE FROM stage_review");
  await db.query("DELETE FROM production_stage");
  for (const table of ["lote_candidate", "asset_blob", "asset", "audit_log"]) {
    await db.query(`TRUNCATE ${table}${table === "asset" ? " CASCADE" : ""}`);
    await db.query(`INSERT INTO ${table} SELECT * FROM public.${table}`);
  }
  // Restaurar también identidad y deleted_at: la disociación de una cuenta no debe pasar al caso siguiente.
  await db.query("DELETE FROM app_user");
  await db.query("INSERT INTO app_user SELECT * FROM public.app_user");
  await db.query("DELETE FROM lote_obtencion");
  await db.query("INSERT INTO lote_obtencion(lote_id,user_id,verification,obtained_at) SELECT $1,id,'{}',now() FROM app_user ORDER BY id LIMIT 1",[lot]);
  await db.query("DELETE FROM lote_candidate");
  await db.query("INSERT INTO lote_candidate(lote_id,projection_id,user_id,set_at) SELECT $1,$2,id,now() FROM app_user ORDER BY id LIMIT 1",[lot,two]);
});
after(async () => {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
  }
  await db.end();
  await source.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await source.end();
});
test("migración aditiva deja etapas ausentes como no documentadas y conserva candidata histórica", async () => {
  const saved = await snapshot(),
    review = await read(two);
  assert.equal(review.applicable, null);
  assert.equal(review.documented, false);
  assert(review.stages.every((stage) => stage.status === "No documentado"));
  assert.equal(review.candidate.projection_id, two);
  assert.equal(review.canCandidate, false);
  assert.equal(await snapshot(), saved);
  assert.equal((await candidate(one)).status, 422);
});
test("no se puede saltear el orden ni conformar una etapa no aplicable", async () => {
  await document();
  assert.equal((await act(one, "figures")).status, 422);
  assert.equal((await act(one, "finish")).status, 422);
  await complete();
  const review = await read();
  assert.equal(review.applicable, 2);
  assert.equal(review.conforming, 2);
  assert.equal(review.complete, true);
  assert.equal(review.stages[2].status, "No aplica");
});
test("recurso ausente bloquea etapa y siguientes sin sustituir por imagen final", async () => {
  await document();
  await db.query(
    "INSERT INTO asset SELECT (jsonb_populate_record(NULL::asset,to_jsonb(a)||jsonb_build_object('id','missing-stage-image'))).* FROM asset a WHERE id=(SELECT asset_id FROM projection WHERE id=$1)",
    [one],
  );
  await db.query(
    "UPDATE production_stage SET asset_id='missing-stage-image' WHERE stage_key='base'",
  );
  const review = await read();
  assert.equal(review.stages[0].status, "No disponible");
  assert.equal(review.stages[1].status, "Pendiente");
  assert(review.finalResource.ok);
  assert.equal((await act(one, "base")).status, 422);
});
test("hash, bytes o dimensiones inválidos bloquean conformidad", async () => {
  await document();
  await db.query(
    "UPDATE asset SET sha256=repeat('0',64) WHERE id=(SELECT asset_id FROM projection WHERE id=$1)",
    [one],
  );
  assert.equal((await act(one, "base")).status, 422);
  assert.equal((await read()).finalResource.ok, false);
});
test("archivo PNG truncado con hash recalculado tampoco admite conformidad", async () => {
  await document();
  const id = (
    await db.query("SELECT asset_id FROM projection WHERE id=$1", [one])
  ).rows[0].asset_id;
  const bytes = (
    await db.query("SELECT data FROM asset_blob WHERE asset_id=$1", [id])
  ).rows[0].data.subarray(0, 100);
  await db.query("UPDATE asset_blob SET data=$2 WHERE asset_id=$1", [
    id,
    bytes,
  ]);
  await db.query("UPDATE asset SET sha256=$2,byte_size=$3 WHERE id=$1", [
    id,
    createHash("sha256").update(bytes).digest("hex"),
    bytes.length,
  ]);
  assert.equal((await act(one, "base")).status, 422);
});
test("reemplazo de candidata conserva revisiones y audita en la misma transacción", async () => {
  await document();
  await complete();
  const saved = (
    await db.query("SELECT * FROM stage_review ORDER BY stage_key")
  ).rows;
  const result = await candidate();
  assert.equal(result.status, 200);
  assert.equal(result.body.candidate.projection_id, one);
  assert.deepEqual(
    (await db.query("SELECT * FROM stage_review ORDER BY stage_key")).rows,
    saved,
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*) FROM audit_log WHERE action='candidate.set' AND payload->>'previous_projection_id'=$1",
        [two],
      )
    ).rows[0].count,
    "1",
  );
});
test("dos confirmaciones con la misma revisión sólo aplican una operación", async () => {
  await document();
  const revision = (await read()).revision;
  const results = await Promise.all([
    act(one, "base", "POST", revision),
    act(one, "base", "POST", revision),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
  assert.equal(
    (await db.query("SELECT count(*) FROM stage_review")).rows[0].count,
    "1",
  );
});
test("otra candidatura impide confirmar un diálogo desactualizado", async () => {
  await document(one);
  await document(two);
  await complete(one);
  await complete(two);
  const stale = (await read(two)).revision;
  assert.equal((await candidate(one)).status, 200);
  assert.equal((await candidate(two, "PUT", stale)).status, 409);
  assert.equal((await read()).candidate.projection_id, one);
});
test("retiro de conformidad invalida siguientes y candidata conjuntamente; conserva historial", async () => {
  await document(one, "applicable");
  await complete();
  await candidate();
  const result = await act(one, "base", "DELETE");
  assert.equal(result.status, 200);
  assert.equal(result.body.candidate, null);
  assert.equal(result.body.conforming, 0);
  assert.equal(
    (await db.query("SELECT count(*) FROM stage_review")).rows[0].count,
    "0",
  );
  const audit = (
    await db.query(
      "SELECT payload FROM audit_log WHERE action='stage.conformity.clear'",
    )
  ).rows[0];
  assert.equal(audit.payload.removed_reviews.length, 3);
  assert.equal(audit.payload.candidate_removed, true);
});
test("fallo de auditoría revierte conformidades y candidata", async () => {
  await document();
  await complete();
  await candidate();
  const saved = await snapshot();
  await db.query(
    "ALTER TABLE audit_log ADD CONSTRAINT block_review CHECK(action<>'stage.conformity.clear') NOT VALID",
  );
  try {
    assert.equal((await act(one, "base", "DELETE")).status, 500);
    assert.equal(await snapshot(), saved);
  } finally {
    await db.query("ALTER TABLE audit_log DROP CONSTRAINT block_review");
  }
});
test("cambios en documentación invalidan revisión guardada; no se otorga candidatura", async () => {
  await document();
  await complete();
  await db.query(
    "UPDATE production_stage SET description='Cambio de registro' WHERE stage_key='base'",
  );
  const review = await read();
  assert.equal(review.complete, false);
  assert.equal(review.stages[0].review.valid, false);
  assert.equal((await candidate()).status, 422);
});
test("retiro de candidata preserva etapas y rechaza reintento obsoleto", async () => {
  await document();
  await complete();
  await candidate();
  const revision = (await read()).revision;
  const result = await candidate(one, "DELETE", revision);
  assert.equal(result.status, 200);
  assert.equal(result.body.candidate, null);
  assert.equal(result.body.conforming, 2);
  assert.equal((await candidate(one, "DELETE", revision)).status, 409);
});
test("pertenencia, sesión y cuenta activa se comprueban en servidor", async () => {
  assert.equal(
    (await request("/projections/PRJ-1663-L01-A01/review")).status,
    404,
  );
  assert.equal(
    (await fetch(origin + `/api/lotes/${lot}/projections/${one}/review`))
      .status,
    401,
  );
  await document();
  await db.query("UPDATE app_user SET is_active=false");
  assert.equal((await act(one, "base")).status, 403);
});

test("el endpoint de imágenes no sirve bytes corruptos ni permite una caché persistente", async () => {
  const id = (
    await db.query("SELECT asset_id FROM projection WHERE id=$1", [one])
  ).rows[0].asset_id;
  let response = await fetch(origin + `/api/assets/${id}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  await response.arrayBuffer();
  await db.query("UPDATE asset SET sha256=repeat('0',64) WHERE id=$1", [id]);
  response = await fetch(origin + `/api/assets/${id}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 422);
  assert.equal((await response.json()).resourceId, id);
});

test("identificador de imagen sin documentar se distingue de un archivo registrado ausente", async () => {
  await document();
  await db.query(
    "UPDATE production_stage SET asset_id=NULL WHERE stage_key='base'",
  );
  const review = await read();
  assert.equal(review.stages[0].status, "No documentado");
  assert.equal(review.stages[0].resource.reason, "Imagen no documentada");
  assert.equal(review.stages[1].status, "Pendiente");
  assert.equal(review.applicable, 2);
});

test("una ficha técnica fallida devuelve 503 y mantiene la identidad y la imagen final", async () => {
  await db.query("ALTER TABLE projection DROP COLUMN cfg_scale");
  const response = await request(`/projections/${one}`);
  assert.equal(response.status, 503);
  assert.match(response.body.error, /ficha de trazabilidad/);
  const review = await read();
  assert.equal(review.projection.id, one);
  assert.equal(review.finalResource.ok, true);
});

test("disociar una cuenta conserva conformidades y candidata sin exponer su identificador sustituto",async()=>{
 await document();await complete();await candidate(one);
 const owner=(await db.query('SELECT id FROM app_user ORDER BY id LIMIT 1')).rows[0];
 await db.query("UPDATE app_user SET username='eliminada-fixture',display_name='Cuenta eliminada',deleted_at=now(),is_active=false WHERE id=$1",[owner.id]);
 await db.query("INSERT INTO app_user(id,username,display_name,role,is_active,password_hash,session_version) VALUES(999,'lector-fixture','Lector técnico','institucional',true,'fixture-no-login',0)");
 const viewer=jwt.sign({sub:999,username:'lector-fixture',displayName:'Lector técnico',role:'institucional'},config.JWT_SECRET,{expiresIn:'5m'});
 const response=await fetch(origin+'/api/lotes/'+lot+'/projections/'+one+'/review',{headers:{Authorization:'Bearer '+viewer}});assert.equal(response.status,200);const state=await response.json();
 assert.equal(state.conforming,2);assert.equal(state.candidate.projection_id,one);assert.equal(state.candidate.username,null);assert.equal(state.candidate.display_name,'Cuenta eliminada');assert.equal(state.stages[0].review.displayName,'Cuenta eliminada');assert.equal(state.stages[0].review.username,null);assert(!JSON.stringify(state).includes('eliminada-fixture'));
});

test("tres fases aplicables requieren conformidad de acabado antes de completar y marcar candidata", async () => {
  await document(one, "applicable");
  assert.equal((await act(one, "base")).status, 200);
  assert.equal((await act(one, "figures")).status, 200);
  let review = await read(one);
  assert.equal(review.applicable, 3);
  assert.equal(review.conforming, 2);
  assert.equal(review.complete, false);
  assert.equal(review.canCandidate, false);
  assert.equal(review.stages[2].status, "Por revisar");
  assert.equal((await candidate(one)).status, 422);
  assert.equal((await act(one, "finish")).status, 200);
  review = await read(one);
  assert.equal(review.conforming, 3);
  assert.equal(review.complete, true);
  assert.equal((await candidate(one)).status, 200);
});
