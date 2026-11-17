import {readFileSync,writeFileSync,readdirSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
if(process.platform!=='darwin')throw Error('Esta verificación del paquete se implementó para macOS.');
const release=path.join(root,'release'),latest=readdirSync(release).filter(n=>n.startsWith('local-')).sort().at(-1);
if(!latest)throw Error('Primero ejecutar npm run package:local');
const packaging=JSON.parse(readFileSync(path.join(release,latest,'VERIFICACION.json'))),bundle=packaging.bundles[0],app=path.join(bundle,'Esbozo.app'),resources=path.join(app,'Contents/Resources'),backendDir=path.join(resources,'app/backend'),executable=path.join(app,'Contents/MacOS/Esbozo');
const load=createRequire(path.join(backendDir,'package.json'));
const {startBackend}=load(path.join(resources,'app/electron/backend-runtime.cjs'));
const config=load('dotenv').parse(readFileSync(path.join(root,'data/testing/p00/backend.env')));
assert(new URL(config.DATABASE_URL).pathname.startsWith('/esbozo_test_'),'Se exige copia separada de pruebas');
const net=createServer();await new Promise(resolve=>net.listen(0,'127.0.0.1',resolve));const port=net.address().port;await new Promise(resolve=>net.close(resolve));
const testing=path.join(root,'data/testing/packaging');mkdirSync(testing,{recursive:true});const temp=mkdtempSync(path.join(testing,'runtime-')),envfile=path.join(temp,'backend.env');
writeFileSync(envfile,Object.entries({...config,PORT:String(port)}).map(([key,value])=>`${key}=${JSON.stringify(value)}`).join('\n'),{mode:0o600});
let runtime,pool,child,exited=false;const checks=[];
try{
 runtime=await startBackend({backendDir,configPath:envfile,appVersion:packaging.version,expectedPort:port,spawnChild:(file,env)=>{
  child=spawn(executable,[file],{cwd:backendDir,env:{...env,ELECTRON_RUN_AS_NODE:'1'},stdio:['ignore','pipe','pipe']});child.once('exit',()=>{exited=true;});return child;
 }});
 pool=new(load('pg').Pool)({connectionString:config.DATABASE_URL});const user=(await pool.query('SELECT id,username,display_name,role,session_version FROM app_user WHERE is_active AND deleted_at IS NULL ORDER BY id LIMIT 1')).rows[0];
 const token=load('jsonwebtoken').sign({sub:user.id,username:user.username,displayName:user.display_name,role:user.role,sessionVersion:user.session_version},config.JWT_SECRET,{expiresIn:'5m'});
 const get=async endpoint=>{const r=await fetch(`http://127.0.0.1:${port}${endpoint}`,{headers:{Authorization:`Bearer ${token}`}});assert.equal(r.status,200,endpoint);return r;};
 const about=await(await get('/api/system/about')).json();assert.equal(about.applicationVersion,packaging.version);assert.equal(about.schemaVersion,(await pool.query("SELECT value FROM system_metadata WHERE key='schema_version'")).rows[0].value);checks.push('versiones');
 const sketches=await(await get('/api/sketches')).json();assert.equal(sketches.length,2);checks.push('bocetos');
 const images=(await pool.query('SELECT id,id AS asset_id,kind,sha256 FROM asset ORDER BY kind,id')).rows;assert.equal((await pool.query('SELECT count(*) FROM projection')).rows[0].count,'8');
 for(const image of images){const bytes=Buffer.from(await(await get(`/api/assets/${image.asset_id}/content`)).arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),image.sha256);checks.push(image.id);}
 assert(readFileSync(path.join(resources,'app/dist/index.html'),'utf8').includes('Content-Security-Policy'));checks.push('politica-contenido-local');
 assert.equal(createHash('sha256').update(readFileSync(path.join(resources,'electron.icns'))).digest('hex'),createHash('sha256').update(readFileSync(path.join(resources,'app/assets/Esbozo.icns'))).digest('hex'));checks.push('icono-institucional');
 const result={bundle,checks,engine:'Electron en modo Node, sin ventana',database:'copia de pruebas',writes:0,credentialsIncluded:false,visualVerification:false,at:new Date().toISOString()};writeFileSync(path.join(testing,'resultado.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{
 await pool?.end();
 if(runtime&&!exited){const done=new Promise(resolve=>child.once('exit',resolve));runtime.stop();await Promise.race([done,new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('El servidor empaquetado no terminó')),5000);t.unref();})]);}
 rmSync(temp,{recursive:true,force:true});
}
