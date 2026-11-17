import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import pg from 'pg';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

const config=dotenv.parse(readFileSync(new URL('../../data/testing/p00/backend.env',import.meta.url)));
assert(new URL(config.DATABASE_URL).pathname.startsWith('/esbozo_test_'),'Estas pruebas sólo admiten una base esbozo_test_*');
const schema=`test_lots_${process.pid}_${Date.now()}`;
const tables=['app_user','asset','asset_blob','sketch','lote','projection','lote_obtencion','lote_candidate','audit_log'];
const source=new pg.Pool({connectionString:config.DATABASE_URL});
const isolatedUrl=new URL(config.DATABASE_URL);isolatedUrl.searchParams.set('options',`-c search_path=${schema}`);
const isolated=new pg.Pool({connectionString:isolatedUrl.href});
let server;let origin;let token;
const lotId='LOT-1582-L01';
const request=async(path,options={})=>{
 const response=await fetch(origin+path,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...options.headers}});
 return {status:response.status,body:await response.json()};
};
const obtain=(id=lotId)=>request('/api/sketches/1582/lote/obtain',{method:'POST',body:JSON.stringify(id?{loteId:id}:{})});
const snapshot=async()=>JSON.stringify({obtained:(await isolated.query('SELECT * FROM lote_obtencion ORDER BY lote_id')).rows,candidate:(await isolated.query('SELECT * FROM lote_candidate ORDER BY lote_id')).rows});
before(async()=>{
 await source.query(`CREATE SCHEMA ${schema}`);
 for(const table of tables)await source.query(`CREATE TABLE ${schema}.${table} AS TABLE public.${table}`);
 await source.query(`ALTER TABLE ${schema}.lote_obtencion ADD PRIMARY KEY(lote_id)`);
 await source.query(`CREATE SEQUENCE ${schema}.audit_id START 1000000`);
 await source.query(`ALTER TABLE ${schema}.audit_log ALTER COLUMN id SET DEFAULT nextval('${schema}.audit_id')`);
 assert.equal((await isolated.query('SELECT current_schema() AS name')).rows[0].name,schema);
 const user=(await isolated.query('SELECT * FROM app_user ORDER BY id LIMIT 1')).rows[0];
 token=jwt.sign({sub:user.id,username:user.username,displayName:user.display_name,role:user.role},config.JWT_SECRET,{expiresIn:'5m'});
 const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 origin=`http://127.0.0.1:${port}`;
 server=spawn(process.execPath,['dist/server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,DATABASE_URL:isolatedUrl.href,JWT_SECRET:config.JWT_SECRET,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('No inició el servidor aislado')),10000);server.stdout.on('data',data=>{if(String(data).includes('Backend escuchando')){clearTimeout(timeout);resolve();}});server.once('error',reject);server.once('exit',code=>reject(new Error(`El servidor aislado terminó: ${code}`)));});
});
beforeEach(async()=>{
 for(const table of ['audit_log','lote_candidate','lote_obtencion','projection','lote','asset_blob','asset']){
  await isolated.query(`TRUNCATE ${schema}.${table}`);
  await isolated.query(`INSERT INTO ${schema}.${table} SELECT * FROM public.${table}`);
 }
 await isolated.query('DELETE FROM lote_obtencion');
 await isolated.query("INSERT INTO lote_obtencion(lote_id,user_id,verification,obtained_at) SELECT $1,id,'{}',now() FROM app_user ORDER BY id LIMIT 1",[lotId]);
 await isolated.query('DELETE FROM lote_candidate');
 await isolated.query("INSERT INTO lote_candidate(lote_id,projection_id,user_id,set_at) SELECT $1,'PRJ-1582-L01-A02',id,now() FROM app_user ORDER BY id LIMIT 1",[lotId]);
});
after(async()=>{
 if(server && server.exitCode===null){server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));}
 await isolated.end();await source.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await source.end();
});
test('reabrir verifica cuatro pasos sin modificar obtención ni candidata',async()=>{
 const saved=await snapshot();const result=await request(`/api/lotes/${lotId}/open`);
 assert.equal(result.status,200);assert.equal(result.body.steps.length,4);assert(result.body.steps.every(step=>step.ok));assert.equal(await snapshot(),saved);
 const history=await request('/api/sketches/1582/lotes');assert.equal(history.body[0].projection_count,4);assert.equal(history.body[0].candidate_position,2);
});
test('reintentos concurrentes del mismo lote ya obtenido son idempotentes',async()=>{
 const saved=await snapshot();const count=(await isolated.query('SELECT count(*) FROM audit_log')).rows[0].count;
 const results=await Promise.all([obtain(),obtain(),obtain()]);assert(results.every(result=>result.status===200 && result.body.reused));assert.equal(await snapshot(),saved);assert.equal((await isolated.query('SELECT count(*) FROM audit_log')).rows[0].count,count);
});
test('faltante de imagen detiene recuperación y deja verificación pendiente',async()=>{
 await isolated.query("DELETE FROM asset_blob WHERE asset_id=(SELECT asset_id FROM projection WHERE position=3 AND lote_id=$1)",[lotId]);
 const saved=await snapshot();const result=await request(`/api/lotes/${lotId}/open`);assert.equal(result.status,422);assert.equal(result.body.projectionCount,3);assert.equal(result.body.steps[1].state,'failed');assert.equal(result.body.steps[2].state,'pending');assert.equal(await snapshot(),saved);
});
test('SHA-256 incorrecto impide guardar una nueva obtención',async()=>{
 await isolated.query('DELETE FROM lote_obtencion');await isolated.query("UPDATE asset SET sha256=repeat('0',64) WHERE id=(SELECT asset_id FROM projection WHERE position=1 AND lote_id=$1)",[lotId]);
 const saved=await snapshot();const result=await obtain();assert.equal(result.status,422);assert.equal(result.body.failure,'integrity');assert.equal(result.body.steps[3].state,'pending');assert.equal(await snapshot(),saved);
});
test('dos envíos concurrentes obtienen una sola vez el lote solicitado',async()=>{
 await isolated.query('DELETE FROM lote_obtencion');const count=Number((await isolated.query("SELECT count(*) FROM audit_log WHERE action='lote.obtain'")).rows[0].count);
 const results=await Promise.all([obtain(),obtain()]);assert(results.every(result=>result.status===200));assert.equal(results.filter(result=>!result.body.reused).length,1);assert.equal((await isolated.query('SELECT count(*) FROM lote_obtencion')).rows[0].count,'1');assert.equal(Number((await isolated.query("SELECT count(*) FROM audit_log WHERE action='lote.obtain'")).rows[0].count),count+1);assert.equal(results[0].body.obtainedAt,results[1].body.obtainedAt);
});
test('agotamiento distingue ausencia de lotes y conserva los anteriores',async()=>{
 const saved=await snapshot();const result=await obtain(null);assert.equal(result.status,409);assert.equal(result.body.failure,'exhausted');assert.equal(result.body.conservedLot.id,lotId);assert.equal(result.body.conservedLot.projection_count,4);assert.equal(await snapshot(),saved);assert.equal((await request('/api/sketches/1582/lote')).body.available,false);
});
test('fallo al auditar revierte también la obtención',async()=>{
 await isolated.query('DELETE FROM lote_obtencion');const saved=await snapshot();
 await isolated.query("ALTER TABLE audit_log ADD CONSTRAINT test_block_obtain CHECK(action <> 'lote.obtain') NOT VALID");
 try{assert.equal((await obtain()).status,500);assert.equal(await snapshot(),saved);}finally{await isolated.query('ALTER TABLE audit_log DROP CONSTRAINT test_block_obtain');}
});
test('las asociaciones incorrectas se rechazan aunque los archivos existan',async()=>{
 await isolated.query("UPDATE projection SET sketch_id='1663' WHERE position=4 AND lote_id=$1",[lotId]);
 const result=await request(`/api/lotes/${lotId}/open`);assert.equal(result.status,422);assert.equal(result.body.failure,'integrity');
});
test('dos lotes diferentes pueden obtenerse sin sobrescribir el primero',async()=>{
 await isolated.query('DELETE FROM lote_obtencion');
 await isolated.query("INSERT INTO lote SELECT (jsonb_populate_record(NULL::lote,to_jsonb(l)||jsonb_build_object('id','LOT-1582-L02','sequence',2))).* FROM lote l WHERE id=$1",[lotId]);
 await isolated.query("INSERT INTO projection SELECT (jsonb_populate_record(NULL::projection,to_jsonb(p)||jsonb_build_object('id',replace(p.id,'L01','L02'),'lote_id','LOT-1582-L02','source_filename','test-'||p.source_filename))).* FROM projection p WHERE lote_id=$1",[lotId]);
 const first=await obtain();const saved=first.body.obtainedAt;const second=await obtain('LOT-1582-L02');assert.equal(first.status,200);assert.equal(second.status,200);assert.equal((await isolated.query('SELECT count(*) FROM lote_obtencion')).rows[0].count,'2');assert.equal((await request(`/api/lotes/${lotId}/open`)).body.obtainedAt,saved);
});
test('historial y reapertura exigen sesión; 1663 muestra el lote real importado',async()=>{
 assert.equal((await fetch(origin+'/api/sketches/1582/lotes')).status,401);assert.equal((await fetch(origin+`/api/lotes/${lotId}/open`)).status,401);const real=(await request('/api/sketches/1663/lotes')).body;assert.equal(real.length,1);assert.equal(real[0].id,'LOT-1663-L01');assert.equal(real[0].projection_count,4);assert.equal(real[0].obtained_at,null);assert.equal((await request('/api/lotes/no-existe/open')).status,404);
});
