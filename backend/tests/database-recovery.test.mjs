import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, copyFileSync, appendFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tmpdir } from 'node:os';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import { postgresTool } from '../scripts/postgres-tools.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const evidence=path.join(root,'data/testing/entrega-final-20261117');
const reserve=async()=>{const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const port=s.address().port;await new Promise(r=>s.close(r));return port;};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function run(name,args){const r=spawnSync(postgresTool(name),args,{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout;}

test('PF-11: caída real y recuperación de PostgreSQL no detienen la API ni dejan operaciones parciales', {timeout:180000}, async()=>{
 mkdirSync(evidence,{recursive:true});
 const directory=mkdtempSync(path.join(tmpdir(),'esbozo-pg-'));
 const data=path.join(directory,'pgdata'),port=await reserve(),httpPort=await reserve();
 const database=`esbozo_test_recovery_${process.pid}_${Date.now()}`;
 const url=`postgresql://esbozo_validation@127.0.0.1:${port}/${database}`;
 const secret=randomBytes(48).toString('hex'),log=path.join(directory,'backend.log');
 let running=false,server,db;
 const control=(...args)=>run('pg_ctl',['-D',data,...args]);
 const start=()=>{control('-l',path.join(directory,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port}${process.platform==='win32'?'':` -k "${directory}"`}`,'-w','start');running=true;};
 const stop=()=>{control('-m','fast','-w','stop');running=false;};
 const connect=()=>{db=new pg.Pool({connectionString:url,connectionTimeoutMillis:2000});db.on('error',()=>{});};
 try{
  run('initdb',['-D',data,'--username=esbozo_validation','--auth=trust','--encoding=UTF8','--no-locale']);start();
  run('createdb',['-h','127.0.0.1','-p',String(port),'-U','esbozo_validation',database]);
  const delivery=path.join(root,'data/delivery');const latest=readdirSync(delivery).filter(x=>x.startsWith('installation-')).sort().at(-1);assert(latest);
  const config=path.join(directory,'restore.env');writeFileSync(config,`DATABASE_URL=${url}\n`,{mode:0o600});
  const restore=spawnSync(process.execPath,[path.join(root,'backend/scripts/restore-installation.mjs'),'--apply','--dump',path.join(delivery,latest,'esbozo.dump'),'--env-file',config],{encoding:'utf8'});assert.equal(restore.status,0,restore.stderr);
  connect();
  const user=(await db.query('SELECT * FROM app_user WHERE is_active AND deleted_at IS NULL ORDER BY id LIMIT 1')).rows[0];
  const token=jwt.sign({sub:user.id,username:user.username,displayName:user.display_name,role:user.role,sessionVersion:user.session_version},secret,{expiresIn:'10m'});
  const fingerprint=async()=>(await db.query("SELECT md5(string_agg(asset_id||md5(data),'' ORDER BY asset_id)) AS value FROM asset_blob")).rows[0].value;
  const original=await fingerprint();
  server=spawn(process.execPath,['dist/server.js'],{cwd:path.join(root,'backend'),env:{...process.env,DATABASE_URL:url,JWT_SECRET:secret,PORT:String(httpPort),ESBOZO_LOG_FILE:log},stdio:['ignore','pipe','pipe']});
  server.stderr.on('data',b=>appendFileSync(path.join(evidence,'recovery-server.log'),b));
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No inició la API de prueba')),15000);server.stdout.on('data',b=>{if(String(b).includes('Backend escuchando')){clearTimeout(timer);resolve();}});server.once('exit',code=>reject(Error('La API terminó: '+code)));});
  const request=async(endpoint,method='GET',body)=>{const r=await fetch(`http://127.0.0.1:${httpPort}/api`+endpoint,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});return{status:r.status,body:await r.json()};};
  const lot='LOT-1582-L01',projection='PRJ-1582-L01-A01',reviewPath=`/lotes/${lot}/projections/${projection}/review`;
  await db.query('DELETE FROM stage_review');await db.query('DELETE FROM lote_candidate');await db.query('DELETE FROM lote_obtencion');
  await db.query("CREATE FUNCTION validation_pause() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(5); RETURN NEW; END $$");
  const waitInTransaction=async()=>{for(let i=0;i<120;i++){const active=await db.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event='PgSleep'");if(active.rowCount)return;await pause(100);}throw Error('La escritura no ingresó al punto de interrupción');};
  await db.query('CREATE TRIGGER validation_obtain BEFORE INSERT ON lote_obtencion FOR EACH ROW EXECUTE FUNCTION validation_pause()');
  const obtaining=request('/sketches/1582/lote/obtain','POST',{loteId:lot});await waitInTransaction();await request('/auth/me');stop();
  const failedObtain=await obtaining;assert.equal(failedObtain.status,500);assert.equal(server.exitCode,null);await db.end();start();connect();
  assert.equal((await db.query('SELECT count(*) FROM lote_obtencion')).rows[0].count,'0');
  await db.query('DROP TRIGGER validation_obtain ON lote_obtencion');assert.equal((await request('/sketches/1582/lote/obtain','POST',{loteId:lot})).status,200);
  for(const key of ['base','figures','finish']){const review=(await request(reviewPath)).body;assert.equal((await request(`/lotes/${lot}/projections/${projection}/stages/${key}/review`,'POST',{expectedRevision:review.revision})).status,200);}
  await db.query('CREATE TRIGGER validation_candidate BEFORE INSERT ON lote_candidate FOR EACH ROW EXECUTE FUNCTION validation_pause()');
  const review=(await request(reviewPath)).body;const marking=request(`/lotes/${lot}/candidate`,'PUT',{projectionId:projection,expectedRevision:review.revision});await waitInTransaction();await request('/auth/me');stop();
  const failedCandidate=await marking;assert.equal(failedCandidate.status,500);assert.equal(server.exitCode,null);await db.end();start();connect();
  assert.equal((await db.query('SELECT count(*) FROM lote_candidate')).rows[0].count,'0');assert.equal((await db.query('SELECT count(*) FROM stage_review')).rows[0].count,'3');
  await db.query('DROP TRIGGER validation_candidate ON lote_candidate');const current=(await request(reviewPath)).body;
  assert.equal((await request(`/lotes/${lot}/candidate`,'PUT',{projectionId:projection,expectedRevision:current.revision})).status,200);
  assert.equal(await fingerprint(),original);assert.equal(server.exitCode,null);
  const entries=readFileSync(log,'utf8').trim().split('\n').map(JSON.parse);assert(entries.length>0);assert(entries.some(e=>e.code==='57P01'||e.code==='ECONNREFUSED'||e.code==='UNEXPECTED_ERROR'));
  writeFileSync(path.join(evidence,'database-recovery.json'),JSON.stringify({passed:true,postgresVersion:run('pg_ctl',['--version']).trim(),obtainFailure:failedObtain.status,candidateFailure:failedCandidate.status,retriesSucceeded:true,serverStayedAlive:true,imagesUnchanged:true,technicalEntries:entries.length,database:'instancia temporal exclusiva',at:new Date().toISOString()},null,2));
  copyFileSync(log,path.join(evidence,'database-recovery-technical.log'));
 }finally{
  if(server&&server.exitCode===null){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}
  await db?.end().catch(()=>{});if(running)stop();rmSync(directory,{recursive:true,force:true});
 }
});
