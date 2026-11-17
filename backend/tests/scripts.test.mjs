import {before,after,test} from 'node:test';
import {postgresTool} from '../scripts/postgres-tools.mjs';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,statSync,existsSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {userInfo} from 'node:os';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';
const root=fileURLToPath(new URL('../../',import.meta.url)),backend=path.join(root,'backend');
const source=dotenv.parse(readFileSync(path.join(root,'data/testing/p00/backend.env'))),url=new URL(source.DATABASE_URL);
assert(url.pathname.startsWith('/esbozo_test_'));
const database=`esbozo_test_validation_${process.pid}_${Date.now()}`,fixture=path.join(root,'data/testing/validation-scripts-'+database),bin=path.dirname(postgresTool('pg_restore'));
const adminEnv={...process.env,PGUSER:userInfo().username,PGPORT:url.port||'5432'};
let owned=false,pool,exportFolder;
function admin(name,args){const r=spawnSync(path.join(bin,name),args,{env:adminEnv,encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
function cli(file,args=[],extra={}){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[file,...args],{cwd:backend,env:{...process.env,...source,DATABASE_URL:url.href,NODE_OPTIONS:`--require=${path.join(backend,'tests/script-isolation.cjs')}`,ESBOZO_SCRIPT_FIXTURE:fixture,...extra},stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);child.once('error',reject);child.once('exit',status=>{if(status!==0)writeFileSync(path.join(fixture,`failure-${Date.now()}-${path.basename(file)}.json`),JSON.stringify({file,args,status,stdout,stderr},null,2));resolve({status,stdout,stderr});});});}
async function clearTarget(){await pool.query('TRUNCATE source_package CASCADE');await pool.query('TRUNCATE provenance_resource CASCADE');await pool.query('DELETE FROM generation_run');await pool.query('DELETE FROM asset_blob WHERE asset_id NOT IN (SELECT asset_id FROM sketch)');await pool.query('DELETE FROM asset WHERE id NOT IN (SELECT asset_id FROM sketch)');}
function ok(result){assert.equal(result.status,0,result.stderr);return result;}
function missingFiles(folder){
 const directory=path.join(root,'data/imports',folder);
 const index=JSON.parse(readFileSync(path.join(directory,'indice.json')));
 return [...new Set(index.archivos.map(entry=>entry.ruta_zip))].filter(file=>!existsSync(path.join(directory,file)));
}
const missingOriginal=missingFiles('resultados-2026-10-23');
const missingComplete=missingFiles('desarrollo-completo-2026-10-23');
const originalArchive={skip:missingOriginal.length?`Archivo privado incompleto: ${missingOriginal.length} recursos ausentes; no acredita validación integral`:false};
const completeArchive={skip:missingComplete.length?`Archivo privado incompleto: ${missingComplete.length} recursos ausentes; se conserva la prueba para una copia completa`:false};

before(async()=>{
 mkdirSync(fixture,{recursive:true,mode:0o700});url.pathname='/'+database;
 writeFileSync(path.join(fixture,'backend.env'),Object.entries({...source,DATABASE_URL:url.href}).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join('\n'),{mode:0o600});
 admin('createdb',['--owner='+decodeURIComponent(url.username),database]);owned=true;
 const delivery=path.join(root,'data/delivery'),latest=readdirSync(delivery).filter(f=>f.startsWith('installation-')).sort().at(-1);assert(latest);
 const restore=spawnSync(path.join(bin,'pg_restore'),['--exit-on-error','--no-owner','--no-privileges','--dbname='+database,path.join(delivery,latest,'esbozo.dump')],{env:{...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password)},encoding:'utf8'});assert.equal(restore.status,0,restore.stderr);
 pool=new pg.Pool({connectionString:url.href});
 mkdirSync(path.join(fixture,'data/testing/importacion-final'),{recursive:true});
 writeFileSync(path.join(fixture,'data/testing/importacion-final/validacion.json'),readFileSync(path.join(root,'data/testing/importacion-final/validacion.json')));
});
after(async()=>{await pool?.end();if(owned)admin('dropdb',[database]);});
test('PF-10: respaldo privado se puede leer y corresponde únicamente a la base descartable',async()=>{
 const result=ok(await cli('scripts/backup-before-replacement.mjs'));const report=JSON.parse(result.stdout);assert.equal(report.reports.length,2);assert(report.reports.every(r=>r.database===database&&r.verified));
 const backup=JSON.parse(readFileSync(path.join(fixture,'data/testing/importacion-final/backup.json')));assert(backup.reports.every(r=>r.verified));
});
test('PF-10: migración idempotente, checksum alterado revierte y una migración nueva se aplica',async()=>{
 ok(await cli('scripts/migrate.mjs',['--test']));const saved=(await pool.query("SELECT * FROM schema_migration WHERE name='007_reference_identity.sql'")).rows[0];assert(saved);
 await pool.query("UPDATE schema_migration SET sha256='alterado' WHERE name=$1",[saved.name]);const failed=await cli('scripts/migrate.mjs',['--test']);assert.notEqual(failed.status,0);assert(failed.stderr.includes('Cambió una migración'));await pool.query('UPDATE schema_migration SET sha256=$2 WHERE name=$1',[saved.name,saved.sha256]);
 await pool.query('DROP TABLE reference_identity');await pool.query('DELETE FROM schema_migration WHERE name=$1',[saved.name]);ok(await cli('scripts/migrate.mjs',['--test']));assert.equal((await pool.query("SELECT to_regclass('reference_identity') AS name")).rows[0].name,'reference_identity');
 assert.notEqual((await cli('scripts/migrate.mjs',['--test','--through=xx'])).status,0);
});
test('PF-10: importación rechaza un documento alterado después de validar y revierte íntegramente',async()=>{
 await clearTarget();
 const index=JSON.parse(readFileSync(path.join(root,'data/imports/resultados-2026-10-23/indice.json')));
 const entry=index.archivos.find(e=>e.ruta_zip.includes('17715b0c44a74aded63ffcff9561476067b2036923ad023ede87cedac6865d0c'));
 assert(entry);const file=path.join(root,'data/imports/resultados-2026-10-23',entry.ruta_zip);writeFileSync(path.join(fixture,'corrupt-resource'),'{}');
 try{const result=await cli('scripts/import-results.mjs',['--test'],{ESBOZO_SCRIPT_CORRUPT:file});assert.notEqual(result.status,0,'Debe rechazar bytes que ya no coinciden con el manifiesto');assert.equal((await pool.query('SELECT count(*) FROM source_package')).rows[0].count,'0');assert.equal((await pool.query('SELECT count(*) FROM projection')).rows[0].count,'0');assert.equal((await pool.query('SELECT count(*) FROM asset')).rows[0].count,'2');}
 finally{await clearTarget();}
});
test('PF-10: importación inicial, idempotencia y preservación de cuentas y bocetos',async()=>{
 await clearTarget();
 const before=(await pool.query('SELECT id,username FROM app_user ORDER BY id')).rows;
 const result=ok(await cli('scripts/import-results.mjs',['--test']));assert.equal(JSON.parse(result.stdout).projections,8);
 assert.deepEqual((await pool.query('SELECT id,username FROM app_user ORDER BY id')).rows,before);assert.equal((await pool.query('SELECT count(*) FROM sketch')).rows[0].count,'2');assert.equal((await pool.query('SELECT count(*) FROM stage_review')).rows[0].count,'0');
 const reused=ok(await cli('scripts/import-results.mjs',['--test']));assert.equal(JSON.parse(reused.stdout).reused,true);assert.equal((await pool.query('SELECT count(*) FROM projection')).rows[0].count,'8');
});
test('PF-06/PF-10: enriquecimiento conserva relaciones verificables y no inventa decisiones',async()=>{
 ok(await cli('scripts/enrich-results.mjs',['--test']));assert.equal((await pool.query('SELECT count(*) FROM asset')).rows[0].count,'76');assert.equal((await pool.query('SELECT count(*) FROM stage_review')).rows[0].count,'0');assert.equal((await pool.query('SELECT count(*) FROM lote_candidate')).rows[0].count,'0');assert(Number((await pool.query('SELECT count(*) FROM production_operation')).rows[0].count)>0);
 const refs=(await pool.query('SELECT * FROM reference_identity')).rows;assert(refs.some(r=>r.inventory_documented==='582'));
});
test('PF-10: un paquete distinto no sustituye resultados reales existentes',async()=>{
 const indexPath=path.join(root,'data/imports/resultados-2026-10-23/indice.json');const index=JSON.parse(readFileSync(indexPath));index.fecha_exportacion='prueba-aislada';writeFileSync(path.join(fixture,'corrupt-resource'),JSON.stringify(index));
 const snapshot=(await pool.query('SELECT id FROM projection ORDER BY id')).rows;
 const result=await cli('scripts/import-results.mjs',['--test'],{ESBOZO_SCRIPT_CORRUPT:indexPath});assert.notEqual(result.status,0);assert(result.stderr.includes('Hay resultados reales'));assert.deepEqual((await pool.query('SELECT id FROM projection ORDER BY id')).rows,snapshot);
});
test('PF-01/PF-14: aprovisionamiento inicial genera hash y protege administración ya existente',async()=>{
 const refused=await cli('scripts/provision-admin.mjs',['--test','--username=validation.admin','--display-name=Administración de prueba']);assert.notEqual(refused.status,0);assert(refused.stderr.includes('administración activa'));
 await pool.query("UPDATE app_user SET is_active=false WHERE role='admin'");
 const created=ok(await cli('scripts/provision-admin.mjs',['--test','--username=validation.admin','--display-name=Administración de prueba']));const secret=JSON.parse(created.stdout);assert(secret.credential.length>=24);
 const row=(await pool.query("SELECT * FROM app_user WHERE username='validation.admin'")).rows[0];assert.equal(row.role,'admin');assert(!row.password_hash.includes(secret.credential));
});
test('PF-06/PF-10: controles del conjunto activo y recursos recuperados coinciden con sus hashes',async()=>{
 ok(await cli('scripts/check-active-pipeline.mjs',['--test']));
 const user=(await pool.query("SELECT id FROM app_user WHERE role='institucional' LIMIT 1")).rows[0];assert(user);
 await pool.query("INSERT INTO lote_obtencion(lote_id,user_id,verification) SELECT id,$1,'{}' FROM lote ON CONFLICT DO NOTHING",[user.id]);
 const checked=ok(await cli('scripts/check-import.mjs',['--primary']));assert.equal(JSON.parse(checked.stdout).verifiedImages,76);
});
test('PF-13: diez repeticiones de API sólo lectura sin alterar revisiones o candidatas',async()=>{
 const result=ok(await cli('scripts/benchmark-readonly.mjs'));const report=JSON.parse(result.stdout);assert.equal(report.writes,0);assert.equal(report.groups.length,8);assert(report.groups.every(g=>g.repetitions===10));assert.equal((await pool.query('SELECT count(*) FROM stage_review')).rows[0].count,'0');
});
test('PF-10: exportación, restauración real y rechazo de un destino con datos',async()=>{
 const exported=ok(await cli('scripts/export-installation.mjs',['--apply']));const result=JSON.parse(exported.stdout);exportFolder=path.dirname(result.dump).replace(path.join(root,'data/delivery'),path.join(fixture,'data/delivery'));assert(result.tocVerified);assert(statSync(path.join(exportFolder,'esbozo.dump')).size>0);
 const verified=ok(await cli('scripts/verify-installation.mjs',[exportFolder]));const report=JSON.parse(verified.stdout);assert(report.verified);assert.equal(report.imagesVerified,76);assert(report.existingDatabaseGuardVerified);
});
test('PF-10: validador del paquete completo comprueba todos los archivos',originalArchive,async()=>{
 const dir=path.join(root,'data/imports/resultados-2026-10-23');const checked=ok(await cli('scripts/validate-package.mjs',[dir]));const report=JSON.parse(checked.stdout);assert.equal(report.uniqueFiles,5335);assert.equal(report.errors.length,0);

});

test('PF-10: validador acepta una fixture de cuatro finales reales y rechaza bytes alterados',async()=>{
 const original=path.join(root,'data/imports/resultados-2026-10-23');
 const index=JSON.parse(readFileSync(path.join(original,'indice.json')));
 const directory=path.join(fixture,'validator-package');mkdirSync(directory,{recursive:true});
 const lot=index.lotes[0];
 const alternatives=lot.alternativas.map(alternative=>({...alternative,etapas:{final:alternative.etapas.final}}));
 const paths=alternatives.map(a=>a.etapas.final.archivo);
 const document=index.archivos.find(e=>e.ruta_zip.endsWith('.json'));
 paths.push(document.ruta_zip);
 const entries=[...new Map(index.archivos.filter(e=>paths.includes(e.ruta_zip)).map(e=>[e.ruta_zip,e])).values()];
 for(const entry of entries){const dest=path.join(directory,entry.ruta_zip);mkdirSync(path.dirname(dest),{recursive:true});copyFileSync(path.join(original,entry.ruta_zip),dest);}
 for(const alternative of alternatives){const relative=`finales/${lot.boceto}/${alternative.posicion_definitiva}_${alternative.etiqueta_rama}.png`;mkdirSync(path.dirname(path.join(directory,relative)),{recursive:true});copyFileSync(path.join(original,relative),path.join(directory,relative));}
 writeFileSync(path.join(directory,'indice.json'),JSON.stringify({archivos:entries,lotes:[{...lot,alternativas:alternatives}]}));
 const checked=JSON.parse(ok(await cli('scripts/validate-package.mjs',[directory])).stdout);assert.equal(checked.uniqueFiles,5);assert.equal(checked.errors.length,0);assert.equal(checked.lots[0].alternatives,4);
 writeFileSync(path.join(directory,document.ruta_zip),'{}');
 const bad=await cli('scripts/validate-package.mjs',[directory]);assert.notEqual(bad.status,0);assert(JSON.parse(bad.stdout).errors.some(e=>e.path===document.ruta_zip&&e.error.includes('Hash')));
});
test('PF-06/PF-10: complemento incorpora 21 etapas y 16 hitos con guías, preserva decisiones y es idempotente',completeArchive,async()=>{
 const before=(await pool.query('SELECT id,asset_id FROM projection ORDER BY id')).rows;
 const result=ok(await cli('scripts/import-complete-results.mjs',['--test']));const report=JSON.parse(result.stdout);
 assert.equal(report.stages,21);assert.equal(report.milestones,16);assert(report.guides>0);assert(report.finalsPreserved&&report.accountsAndDecisionsPreserved);
 assert.equal((await pool.query("SELECT count(*) FROM production_stage WHERE asset_id IS NOT NULL")).rows[0].count,'21');
 const pilot=(await pool.query("SELECT * FROM production_stage WHERE projection_id='PRJ-1663-L01-A01' AND stage_key='figures'")).rows[0];
 assert.equal(pilot.applicability,'undocumented');assert.equal(pilot.asset_id,null);assert.equal(pilot.documented_images.length,3);
 assert.equal((await pool.query('SELECT count(*) FROM stage_review')).rows[0].count,'0');
 assert.deepEqual((await pool.query('SELECT id,asset_id FROM projection ORDER BY id')).rows,before);
 const assets=(await pool.query('SELECT count(*) FROM asset')).rows[0].count;
 ok(await cli('scripts/import-complete-results.mjs',['--test']));assert.equal((await pool.query('SELECT count(*) FROM asset')).rows[0].count,assets);
});
test('PF-10: complemento rechaza una imagen alterada antes de escribir',async()=>{
 const indexPath=path.join(root,'data/imports/desarrollo-completo-2026-10-23/indice.json');
 const index=JSON.parse(readFileSync(indexPath));const e=index.archivos.find(e=>e.ruta_zip.endsWith('.png'));
 writeFileSync(path.join(fixture,'corrupt-resource'),'alterado');
 const count=(await pool.query('SELECT count(*) FROM asset')).rows[0].count;
 const result=await cli('scripts/import-complete-results.mjs',['--test'],{ESBOZO_SCRIPT_CORRUPT:path.join(path.dirname(indexPath),e.ruta_zip)});
 assert.notEqual(result.status,0);assert(result.stderr.includes('Integridad inválida'));assert.equal((await pool.query('SELECT count(*) FROM asset')).rows[0].count,count);
});

test('PF-06/PF-10: reimportar conserva una asignación de guía posterior al paquete y su decisión humana',completeArchive,async()=>{
 const id='PRJ-1663-L01-A01',asset='IMG-8bfe374ce8d7fae0f713bcfbb80d3e28777043b693ff916f9d184e09f9495c83';
 const user=(await pool.query('SELECT id FROM app_user ORDER BY id LIMIT 1')).rows[0];
 await pool.query("UPDATE production_stage SET asset_id=$2,applicability='applicable',source_status='user_confirmed_guide' WHERE projection_id=$1 AND stage_key='figures'",[id,asset]);
 await pool.query("INSERT INTO stage_review(projection_id,stage_key,user_id,asset_sha256,stage_fingerprint) VALUES($1,'figures',$2,$3,$4)",[id,user.id,asset.slice(4),'0'.repeat(64)]);
 const before=(await pool.query('SELECT * FROM stage_review WHERE projection_id=$1',[id])).rows;
 const result=ok(await cli('scripts/import-complete-results.mjs',['--test']));assert.equal(JSON.parse(result.stdout).stages,22);
 const stage=(await pool.query("SELECT * FROM production_stage WHERE projection_id=$1 AND stage_key='figures'",[id])).rows[0];
 assert.equal(stage.asset_id,asset);assert.equal(stage.source_status,'user_confirmed_guide');assert.deepEqual((await pool.query('SELECT * FROM stage_review WHERE projection_id=$1',[id])).rows,before);
});
