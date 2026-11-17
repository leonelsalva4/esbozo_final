import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {performance} from 'node:perf_hooks';
import pg from 'pg';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Medición de API y proceso servidor. No mide renderizado ni memoria de Electron.
const root=new URL('../../',import.meta.url);
const config=dotenv.parse(readFileSync(new URL('data/testing/p00/backend.env',root)));
const url=new URL(config.DATABASE_URL);
if(!url.pathname.startsWith('/esbozo_test_'))throw Error('Se exige la base separada de pruebas.');
url.searchParams.set('options','-c default_transaction_read_only=on');
const pool=new pg.Pool({connectionString:url.href});
let server;
try {
 const readonly=(await pool.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only;
 if(readonly!=='on')throw Error('No se pudo imponer sólo lectura.');
 const user=(await pool.query("SELECT * FROM app_user WHERE is_active AND deleted_at IS NULL AND role='institucional' ORDER BY id LIMIT 1")).rows[0];
 if(!user)throw Error('Falta una cuenta institucional existente para consultar.');
 const token=jwt.sign({sub:user.id,username:user.username,displayName:user.display_name,role:user.role,sessionVersion:user.session_version},config.JWT_SECRET,{expiresIn:'10m'});
 const reserve=createServer();await new Promise(resolve=>reserve.listen(0,'127.0.0.1',resolve));const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
 server=spawn(process.execPath,['dist/server.js'],{cwd:new URL('backend/',root),env:{...process.env,...config,DATABASE_URL:url.href,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('No inició el servidor de medición')),10000);
  server.stdout.on('data',chunk=>{if(String(chunk).includes('Backend escuchando')){clearTimeout(timer);resolve();}});
  server.once('error',error=>{clearTimeout(timer);reject(error);});
  server.once('exit',code=>{clearTimeout(timer);reject(Error('Servidor finalizó: '+code));});
 });
 const origin=`http://127.0.0.1:${port}`, samples=[];
 async function get(endpoint){const response=await fetch(origin+endpoint,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(endpoint+': '+response.status);await response.arrayBuffer();}
 const projections=(await pool.query('SELECT p.id,p.lote_id,p.asset_id,s.asset_id AS sketch_asset,o.lote_id IS NOT NULL AS obtained FROM projection p JOIN sketch s ON s.id=p.sketch_id LEFT JOIN lote_obtencion o ON o.lote_id=p.lote_id ORDER BY p.lote_id,p.position')).rows;
 const firstByLot=[...new Map(projections.map(p=>[p.lote_id,p])).values()];
 for(let iteration=1;iteration<=10;iteration++) {
  for(const p of firstByLot){
   const base=`/api/lotes/${encodeURIComponent(p.lote_id)}`;
   const tasks=[['detalle',()=>get(`${base}/projections/${p.id}`)],['comparacion-recursos',()=>Promise.all([get(`/api/assets/${p.sketch_asset}/content`),get(`/api/assets/${p.asset_id}/content`)])]];
   if(p.obtained)tasks.push(['reapertura',()=>get(base+'/open')],['trazabilidad',()=>get(`${base}/projections/${p.id}/dossier`)]);
   for(const [action,run]of tasks){const start=performance.now();await run();const elapsedMs=performance.now()-start;
    const memory=spawnSync('ps',['-o','rss=','-p',String(server.pid)],{encoding:'utf8'});if(memory.status!==0)throw Error('No se pudo medir el proceso propio.');
    samples.push({lot:p.lote_id,action,iteration,elapsedMs:Math.round(elapsedMs*100)/100,serverRssMiB:Math.round(Number(memory.stdout.trim())/1024*100)/100});
   }
  }
 }
 const groups=[...new Set(samples.map(s=>s.lot+'|'+s.action))].map(key=>{const rows=samples.filter(s=>s.lot+'|'+s.action===key);return {lot:rows[0].lot,action:rows[0].action,repetitions:rows.length,firstMs:rows[0].elapsedMs,minMs:Math.min(...rows.map(s=>s.elapsedMs)),maxMs:Math.max(...rows.map(s=>s.elapsedMs)),maxServerRssMiB:Math.max(...rows.map(s=>s.serverRssMiB))};});
 const report={at:new Date().toISOString(),database:url.pathname.slice(1),readonly:true,writes:0,scope:'API local; incluye transferencia de bytes y verificación servidor. Excluye presentación, decodificación del navegador y memoria de Electron.',skippedUnobtainedLots:firstByLot.filter(p=>!p.obtained).map(p=>p.lote_id),groups,samples};
 mkdirSync(new URL('data/testing/performance/',root),{recursive:true});writeFileSync(new URL('data/testing/performance/api-readonly.json',root),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,samples:undefined}));
} finally {
 if(server&&server.exitCode===null){const done=new Promise(resolve=>server.once('exit',resolve));server.kill('SIGTERM');await done;}
 await pool.end();
}
