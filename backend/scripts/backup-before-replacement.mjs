import {fileURLToPath} from 'node:url';
import {postgresTool} from './postgres-tools.mjs';
import {readFileSync,mkdirSync,writeFileSync,chmodSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';
const root=new URL('../../',import.meta.url),folder=new URL(`data/backups/pre-flux-${new Date().toISOString().replaceAll(':','-')}/`,root);mkdirSync(folder,{recursive:true,mode:0o700});
const configFiles=[['primary',new URL('backend/.env',root)],['test',new URL('data/testing/p00/backend.env',root)]];
const reports=[];
for(const [name,file] of configFiles){const config=dotenv.parse(readFileSync(file));const url=new URL(config.DATABASE_URL),database=decodeURIComponent(url.pathname.slice(1));if(name==='test'&&!database.startsWith('esbozo_test_'))throw Error('Copia incorrecta');
 const pool=new pg.Pool({connectionString:config.DATABASE_URL});try{
 const inventory={database,tables:{},assets:[]};for(const {tablename} of (await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows)inventory.tables[tablename]=Number((await pool.query(`SELECT count(*) AS n FROM "${tablename}"`)).rows[0].n);
 inventory.assets=(await pool.query('SELECT a.id,a.sha256,b.data FROM asset a JOIN asset_blob b ON b.asset_id=a.id ORDER BY a.id')).rows.map(row=>({id:row.id,sha256:row.sha256,verified:createHash('sha256').update(row.data).digest('hex')===row.sha256}));
 const output=new URL(`${name}.dump`,folder),env={...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:database};
 const dump=spawnSync(postgresTool('pg_dump'),['--format=custom','--file='+fileURLToPath(output)],{env,encoding:'utf8'});if(dump.status!==0)throw Error(dump.stderr);chmodSync(output,0o600);
 const verify=spawnSync(postgresTool('pg_restore'),['--list',fileURLToPath(output)],{encoding:'utf8'});if(verify.status!==0||!verify.stdout.includes('TABLE DATA public asset_blob'))throw Error('Respaldo ilegible');writeFileSync(new URL(`${name}-inventory.json`,folder),JSON.stringify(inventory,null,2),{mode:0o600});reports.push({name,database,assets:inventory.assets.length,verified:inventory.assets.every(a=>a.verified)});
 }finally{await pool.end();}}
writeFileSync(new URL('data/testing/importacion-final/backup.json',root),JSON.stringify({folder:folder.pathname,reports},null,2));console.log(JSON.stringify({folder:folder.pathname,reports}));
