import {fileURLToPath} from 'node:url';
import {postgresTool} from './postgres-tools.mjs';
import {readFileSync,writeFileSync,mkdirSync,chmodSync,statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';
if(!process.argv.includes('--apply'))throw Error('Usá --apply para exportar una copia privada de instalación. No modifica la base de origen.');
const root=new URL('../../',import.meta.url),config=dotenv.parse(readFileSync(new URL('backend/.env',root))),url=new URL(config.DATABASE_URL);
const pool=new pg.Pool({connectionString:config.DATABASE_URL});

const folder=new URL(`data/delivery/installation-${new Date().toISOString().replaceAll(':','-')}/`,root),dump=new URL('esbozo.dump',folder);
let temporaryDatabase,ownsTemporaryDatabase=false;
function command(binary,args,database){const env={...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:database};const result=spawnSync(postgresTool(binary),args,{env,encoding:'utf8'});if(result.error)throw result.error;if(result.status!==0)throw Error(result.stderr);return result.stdout;}
try{
 const model=(await pool.query('SELECT base_model_name FROM generation_run')).rows;const ready=(await pool.query("SELECT name FROM schema_migration WHERE name='007_reference_identity.sql'")).rowCount;
 if(!ready||!model.length||model.some(r=>!/FLUX/.test(r.base_model_name)))throw Error('El destino de exportación no corresponde a la instalación actualizada.');
 const schemaVersion=(await pool.query("SELECT value FROM system_metadata WHERE key='schema_version'")).rows[0].value;
 const inventory=(await pool.query("SELECT (SELECT count(*) FROM app_user) AS accounts,(SELECT count(*) FROM sketch) AS sketches,(SELECT count(*) FROM lote) AS lots,(SELECT count(*) FROM projection) AS projections,(SELECT count(*) FROM asset) AS assets,(SELECT count(*) FROM stage_review) AS reviews,(SELECT count(*) FROM lote_candidate) AS candidates")).rows[0];
 mkdirSync(folder,{recursive:true,mode:0o700});command('pg_dump',['--format=custom','--no-owner','--no-privileges','--file='+fileURLToPath(dump)],decodeURIComponent(url.pathname.slice(1)));chmodSync(dump,0o600);
 const toc=command('pg_restore',['--list',fileURLToPath(dump)]);for(const table of ['asset_blob','app_user','source_package','production_stage'])if(!toc.includes(`TABLE DATA public ${table}`))throw Error('Respaldo incompleto: '+table);
 let restoreVerified=false;
 if((await pool.query('SELECT rolcreatedb FROM pg_roles WHERE rolname=current_user')).rows[0].rolcreatedb){
  temporaryDatabase=`esbozo_restore_test_${Date.now()}_${randomBytes(3).toString('hex')}`;
  await pool.query(`CREATE DATABASE ${temporaryDatabase}`);ownsTemporaryDatabase=true;command('pg_restore',['--exit-on-error','--no-owner','--no-privileges','--dbname='+temporaryDatabase,fileURLToPath(dump)],temporaryDatabase);
  const checkUrl=new URL(config.DATABASE_URL);checkUrl.pathname='/'+temporaryDatabase;const check=new pg.Pool({connectionString:checkUrl.href});
  try{const count=(await check.query('SELECT count(*) FROM projection')).rows[0].count;if(count!==inventory.projections)throw Error('La restauración no conserva todas las proyecciones');
   for(const row of (await check.query('SELECT a.sha256,b.data FROM asset a JOIN asset_blob b ON b.asset_id=a.id')).rows)if(createHash('sha256').update(row.data).digest('hex')!==row.sha256)throw Error('Imagen restaurada con hash inválido');restoreVerified=true;
  }finally{await check.end();}
 }
 const report={database:decodeURIComponent(url.pathname.slice(1)),dump:fileURLToPath(dump),bytes:statSync(dump).size,sha256:createHash('sha256').update(readFileSync(dump)).digest('hex'),inventory,schemaVersion,tocVerified:true,restoreVerified,containsAccounts:true,containsConnectionCredentials:false,at:new Date().toISOString()};
 writeFileSync(new URL('VERIFICACION.json',folder),JSON.stringify(report,null,2),{mode:0o600});console.log(JSON.stringify(report));
}finally{if(temporaryDatabase&&ownsTemporaryDatabase)await pool.query(`DROP DATABASE ${temporaryDatabase}`).catch(()=>undefined);await pool.end();}
