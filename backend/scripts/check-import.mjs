import { readFileSync, writeFileSync } from 'node:fs';
import dotenv from 'dotenv';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import { createHash } from 'node:crypto';
const root=new URL('../../',import.meta.url);
const primary=process.argv.includes('--primary');
const config=dotenv.parse(readFileSync(new URL(primary?'backend/.env':'data/testing/p00/backend.env',root)));
if(!primary&&!new URL(config.DATABASE_URL).pathname.startsWith('/esbozo_test_'))throw Error('Sólo copia de pruebas');
const pool=new pg.Pool({connectionString:config.DATABASE_URL});
const user=(await pool.query('SELECT id,username,display_name,role,session_version FROM app_user WHERE is_active AND deleted_at IS NULL ORDER BY id LIMIT 1')).rows[0];
const token=jwt.sign({sub:user.id,username:user.username,displayName:user.display_name,role:user.role,sessionVersion:user.session_version},config.JWT_SECRET,{expiresIn:'10m'});
let server,origin=`http://localhost:${config.PORT||4000}`;
if(primary){
 const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));origin=`http://127.0.0.1:${port}`;
 server=spawn(process.execPath,['dist/server.js'],{cwd:new URL('backend/',root),env:{...process.env,...config,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Servidor de verificación no inició')),10000);server.stdout.on('data',data=>{if(String(data).includes('Backend escuchando')){clearTimeout(timer);resolve();}});server.once('error',reject);});
}
const headers={Authorization:`Bearer ${token}`},checks=[];
async function get(path){const response=await fetch(origin+path,{headers});if(!response.ok)throw Error(`${path}: ${response.status} ${await response.text()}`);return response;}
try {
 const count=(await pool.query('SELECT count(*) FROM projection')).rows[0].count;if(count!=='8')throw Error('Se esperaban ocho finales');
 const projections=(await pool.query('SELECT id,id AS asset_id,kind,width,height,sha256 FROM asset ORDER BY kind,id')).rows;
 for(const p of projections){const bytes=Buffer.from(await(await get(`/api/assets/${p.asset_id}/content`)).arrayBuffer());if(createHash('sha256').update(bytes).digest('hex')!==p.sha256)throw Error('SHA inválido');checks.push({asset:p.id,kind:p.kind,width:p.width,height:p.height,image:true,bytes:bytes.length});}
 const counts=(await pool.query('SELECT (SELECT count(*) FROM lote) AS lots,(SELECT count(*) FROM stage_review) AS reviews,(SELECT count(*) FROM lote_candidate) AS candidates,(SELECT count(*) FROM asset) AS assets')).rows[0];
 const unsafe=(await pool.query("SELECT id FROM generation_run WHERE base_model_name ~* 'stable|sd.?1.?5|controlnet'")).rows;
 if(unsafe.length)throw Error('Modelo anterior activo');
 const report={database:new URL(config.DATABASE_URL).pathname.slice(1),checks,counts,at:new Date().toISOString()};
 writeFileSync(new URL(primary?'data/testing/importacion-final/api-images-primary.json':'data/testing/importacion-final/api-images.json',root),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,checks:undefined,verifiedImages:checks.length}));
}finally{if(server&&server.exitCode===null){server.kill();await new Promise(resolve=>server.once('exit',resolve));}await pool.end();}
