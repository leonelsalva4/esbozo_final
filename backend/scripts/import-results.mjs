import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative,basename,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import pg from 'pg';import dotenv from 'dotenv';
const require=createRequire(import.meta.url),root=new URL('../../',import.meta.url),test=process.argv.includes('--test');
const config=dotenv.parse(readFileSync(new URL(test?'data/testing/p00/backend.env':'backend/.env',root)));
if(!test&&!process.argv.includes('--apply'))throw Error('Elegí --test o --apply');
const database=new URL(config.DATABASE_URL).pathname.slice(1);if(test&&!database.startsWith('esbozo_test_'))throw Error('Se exige copia de pruebas');
const backup=JSON.parse(readFileSync(new URL('data/testing/importacion-final/backup.json',root)));if(!backup.reports.some(r=>r.database===database&&r.verified))throw Error('Falta respaldo verificado del destino');
const dir=fileURLToPath(new URL('data/imports/resultados-2026-10-23/',root)),indexBytes=readFileSync(resolve(dir,'indice.json')),index=JSON.parse(indexBytes),sha=b=>createHash('sha256').update(b).digest('hex'),packageId='PKG-'+sha(indexBytes);
const validation=JSON.parse(readFileSync(new URL('data/testing/importacion-final/validacion.json',root)));if(validation.errors.length)throw Error('El paquete no pasó validación');
const safe=path=>{const file=resolve(dir,path);if(relative(dir,file).startsWith('..'))throw Error('Ruta inválida');return file;};
const legacy=/stable[\s_-]*diffusion|sd[\s_-]?1[._]?5|controlnet/i;
const entries=new Map(index.archivos.map(e=>[e.sha256_calculado_exportacion,e]));
const manifestPaths=new Map(index.archivos.map(e=>[e.ruta_zip,e]));
function verifiedBytes(path){const bytes=readFileSync(safe(path)),entry=manifestPaths.get(path);if(!entry||bytes.length!==entry.bytes||sha(bytes)!==entry.sha256_calculado_exportacion)throw Error('El archivo cambió respecto del manifiesto: '+path);return bytes;}

const excluded=new Set();for(const [hash,e] of entries){if(/\.(json|md|txt)$/.test(e.ruta_zip)&&legacy.test(verifiedBytes(e.ruta_zip).toString('utf8')))excluded.add(hash);if(legacy.test(e.ruta_original))excluded.add(hash);}
for(const e of index.archivos.filter(e=>e.ruta_original.endsWith('T0825_manifest.json')))for(const row of JSON.parse(verifiedBytes(e.ruta_zip).toString('utf8')))excluded.add(row.sha256);
const pool=new pg.Pool({connectionString:config.DATABASE_URL}),client=await pool.connect(),assets=new Map();
async function asset(path,kind='production_stage'){
 const bytes=verifiedBytes(path),hash=sha(bytes);if(excluded.has(hash))throw Error('Recurso excluido de la instalación activa');if(assets.has(hash))return assets.get(hash);
 const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),image=png?require('pngjs').PNG.sync.read(bytes):require('jpeg-js').decode(bytes),id='IMG-'+hash;
 await client.query('INSERT INTO asset(id,kind,filename,mime_type,width,height,byte_size,sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,kind,basename(path),png?'image/png':'image/jpeg',image.width,image.height,bytes.length,hash]);await client.query('INSERT INTO asset_blob(asset_id,data) VALUES($1,$2)',[id,bytes]);
 await client.query('INSERT INTO provenance_resource(sha256,byte_size,mime_type,asset_id) VALUES($1,$2,$3,$4)',[hash,bytes.length,png?'image/png':'image/jpeg',id]);const info={id,hash,width:image.width,height:image.height};assets.set(hash,info);return info;
}
async function document(path){const bytes=verifiedBytes(path),hash=sha(bytes);if(excluded.has(hash))return null;await client.query('INSERT INTO provenance_resource(sha256,byte_size,mime_type,content) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[hash,bytes.length,path.endsWith('.json')?'application/json':'text/plain',bytes]);return hash;}
try{
 await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(723184601)');
 if((await client.query('SELECT id FROM source_package WHERE id=$1',[packageId])).rowCount){await client.query('ROLLBACK');console.log(JSON.stringify({database,reused:true,packageId}));process.exitCode=0;}
 else{
 if((await client.query('SELECT id FROM source_package LIMIT 1')).rowCount)throw Error('Hay resultados reales instalados. Este script sólo retira el conjunto anterior durante la integración inicial; un paquete distinto debe incorporarse sin reemplazar los lotes existentes.');
 if((await client.query("SELECT id FROM generation_run WHERE base_model_name !~* 'stable[ _-]*diffusion|sd[ _-]?1[._-]?5' LIMIT 1")).rowCount)throw Error('Hay resultados de otro procedimiento sin paquete identificado. Se requiere una incorporación que preserve esos registros.');
 const oldHashes=(await client.query("SELECT sha256 FROM asset WHERE kind::text IN ('projection','control_map','control_map_diff')")).rows;for(const r of oldHashes)excluded.add(r.sha256);
 await client.query("DELETE FROM audit_log WHERE entity_type='lote'");
 for(const table of ['stage_guide','stage_reference','reference_identity','operation_resource','production_operation','external_selection','stage_review','production_stage','lote_candidate','lote_obtencion','projection','lote','interpretive_guide','provenance_origin','provenance_link','provenance_resource','source_package','control_map','generation_run','lora_version','corpus_work','corpus_version'])if((await client.query('SELECT to_regclass($1) AS name',[table])).rows[0].name)await client.query(`DELETE FROM ${table}`);
 await client.query("DELETE FROM asset_blob WHERE asset_id NOT IN (SELECT asset_id FROM sketch)");await client.query('DELETE FROM asset WHERE id NOT IN (SELECT asset_id FROM sketch)');
 await client.query('INSERT INTO source_package(id,filename,manifest_sha256,export_date,summary) VALUES($1,$2,$3,$4,$5)',[packageId,'Esbozo_1582_1663_datos_reales.zip',sha(indexBytes),index.fecha_exportacion,JSON.stringify({model:index.modelo_resumen,lotIds:index.lotes.map(l=>l.id),hash_origin:'sha256_calculado_exportacion'})]);
 const model=index.modelo_resumen;
 await client.query("INSERT INTO lora_version(id,label,training_params,file_sha256,training_notes) VALUES('P4-plus180','P4/+180',$1,$2,$3)",[JSON.stringify(model),model.sha256_previamente_registrado,'Metadatos entregados; los pesos no se ejecutan en la aplicación.']);
 await client.query("INSERT INTO generation_run(id,base_model_name,base_model_revision,library_versions,inference_config,notes) VALUES('RUN-PACKAGE-FINAL',$1,$2,'{}',$3,$4)",[model.base,model.revision,JSON.stringify({lora_scale:model.escala_inferencia}),'Entorno y parámetros efectivos documentados por operación; no se afirma una corrida homogénea.']);
 for(const e of entries.values())if(!excluded.has(e.sha256_calculado_exportacion)&&/\.(json|md|txt)$/.test(e.ruta_zip))await document(e.ruta_zip);
 for(const lot of index.lotes){const lotId=`LOT-${lot.boceto}-L01`;
 await client.query("INSERT INTO lote(id,sketch_id,sequence,run_id,lora_version_id,source_identifier,date_documented,package_id,notes) VALUES($1,$2,1,'RUN-PACKAGE-FINAL','P4-plus180',$3,$4,$5,$6)",[lotId,lot.boceto,lot.id,lot.fecha_produccion,packageId,'Resultados precomputados entregados. No equivale a una obtención ni revisión en la aplicación.']);
 for(const alt of lot.alternativas){const final=await asset(alt.etapas.final.archivo,'projection'),projectionId=`PRJ-${lot.boceto}-L01-A${String(alt.posicion_definitiva).padStart(2,'0')}`;
 await client.query('INSERT INTO projection(id,lote_id,sketch_id,position,source_filename,title,seed,width,height,asset_id,branch_label,date_documented,production_notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[projectionId,lotId,lot.boceto,alt.posicion_definitiva,`finales/${lot.boceto}/${alt.posicion_definitiva}_${alt.etiqueta_rama}.png`,`Alternativa ${alt.posicion_definitiva}`,alt.semilla_global ?? null,final.width,final.height,final.id,alt.etiqueta_rama,lot.fecha_produccion,alt.nota_semillas]);
 for(const [sourceKey,key] of [['base','base'],['figuras','figures'],['acabado','finish']]){const stage=alt.etapas[sourceKey],image=stage.archivo?await asset(stage.archivo):null,applicability=stage.estado==='no_aplica'?'not_applicable':stage.estado==='no_documentado'?'undocumented':'applicable';
 await client.query('INSERT INTO production_stage(projection_id,stage_key,applicability,asset_id,description,provenance,source_status) VALUES($1,$2,$3,$4,$5,$6,$7)',[projectionId,key,applicability,image?.id ?? null,stage.descripcion,'Índice de entrega; asociación explícita, no inferida del nombre.',stage.estado]);}
 const selection=alt.seleccion_humana;if(selection){const evidence=selection.evidencia?await document(selection.evidencia):null;await client.query('INSERT INTO external_selection(projection_id,person,date_documented,modality,evidence_sha256) VALUES($1,$2,$3,$4,$5)',[projectionId,selection.persona,selection.fecha,selection.modalidad || 'Fuera de la aplicación',evidence]);}
 // FA es un intermedio técnico adicional; no se transforma en otra etapa UI.
 if(alt.etapas.ambiente_intermedio_FA?.archivo)await asset(alt.etapas.ambiente_intermedio_FA.archivo);
 }
 }
 const imported=new Set((await client.query('SELECT sha256 FROM provenance_resource')).rows.map(r=>r.sha256));
 for(const e of index.archivos)if(imported.has(e.sha256_calculado_exportacion)&&!legacy.test(e.ruta_original))await client.query('INSERT INTO provenance_origin(package_id,resource_sha256,original_path,package_path) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[packageId,e.sha256_calculado_exportacion,e.ruta_original,e.ruta_zip]);
 for(const link of index.relaciones_por_hash_documentado){const source=basename(link.registro).split('.')[0],target=link.sha256_previamente_registrado;if(imported.has(source)&&!excluded.has(target))await client.query('INSERT INTO provenance_link(source_sha256,field_path,target_sha256,available_in_app,target_resource_sha256,package_status) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[source,link.campo,target,imported.has(target),imported.has(target)?target:null,link.estado]);}
 await client.query('COMMIT');console.log(JSON.stringify({database,packageId,assets:assets.size,excluded:excluded.size,lots:2,projections:8,conformities:0,candidates:0}));
 writeFileSync(new URL(`data/testing/importacion-final/import-${test?'test':'primary'}.json`,root),JSON.stringify({database,packageId,assets:assets.size,excluded:[...excluded],at:new Date().toISOString()},null,2));
 }
}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}
