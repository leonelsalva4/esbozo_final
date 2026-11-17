import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,basename,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import pg from 'pg';
import dotenv from 'dotenv';
const require=createRequire(import.meta.url),root=new URL('../../',import.meta.url),test=process.argv.includes('--test');
if(!test&&!process.argv.includes('--apply'))throw Error('Elegí --test o --apply');
const config=dotenv.parse(readFileSync(new URL(test?'data/testing/p00/backend.env':'backend/.env',root)));
const database=new URL(config.DATABASE_URL).pathname.slice(1);if(test&&!database.startsWith('esbozo_test_'))throw Error('Sólo copia de pruebas');
const dir=fileURLToPath(new URL('data/imports/resultados-2026-10-23/',root)),indexBytes=readFileSync(resolve(dir,'indice.json')),index=JSON.parse(indexBytes);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),packageId='PKG-'+hash(indexBytes);
const entries=new Map(index.archivos.map(e=>[e.sha256_calculado_exportacion,e]));
const report=JSON.parse(readFileSync(new URL(`data/testing/importacion-final/import-${test?'test':'primary'}.json`,root)));
if(report.packageId!==packageId||report.database!==database)throw Error('El destino no coincide con la importación comprobada');
const excluded=new Set(report.excluded),pool=new pg.Pool({connectionString:config.DATABASE_URL}),client=await pool.connect();
const safe=path=>{const result=resolve(dir,path);if(relative(dir,result).startsWith('..'))throw Error('Ruta inválida');return result;};
const documents=[],identities=new Map();
function collectIdentities(value,documentSha){
 if(!value||typeof value!=='object')return;
 const title=value.source_title??value.work??value.title,inventory=value.inventory_of_work??value.inventory_id??value.inventory;
 if(typeof title==='string'&&typeof inventory==='string')for(const field of ['pipeline_input_sha256','output_sha256','sha256','source_sha256','HQ_source_sha256','native_sRGB_sha256','native_AdobeRGB_sha256']){const target=value[field];if(typeof target==='string'&&/^[a-f0-9]{64}$/.test(target)){if(!identities.has(target))identities.set(target,[]);identities.get(target).push({title,inventory,documentSha,field});}}
 for(const child of Object.values(value))if(child&&typeof child==='object')collectIdentities(child,documentSha);
}
for(const [sha,e] of entries)if(!excluded.has(sha)&&e.ruta_zip.endsWith('.json')){
 const record=JSON.parse(readFileSync(safe(e.ruta_zip),'utf8'));
 collectIdentities(record,sha);
 if(record&&typeof record==='object'&&!Array.isArray(record)&&record.parameters&&record.inference_executed!==false&&record.composite?.sha256)
  documents.push({sha,record});
}
const outputs=new Map();for(const doc of documents){const sha=doc.record.composite.sha256;if(!outputs.has(sha))outputs.set(sha,[]);outputs.get(sha).push(doc);}
async function image(sha,kind='production_stage'){
 if(excluded.has(sha)||!entries.has(sha))return null;
 const prior=(await client.query('SELECT asset_id FROM provenance_resource WHERE sha256=$1',[sha])).rows[0];if(prior?.asset_id)return prior.asset_id;
 const entry=entries.get(sha),bytes=readFileSync(safe(entry.ruta_zip));if(hash(bytes)!==sha)throw Error('Recurso cambió después de validar');
 const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),jpg=bytes[0]===255&&bytes[1]===216;
 if(!png&&!jpg)return null;
 const decoded=png?require('pngjs').PNG.sync.read(bytes):require('jpeg-js').decode(bytes);
 if(decoded.width*decoded.height>64e6)throw Error('Imagen demasiado grande');
 const id='IMG-'+sha;
 await client.query('INSERT INTO asset(id,kind,filename,mime_type,width,height,byte_size,sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING',[id,kind,basename(entry.ruta_zip),png?'image/png':'image/jpeg',decoded.width,decoded.height,bytes.length,sha]);
 await client.query('INSERT INTO asset_blob(asset_id,data) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,bytes]);
 await client.query('INSERT INTO provenance_resource(sha256,byte_size,mime_type,asset_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[sha,bytes.length,png?'image/png':'image/jpeg',id]);return id;
}
function inputs(value,path='.inputs',role='input',result=[]){
 if(typeof value==='string'&&/^[a-f0-9]{64}$/.test(value))result.push({sha:value,path,role});
 else if(value&&typeof value==='object')for(const [key,item]of Object.entries(value))inputs(item,`${path}.${key}`,path==='.inputs'?key:role,result);
 return result;
}
const counts={operations:0,resources:0,guides:0,references:0};
try{
 await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(723184601)');
 if(!(await client.query('SELECT id FROM source_package WHERE id=$1',[packageId])).rowCount)throw Error('Paquete no instalado');
 await client.query('SELECT id FROM lote WHERE package_id=$1 ORDER BY id FOR UPDATE',[packageId]);
 for(const link of index.relaciones_por_hash_documentado)await client.query('UPDATE provenance_link SET package_status=$4 WHERE source_sha256=$1 AND field_path=$2 AND target_sha256=$3',[basename(link.registro).split('.')[0],link.campo,link.sha256_previamente_registrado,link.estado]);
 for(const lot of index.lotes)for(const alt of lot.alternativas){
  const projectionId=`PRJ-${lot.boceto}-L01-A${String(alt.posicion_definitiva).padStart(2,'0')}`,seen=new Set();
  await client.query('DELETE FROM stage_reference WHERE projection_id=$1',[projectionId]);
  await client.query('DELETE FROM stage_guide WHERE projection_id=$1',[projectionId]);
  const stageHashes=new Map();
  for(const [source,key]of [['base','base'],['figuras','figures'],['acabado','finish']])if(alt.etapas[source]?.archivo)stageHashes.set(basename(alt.etapas[source].archivo).split('.')[0],key);
  async function visit(sha,stage){
   const key=sha+':'+(stage??'');if(seen.has(key))return;seen.add(key);
   for(const doc of outputs.get(sha)??[]){
    if(excluded.has(doc.sha))continue;
    const opId=`OP-${projectionId}-${doc.sha}`;
    const exists=(await client.query('SELECT sha256 FROM provenance_resource WHERE sha256=$1',[doc.sha])).rowCount;if(!exists)continue;
    await client.query("INSERT INTO production_operation(id,projection_id,source_sha256,stage_key,adoption,parameters) VALUES($1,$2,$3,$4,'documented_relation',$5) ON CONFLICT(projection_id,source_sha256) DO UPDATE SET stage_key=EXCLUDED.stage_key,adoption=EXCLUDED.adoption",[opId,projectionId,doc.sha,stage,JSON.stringify(doc.record)]);counts.operations++;
    const list=inputs(doc.record.inputs);
    if(doc.record.parent?.sha256)list.push({sha:doc.record.parent.sha256,path:'.parent.sha256',role:'parent'});
    for(const input of list){
     if(excluded.has(input.sha))continue;
     const reference=/reference|referencia/i.test(input.role),guide=/guide|guia/i.test(input.role);
     const assetId=await image(input.sha,reference?'reference_fragment':guide?'interpretive_guide':'production_stage');
     const resource=(await client.query('SELECT sha256 FROM provenance_resource WHERE sha256=$1',[input.sha])).rows[0];
     await client.query('INSERT INTO operation_resource(operation_id,field_path,role_documented,sha256,resource_sha256) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[opId,input.path,input.role,input.sha,resource?.sha256??null]);counts.resources++;
     if(stage&&assetId&&reference){await client.query('INSERT INTO stage_reference(projection_id,stage_key,resource_sha256,provenance) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[projectionId,stage,input.sha,`Rol explícito ${input.path} en registro ${doc.sha}; inventario no inferido del nombre.`]);counts.references++;}
     if(stage&&assetId&&guide){const guideId=`GUIDE-${lot.boceto}-${input.sha}`;await client.query('INSERT INTO interpretive_guide(id,sketch_id,asset_id,provenance,source_sha256) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[guideId,lot.boceto,assetId,`Rol explícito ${input.path}; sector y versión no inferidos.`,doc.sha]);await client.query('INSERT INTO stage_guide(projection_id,stage_key,guide_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[projectionId,stage,guideId]);counts.guides++;}
     // Sólo el padre/base documentado establece continuidad; referencias no se adoptan como padres.
     if(input.role==='parent'||input.role==='base')await visit(input.sha,stageHashes.get(input.sha)??null);
    }
   }
  }
  // Final primero: intermedios sin correspondencia explícita conservan stage_key NULL.
  const finalSha=basename(alt.etapas.final.archivo).split('.')[0];
  await visit(finalSha,alt.acabado_y_final_mismo_archivo?'finish':null);
  for(const [source,stage]of [['base','base'],['figuras','figures'],['acabado','finish']])if(alt.etapas[source]?.archivo)await visit(basename(alt.etapas[source].archivo).split('.')[0],stage);
 }
 const imported=new Set((await client.query('SELECT sha256 FROM provenance_resource')).rows.map(r=>r.sha256));
 for(const e of index.archivos)if(imported.has(e.sha256_calculado_exportacion)&&!excluded.has(e.sha256_calculado_exportacion))await client.query('INSERT INTO provenance_origin(package_id,resource_sha256,original_path,package_path) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[packageId,e.sha256_calculado_exportacion,e.ruta_original,e.ruta_zip]);
 await client.query('UPDATE provenance_link SET available_in_app=true,target_resource_sha256=target_sha256 WHERE target_sha256 IN (SELECT sha256 FROM provenance_resource)');
 for(const [resource,items] of identities){
  const values=new Set(items.map(item=>JSON.stringify([item.title.normalize('NFC').toLowerCase(),item.inventory])));
  if(values.size!==1)continue;
  const item=items[0];
  if(!(await client.query('SELECT sha256 FROM provenance_resource WHERE sha256=$1 AND asset_id IS NOT NULL',[resource])).rowCount)continue;
  if(!(await client.query('SELECT sha256 FROM provenance_resource WHERE sha256=$1',[item.documentSha])).rowCount)continue;
  await client.query('INSERT INTO reference_identity(resource_sha256,source_sha256,field_path,title_documented,inventory_documented) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[resource,item.documentSha,item.field,item.title,item.inventory]);
  await client.query("UPDATE stage_reference SET title_documented=$2,inventory_documented=$3,provenance=CASE WHEN strpos(COALESCE(provenance,''),$4)>0 THEN provenance ELSE concat_ws(' ',provenance,$5::text) END WHERE resource_sha256=$1",[resource,item.title,item.inventory,item.documentSha,`Identidad de la obra según campo ${item.field} del registro ${item.documentSha}. No acredita uso en adaptación.`]);
 }
 await client.query(`UPDATE production_stage s SET
 guides=COALESCE((SELECT jsonb_agg(jsonb_build_object('id',g.id,'title','Guía interpretativa','assetId',g.asset_id,'provenance',g.provenance) ORDER BY g.id) FROM stage_guide sg JOIN interpretive_guide g ON g.id=sg.guide_id WHERE sg.projection_id=s.projection_id AND sg.stage_key=s.stage_key),'[]'),
 reference_works=COALESCE((SELECT jsonb_agg(jsonb_build_object('id',sr.resource_sha256,'title',COALESCE(sr.title_documented,'Referencia pictórica · inventario no documentado'),'assetId',r.asset_id,'inventory',sr.inventory_documented,'provenance',sr.provenance) ORDER BY sr.resource_sha256) FROM stage_reference sr JOIN provenance_resource r ON r.sha256=sr.resource_sha256 WHERE sr.projection_id=s.projection_id AND sr.stage_key=s.stage_key),'[]')
 WHERE s.projection_id IN (SELECT p.id FROM projection p JOIN lote l ON l.id=p.lote_id WHERE l.package_id=$1)`,[packageId]);
 await client.query('COMMIT');
 writeFileSync(new URL(`data/testing/importacion-final/enrich-${test?'test':'primary'}.json`,root),JSON.stringify({database,counts,at:new Date().toISOString()},null,2));console.log(JSON.stringify({database,counts}));
}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}
