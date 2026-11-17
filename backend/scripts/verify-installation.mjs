import {postgresTool} from './postgres-tools.mjs';
import {readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import {userInfo} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';
const root=fileURLToPath(new URL('../../',import.meta.url)),folder=process.argv[2];if(!folder)throw Error('Indicá la carpeta privada de instalación exportada.');
const config=dotenv.parse(readFileSync(path.join(root,'backend/.env'))),url=new URL(config.DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('La prueba de restauración sólo opera sobre PostgreSQL local');
const database=`esbozo_restore_test_${Date.now()}_${randomBytes(3).toString('hex')}`,adminEnv={...process.env,PGUSER:process.env.PGUSER??userInfo().username,PGPORT:url.port||'5432'};
const testing=path.join(root,'data/testing/installation');mkdirSync(testing,{recursive:true});const envfile=path.join(testing,database+'.env');let owned=false,check,verified=false;
function admin(command,args){const r=spawnSync(postgresTool(command),args,{env:adminEnv,encoding:'utf8'});if(r.error)throw r.error;if(r.status!==0)throw Error(r.stderr);return r.stdout;}
try{
 admin('createdb',['--owner='+decodeURIComponent(url.username),database]);owned=true;
 const target=new URL(config.DATABASE_URL);target.pathname='/'+database;writeFileSync(envfile,`DATABASE_URL=${JSON.stringify(target.href)}\n`,{mode:0o600});
 const restore=spawnSync(process.execPath,[path.join(root,'backend/scripts/restore-installation.mjs'),'--apply','--dump',path.join(folder,'esbozo.dump'),'--env-file',envfile],{encoding:'utf8'});if(restore.status!==0)throw Error(restore.stderr);
 check=new pg.Pool({connectionString:target.href});const counts=(await check.query('SELECT (SELECT count(*) FROM app_user) AS accounts,(SELECT count(*) FROM projection) AS projections,(SELECT count(*) FROM asset) AS assets,(SELECT count(*) FROM stage_review) AS reviews,(SELECT count(*) FROM lote_candidate) AS candidates')).rows[0];
 const report=JSON.parse(readFileSync(path.join(folder,'VERIFICACION.json')));for(const key of Object.keys(counts))if(counts[key]!==report.inventory[key])throw Error('Conteo restaurado distinto: '+key);
 let images=0;for(const row of (await check.query('SELECT a.sha256,b.data FROM asset a JOIN asset_blob b ON b.asset_id=a.id')).rows){if(createHash('sha256').update(row.data).digest('hex')!==row.sha256)throw Error('SHA de imagen restaurada inválido');images++;}
 if((await check.query("SELECT value FROM system_metadata WHERE key='schema_version'")).rows[0].value!==report.schemaVersion)throw Error('Esquema restaurado distinto');
 // Un segundo intento debe bloquearse sin modificar el destino que acaba de restaurarse.
 const repeat=spawnSync(process.execPath,[path.join(root,'backend/scripts/restore-installation.mjs'),'--apply','--dump',path.join(folder,'esbozo.dump'),'--env-file',envfile],{encoding:'utf8'});if(repeat.status===0||!repeat.stderr.includes('contiene objetos'))throw Error('Falló la protección de base existente');
 verified=true;report.restoreVerified=true;report.restoreVerifiedAt=new Date().toISOString();writeFileSync(path.join(folder,'VERIFICACION.json'),JSON.stringify(report,null,2),{mode:0o600});
 writeFileSync(path.join(testing,'resultado.json'),JSON.stringify({dump:report.dump,verified,counts,imagesVerified:images,existingDatabaseGuardVerified:true,temporaryDatabase:database,at:new Date().toISOString()},null,2));console.log(JSON.stringify({verified,counts,imagesVerified:images,existingDatabaseGuardVerified:true}));
}finally{await check?.end();if(owned)admin('dropdb',[database]);rmSync(envfile,{force:true});}
