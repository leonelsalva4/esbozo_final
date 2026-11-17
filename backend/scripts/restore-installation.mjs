import {postgresTool} from './postgres-tools.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import pg from 'pg';
import dotenv from 'dotenv';
const value=name=>{const index=process.argv.indexOf('--'+name);return index<0?null:process.argv[index+1];};
if(!process.argv.includes('--apply')||!value('dump'))throw Error('Usá --apply --dump ruta/esbozo.dump y opcionalmente --env-file ruta/backend.env');
const dump=resolve(value('dump')),report=JSON.parse(readFileSync(join(dirname(dump),'VERIFICACION.json'))),config=dotenv.parse(readFileSync(value('env-file')??new URL('../.env',import.meta.url))),url=new URL(config.DATABASE_URL);
if(!report.tocVerified||createHash('sha256').update(readFileSync(dump)).digest('hex')!==report.sha256)throw Error('La copia no coincide con su verificación');
const pool=new pg.Pool({connectionString:config.DATABASE_URL});
try{
 const count=(await pool.query("SELECT (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_%')+(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public')+(SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public') AS objects")).rows[0].objects;
 if(Number(count)!==0)throw Error('La base de destino contiene objetos. La restauración exige una base nueva y vacía; no se modificó el destino.');
 const env={...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password)};
 const result=spawnSync(postgresTool('pg_restore'),['--exit-on-error','--single-transaction','--no-owner','--no-privileges','--dbname='+decodeURIComponent(url.pathname.slice(1)),dump],{env,encoding:'utf8'});
 if(result.error)throw result.error;if(result.status!==0)throw Error(result.stderr);
 console.log(JSON.stringify({database:decodeURIComponent(url.pathname.slice(1)),restored:true,atomic:true}));
}finally{await pool.end();}
