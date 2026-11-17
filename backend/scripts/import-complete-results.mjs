import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,relative,basename,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import pg from 'pg';
import dotenv from 'dotenv';
const root=new URL('../../',import.meta.url),require=createRequire(import.meta.url);
const test=process.argv.includes('--test');
if(!test&&!process.argv.includes('--apply'))throw Error('Usá --test o --apply');
const config=dotenv.parse(readFileSync(new URL(test?'data/testing/p00/backend.env':'backend/.env',root)));
const database=decodeURIComponent(new URL(config.DATABASE_URL).pathname.slice(1));
if(test&&!database.startsWith('esbozo_test_'))throw Error('Se exige base de pruebas');
const backup=JSON.parse(readFileSync(new URL('data/testing/importacion-final/backup.json',root)));
if(!backup.reports.some(r=>r.database===database&&r.verified))throw Error('Falta respaldo verificado');
const dir=fileURLToPath(new URL('data/imports/desarrollo-completo-2026-10-23/',root));
const hash=b=>createHash('sha256').update(b).digest('hex');
const safe=path=>{const f=resolve(dir,path);if(relative(dir,f).startsWith('..'))throw Error('Ruta fuera del paquete');return f;};
const indexBytes=readFileSync(safe('indice.json')),index=JSON.parse(indexBytes),packageId='PKG-'+hash(indexBytes);
const entries=new Map(index.archivos.map(e=>[e.ruta_zip,e]));
// El manifiesto ampliado cubre también los recursos adicionales por etapas.
const stageManifest=JSON.parse(readFileSync(safe('1663_etapas/MANIFEST.json')));
for(const [path,sha]of Object.entries(stageManifest))entries.set('1663_etapas/'+path,{ruta_zip:'1663_etapas/'+path,sha256_calculado_exportacion:sha});
const counts={validated:0,stages:0,guides:0,references:0,milestones:0};
for(const e of entries.values()){
 const b=readFileSync(safe(e.ruta_zip));
 if(hash(b)!==e.sha256_calculado_exportacion||(e.bytes!==undefined&&b.length!==e.bytes))throw Error('Integridad inválida: '+e.ruta_zip);
 counts.validated++;
}
function bytes(path){const b=readFileSync(safe(path)),e=entries.get(path);if(e&&hash(b)!==e.sha256_calculado_exportacion)throw Error('Archivo alterado: '+path);return b;}
const complement=JSON.parse(bytes('complemento_pilotos/manifiesto_complemento.json'));
const trajectory=JSON.parse(bytes('1663_etapas/TRAZABILIDAD.json'));
const legacy=/stable[\s_-]*diffusion|sd[\s_-]?1[._]?5|controlnet/i;
const pool=new pg.Pool({connectionString:config.DATABASE_URL}),client=await pool.connect();
async function resource(path,kind='production_stage'){
 const b=bytes(path),sha=hash(b),extension=extname(path).toLowerCase();
 if(!['.png','.jpg','.jpeg'].includes(extension)){
  if(legacy.test(b.toString('utf8')))throw Error('Documento histórico excluido del conjunto activo: '+path);
  await client.query('INSERT INTO provenance_resource(sha256,byte_size,mime_type,content) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[sha,b.length,extension==='.json'?'application/json':'text/plain',b]);
 }else{
  const png=extension==='.png',d=png?require('pngjs').PNG.sync.read(b):require('jpeg-js').decode(b,{maxResolutionInMP:64,maxMemoryUsageInMB:512,useTArray:true});
  if(d.width*d.height>64e6)throw Error('Dimensiones no admitidas');
  const id='IMG-'+sha,mime=png?'image/png':'image/jpeg';
  await client.query('INSERT INTO asset(id,kind,filename,mime_type,width,height,byte_size,sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING',[id,kind,basename(path),mime,d.width,d.height,b.length,sha]);
  await client.query('INSERT INTO asset_blob(asset_id,data) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,b]);
  await client.query('INSERT INTO provenance_resource(sha256,byte_size,mime_type,asset_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[sha,b.length,mime,id]);
 }
 await client.query('INSERT INTO provenance_origin(package_id,resource_sha256,original_path,package_path) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[packageId,sha,entries.get(path)?.ruta_original??path,path]);
 return {sha,assetId:['.png','.jpg','.jpeg'].includes(extension)?'IMG-'+sha:null};
}
async function linkDocument(path,target){const r=await resource(path);await client.query("INSERT INTO provenance_link(source_sha256,field_path,target_sha256,available_in_app,target_resource_sha256,package_status) VALUES($1,'entrega_completa',$2,true,$2,'entregado') ON CONFLICT DO NOTHING",[r.sha,target]);return r.sha;}
try{
 await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(723184601)');
 const before=(await client.query('SELECT id,lote_id,position,asset_id FROM projection ORDER BY id')).rows;
 const decisions=async()=>JSON.stringify((await client.query("SELECT jsonb_build_object('reviews',(SELECT jsonb_agg(s) FROM stage_review s),'candidates',(SELECT jsonb_agg(c) FROM lote_candidate c),'users',(SELECT jsonb_agg(u ORDER BY id) FROM app_user u)) AS state")).rows[0].state);
 const decisionsBefore=await decisions();
 await client.query('INSERT INTO source_package(id,filename,manifest_sha256,export_date,summary) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[packageId,'Esbozo_desarrollo_COMPLETO_20261023.zip',hash(indexBytes),index.fecha_exportacion,JSON.stringify({supplement:true,model:index.modelo_resumen})]);
 for(const lot of index.lotes){
  const lotId=`LOT-${lot.boceto}-L01`;
  if(!(await client.query('SELECT id FROM lote WHERE id=$1 FOR UPDATE',[lotId])).rowCount)throw Error('Lote original no instalado');
  for(const alt of lot.alternativas){
   const id=`PRJ-${lot.boceto}-L01-A${String(alt.posicion_definitiva).padStart(2,'0')}`;
   const old=before.find(p=>p.id===id),finalSha=hash(bytes(alt.etapas.final.archivo));
   if(old?.asset_id!=='IMG-'+finalSha||old.lote_id!==lotId||old.position!==alt.posicion_definitiva)throw Error('El complemento cambia identidad/final: '+id);
   for(const [source,key]of [['base','base'],['figuras','figures'],['acabado','finish']]){
    const stage=alt.etapas[source],r=stage.archivo?await resource(stage.archivo):null;
    const applicability=stage.estado==='no_aplica'?'not_applicable':stage.estado==='no_documentado'?'undocumented':'applicable';
    const prior=(await client.query('SELECT * FROM production_stage WHERE projection_id=$1 AND stage_key=$2',[id,key])).rows[0];
    // Una asignación humana posterior al paquete conserva precedencia sobre su faltante histórico.
    if(['user_confirmed_guide','user_confirmed_finish'].includes(prior.source_status)&&!stage.archivo){counts.stages++;continue;}
    if(prior.asset_id&&prior.asset_id!==r?.assetId)throw Error('No se reemplaza una etapa existente por otra imagen: '+id+'/'+key);
    // Mantener metadatos idénticos evita invalidar conformidades de etapas sin cambios.
    if(prior.asset_id!==r?.assetId&&!(prior.asset_id===null&&r===null))await client.query('UPDATE production_stage SET applicability=$3,asset_id=$4,description=$5,provenance=$6,source_status=$7 WHERE projection_id=$1 AND stage_key=$2',[id,key,applicability,r?.assetId??null,stage.descripcion,'Asociación explícita del índice de entrega completo del 23/10/2026.',stage.estado]);
    if(r){await linkDocument('resumen_desarrollo.json',r.sha);counts.stages++;}
   }
   const milestones={base:[],figures:[],finish:[]};
   if(lot.boceto==='1663')for(const h of trajectory.stages.filter(h=>h.trajectory===(alt.etiqueta_rama==='2718'?'piloto_2718':alt.etiqueta_rama))){
    const r=await resource('1663_etapas/'+h.file);
    if(r.sha!==h.sha256)throw Error('Hito no coincide con trazabilidad');
    const key=h.stage==='B0'||h.key==='B1977'?'base':h.stage==='AG'?'finish':'figures';
    milestones[key].push({assetId:r.assetId,title:h.title+' · '+h.key,provenance:`Hito conservado: ${h.stage}. Orden del recorrido documentado; no representa una conformidad.`,sha256:r.sha});counts.milestones++;
    await linkDocument('1663_etapas/TRAZABILIDAD.json',r.sha);
   }
   for(const [key,images]of Object.entries(milestones))await client.query('UPDATE production_stage SET documented_images=$3 WHERE projection_id=$1 AND stage_key=$2',[id,key,JSON.stringify(images)]);
   for(const row of complement.registros.filter(r=>r.boceto===lot.boceto&&String(r.alternativa_rama).split(',').includes(alt.etiqueta_rama))){
    if(!row.ruta||row.estado!=='entregado')continue;
    const guide=/guia_interpretativa|guia_compositiva_sectorial/.test(row.tipo_recurso),ref=row.tipo_recurso==='referencia_pictorica';
    if(!guide&&!ref)continue;
    if(!['.png','.jpg','.jpeg'].includes(extname(row.ruta).toLowerCase()))continue;
    const r=await resource(row.ruta,guide?'interpretive_guide':'reference_fragment');
    // SVG y geometrías se preservan como documentos, no se renderizan como código activo.
    if(!r.assetId)continue;
    const key=/^(AG|acabado)/i.test(row.etapa_operacion)?'finish':'figures',provenance=[row.etapa_operacion,row.procedencia,row.observaciones].filter(Boolean).join(' · ');
    if(guide){
     const guideId=`GUIDE-${lot.boceto}-${r.sha}`;
     await client.query('INSERT INTO interpretive_guide(id,sketch_id,asset_id,sector,version_documented,provenance,source_sha256) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET sector=EXCLUDED.sector,version_documented=EXCLUDED.version_documented',[guideId,lot.boceto,r.assetId,row.sector??null,row.version??null,provenance,r.sha]);
     await client.query('INSERT INTO stage_guide(projection_id,stage_key,guide_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[id,key,guideId]);counts.guides++;
    }else{
     await client.query('INSERT INTO stage_reference(projection_id,stage_key,resource_sha256,provenance,title_documented,inventory_documented) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(projection_id,stage_key,resource_sha256) DO UPDATE SET title_documented=EXCLUDED.title_documented,inventory_documented=EXCLUDED.inventory_documented',[id,key,r.sha,provenance,row.titulo??null,row.inventario??null]);counts.references++;
    }
   }
   // Guías preparatorias por trayectoria, preservadas como insumos y no como etapas generadas.
   if(lot.boceto==='1663')for(const [path,sha]of Object.entries(stageManifest))if(path.startsWith('guias_no_generadas/'+(alt.etiqueta_rama==='2718'?'piloto_2718':alt.etiqueta_rama)+'/')&&path.endsWith('.png')){
    const r=await resource('1663_etapas/'+path,'interpretive_guide'),guideId=`GUIDE-1663-${sha}`;
    await client.query('INSERT INTO interpretive_guide(id,sketch_id,asset_id,provenance,source_sha256) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[guideId,'1663',r.assetId,'Guía preparatoria documentada por trayectoria: '+path,r.sha]);
    await client.query("INSERT INTO stage_guide(projection_id,stage_key,guide_id) VALUES($1,'figures',$2) ON CONFLICT DO NOTHING",[id,guideId]);counts.guides++;
   }
   await linkDocument('complemento_pilotos/manifiesto_complemento.json',finalSha);
   await linkDocument('complemento_pilotos/corpus_adaptacion_36_obras.json',finalSha);
  }
 }
 await client.query(`UPDATE production_stage s SET guides=COALESCE((SELECT jsonb_agg(jsonb_build_object('id',g.id,'title',concat_ws(' · ','Guía interpretativa',g.sector,g.version_documented),'assetId',g.asset_id,'provenance',g.provenance) ORDER BY g.id) FROM stage_guide sg JOIN interpretive_guide g ON g.id=sg.guide_id WHERE sg.projection_id=s.projection_id AND sg.stage_key=s.stage_key),'[]'),reference_works=COALESCE((SELECT jsonb_agg(jsonb_build_object('id',sr.resource_sha256,'title',COALESCE(sr.title_documented,'Referencia pictórica'),'assetId',r.asset_id,'inventory',sr.inventory_documented,'provenance',sr.provenance) ORDER BY sr.resource_sha256) FROM stage_reference sr JOIN provenance_resource r ON r.sha256=sr.resource_sha256 WHERE sr.projection_id=s.projection_id AND sr.stage_key=s.stage_key),'[]')`);
 if(JSON.stringify(before)!==JSON.stringify((await client.query('SELECT id,lote_id,position,asset_id FROM projection ORDER BY id')).rows)||decisionsBefore!==await decisions())throw Error('Cambió una identidad, cuenta o decisión humana');
 await client.query('COMMIT');
 const out=new URL('data/testing/complemento-final/',root);mkdirSync(out,{recursive:true});
 const result={database,packageId,at:new Date().toISOString(),...counts,accountsAndDecisionsPreserved:true,finalsPreserved:true};
 writeFileSync(new URL(test?'test.json':'primary.json',out),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();await pool.end();}
