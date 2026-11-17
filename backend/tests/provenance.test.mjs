import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import pg from 'pg';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
const config=dotenv.parse(readFileSync(new URL('../../data/testing/p00/backend.env',import.meta.url)));
assert(new URL(config.DATABASE_URL).pathname.startsWith('/esbozo_test_'));
const schema=`test_provenance_${process.pid}_${Date.now()}`,source=new pg.Pool({connectionString:config.DATABASE_URL});
const url=new URL(config.DATABASE_URL);url.searchParams.set('options',`-c search_path=${schema}`);
const db=new pg.Pool({connectionString:url.href});let server,origin,token;
const lot='LOT-1582-L01',one='PRJ-1582-L01-A01';
async function request(path,auth=true){const response=await fetch(origin+path,{headers:auth?{Authorization:`Bearer ${token}`}:{}});return {status:response.status,body:await response.json()};}
before(async()=>{
 await source.query(`CREATE SCHEMA ${schema}`);
 for(const table of ['sketch','audit_log','system_metadata','schema_migration','app_user','asset','asset_blob','lote','projection','generation_run','lora_version','source_package','production_stage','stage_review','lote_obtencion','lote_candidate','external_selection','provenance_resource','provenance_origin','provenance_link','production_operation','operation_resource','reference_identity'])await source.query(`CREATE TABLE ${schema}.${table} AS TABLE public.${table}`);
 // Decisiones técnicas aisladas: no depender de las revisiones reales guardadas en la copia por el usuario.
 await db.query('DELETE FROM stage_review');await db.query('DELETE FROM lote_candidate');await db.query('DELETE FROM lote_obtencion');
 await db.query('ALTER TABLE stage_review ADD PRIMARY KEY(projection_id,stage_key)');await db.query('ALTER TABLE stage_review ALTER COLUMN reviewed_at SET DEFAULT clock_timestamp()');
 await db.query('CREATE SEQUENCE validation_audit_ids START 9000000');await db.query("ALTER TABLE audit_log ALTER COLUMN id SET DEFAULT nextval('validation_audit_ids')");await db.query('ALTER TABLE audit_log ALTER COLUMN occurred_at SET DEFAULT now()');
 const user=(await db.query('SELECT * FROM app_user ORDER BY id LIMIT 1')).rows[0];
 token=jwt.sign({sub:user.id,username:user.username,displayName:user.display_name,role:user.role},config.JWT_SECRET,{expiresIn:'10m'});
 await db.query("INSERT INTO lote_obtencion(lote_id,user_id,verification,obtained_at) VALUES($1,$2,'{}',now())",[lot,user.id]);
 const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));origin=`http://127.0.0.1:${port}`;
 server=spawn(process.execPath,['dist/server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,DATABASE_URL:url.href,JWT_SECRET:config.JWT_SECRET,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Servidor no inició')),10000);server.stdout.on('data',data=>{if(String(data).includes('Backend escuchando')){clearTimeout(timeout);resolve();}});server.once('error',reject);server.once('exit',code=>reject(Error(`Servidor terminó ${code}`)));});
});
after(async()=>{if(server&&server.exitCode===null){server.kill();await new Promise(resolve=>server.once('exit',resolve));}await db.end();await source.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await source.end();});
test('ficha FLUX devuelve rama, metadatos y selección externa sin inventar conformidad',async()=>{
 const result=await request(`/api/lotes/${lot}/projections/${one}/dossier`);assert.equal(result.status,200);const {info,review,externalSelection,records}=result.body;
 assert.match(info.base_model_name,/FLUX/);assert.equal(info.branch_label,'2718');assert.equal(info.seed,null);assert.equal(review.candidate,null);assert.equal(review.conforming,0);assert.equal(review.stages[0].status,'Por revisar');assert.equal(review.stages[0].resource.ok,true);assert.equal(review.stages[0].assetId,'IMG-76905dc958ed3eb3814e1d56501eec8fd36ed8fd8b9ca6f9ad0ec1a4a86ba5a7');assert.equal(review.stages[2].status,'Pendiente');assert.equal(review.applicable,3);assert.equal(review.stages[2].assetId,review.projection.asset_id);assert.equal(externalSelection.person,'Leonel Salva');assert(records.length>0);assert(result.body.operations.length>0);assert(result.body.inputs.length>0);assert(result.body.inputs.every(input=>result.body.operations.some(operation=>operation.id===input.operation_id)));
 assert(!/stable[\s_-]*diffusion|controlnet|sd[\s_-]?1[._]?5/i.test(JSON.stringify(result.body)));
});
test('ficha y registros requieren autenticación y pertenencia al lote',async()=>{
 assert.equal((await request(`/api/lotes/${lot}/projections/${one}/dossier`,false)).status,401);
 assert.equal((await request(`/api/lotes/LOT-1663-L01/projections/${one}/dossier`)).status,404);
 assert.equal((await request('/api/lotes/resources/'+'0'.repeat(64),false)).status,401);
});
test('documento original conserva bytes y SHA; corrupción no se sirve',async()=>{
 const row=(await db.query('SELECT sha256,content FROM provenance_resource WHERE content IS NOT NULL ORDER BY sha256 LIMIT 1')).rows[0];
 const response=await fetch(origin+'/api/lotes/resources/'+row.sha256,{headers:{Authorization:`Bearer ${token}`}});assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),row.content);assert.equal(response.headers.get('cache-control'),'no-store');
 await db.query("UPDATE provenance_resource SET content='corrupto'::bytea WHERE sha256=$1",[row.sha256]);
 assert.equal((await request('/api/lotes/resources/'+row.sha256)).status,503);
});
test('los identificadores ausentes o inválidos no recuperan otro documento',async()=>{
 assert.equal((await request('/api/lotes/resources/'+'0'.repeat(64))).status,404);assert.equal((await request('/api/lotes/resources/invalido')).status,400);
});

test('una ficha fallida conserva la consulta independiente de identidad e imagen final',async()=>{
 await db.query('DROP TABLE external_selection');
 assert.equal((await request(`/api/lotes/${lot}/projections/${one}/dossier`)).status,503);
 const list=await request(`/api/lotes/${lot}/projections`);assert.equal(list.status,200);const projection=list.body.find(p=>p.id===one);assert(projection);assert.equal(projection.branch_label,'2718');
 const response=await fetch(origin+'/api/assets/'+projection.asset_id+'/content',{headers:{Authorization:'Bearer '+token}});assert.equal(response.status,200);assert((await response.arrayBuffer()).byteLength>0);
});

test('PF-02/PF-06/PF-09: catálogo, ficha técnica, historial y resumen corresponden al boceto y lote',async()=>{
 const sketches=await request('/api/sketches');assert.equal(sketches.status,200);assert.deepEqual(sketches.body.map(s=>s.id).sort(),['1582','1663']);
 assert.equal((await request('/api/sketches/1582/lote')).body.available,false);
 const obtained=await request('/api/sketches/1582/lote-obtenido');assert.equal(obtained.status,200);assert.equal(obtained.body.obtained,true);
 assert.equal((await request('/api/sketches/inexistente/lote')).body.available,false);assert.equal((await request('/api/sketches/inexistente/lote-obtenido')).body.obtained,false);
 const run=await request(`/api/lotes/${lot}/generation-run`);assert.equal(run.status,200);assert.match(run.body.base_model_name,/FLUX/);assert.equal((await request('/api/lotes/inexistente/generation-run')).status,404);
 const projection=await request(`/api/lotes/${lot}/projections/${one}`);assert.equal(projection.status,200);assert.equal(projection.body.id,one);assert.equal((await request(`/api/lotes/${lot}/projections/inexistente`)).status,404);
 const summary=await request(`/api/lotes/${lot}/reviews`);assert.equal(summary.status,200);assert.equal(summary.body.length,4);assert(summary.body.every(s=>s.conforming===0));
 assert.equal((await request(`/api/lotes/${lot}/audit-log`)).status,200);assert.equal((await request('/api/assets/inexistente/content')).status,404);
 const health=await request('/api/health');assert.equal(health.status,200);assert.equal(health.body.ready,true);assert.equal(health.body.schema_version,(await db.query("SELECT value FROM system_metadata WHERE key='schema_version'")).rows[0].value);
});
test('PF-01: errores de acceso incompleto, inválido, inactivo y token adulterado son controlados',async()=>{
 const post=async body=>{const r=await fetch(origin+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 assert.equal((await post({username:5})).status,400);assert.equal((await post({username:'cuenta-inexistente',password:'incorrecta'})).status,401);
 const user=(await db.query('SELECT id,username FROM app_user ORDER BY id LIMIT 1')).rows[0];assert.equal((await post({username:user.username,password:'incorrecta'})).status,401);
 await db.query('UPDATE app_user SET is_active=false WHERE id=$1',[user.id]);try{assert.equal((await post({username:user.username,password:'incorrecta'})).status,403);}finally{await db.query('UPDATE app_user SET is_active=true WHERE id=$1',[user.id]);}
 assert.equal((await fetch(origin+'/api/auth/me',{headers:{Authorization:'Bearer adulterado'}})).status,401);
 assert.equal((await fetch(origin+'/api/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+token}})).status,204);
});

test('la guía de Figuras asignada por el usuario se recupera sin crear conformidades y respeta el orden',async()=>{
 const target='LOT-1663-L01',id='PRJ-1663-L01-A01',user=(await db.query('SELECT id FROM app_user ORDER BY id LIMIT 1')).rows[0];
 await db.query("INSERT INTO lote_obtencion(lote_id,user_id,verification,obtained_at) VALUES($1,$2,'{}',now())",[target,user.id]);
 // El test anterior revoca la sesión: usar su versión actual en este esquema propio.
 const current=(await db.query('SELECT * FROM app_user WHERE id=$1',[user.id])).rows[0];
 token=jwt.sign({sub:current.id,username:current.username,displayName:current.display_name,role:current.role,sessionVersion:current.session_version},config.JWT_SECRET,{expiresIn:'10m'});
 const path=`/api/lotes/${target}/projections/${id}/review`;let review=(await request(path)).body;
 const figures=review.stages.find(s=>s.key==='figures');assert.equal(figures.imageRole,'interpretive_guide');assert.equal(figures.assetId,'IMG-8bfe374ce8d7fae0f713bcfbb80d3e28777043b693ff916f9d184e09f9495c83');assert.equal(figures.resource.ok,true);assert.equal(figures.canReview,false);assert.equal(figures.review,null);
 const response=await fetch(origin+`/api/lotes/${target}/projections/${id}/stages/base/review`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:review.revision})});assert.equal(response.status,200);review=await response.json();assert.equal(review.conforming,1);assert.equal(review.documented,true);assert.equal(review.stages.find(s=>s.key==='figures').canReview,true);assert.equal(review.stages.find(s=>s.key==='figures').review,null);
 const image=await fetch(origin+'/api/assets/'+figures.assetId+'/content',{headers:{Authorization:`Bearer ${token}`}});assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');
});
