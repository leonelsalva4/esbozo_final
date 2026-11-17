import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';
const root=new URL('../../',import.meta.url),test=process.argv.includes('--test');
if(!test&&!process.argv.includes('--apply'))throw Error('Elegí --test o --apply');
const config=dotenv.parse(readFileSync(new URL(test?'data/testing/p00/backend.env':'backend/.env',root)));
const database=decodeURIComponent(new URL(config.DATABASE_URL).pathname.slice(1));
if(test&&!database.startsWith('esbozo_test_'))throw Error('Se exige base de pruebas');
const backup=JSON.parse(readFileSync(new URL('data/testing/importacion-final/backup.json',root)));
if(!backup.reports.some(r=>r.database===database&&r.verified))throw Error('Falta respaldo verificado del destino');
const pool=new pg.Pool({connectionString:config.DATABASE_URL}),client=await pool.connect();
const sha=b=>createHash('sha256').update(b).digest('hex');
try{
 await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(723184601)');
 const snapshot=async()=>JSON.stringify((await client.query("SELECT jsonb_build_object('reviews',(SELECT jsonb_agg(s ORDER BY projection_id,stage_key) FROM stage_review s),'candidates',(SELECT jsonb_agg(c ORDER BY lote_id) FROM lote_candidate c),'users',(SELECT jsonb_agg(u ORDER BY id) FROM app_user u),'projections',(SELECT jsonb_agg(p ORDER BY id) FROM projection p)) AS state")).rows[0].state);
 const before=await snapshot(),changes=[];
 for(const inventory of ['1582','1663']){
  const id=`PRJ-${inventory}-L01-A01`,lot=`LOT-${inventory}-L01`;
  await client.query('SELECT id FROM lote WHERE id=$1 FOR UPDATE',[lot]);
  const p=(await client.query('SELECT p.asset_id,p.branch_label,a.sha256,b.data FROM projection p JOIN asset a ON a.id=p.asset_id JOIN asset_blob b ON b.asset_id=a.id WHERE p.id=$1 AND p.lote_id=$2',[id,lot])).rows[0];
  if(!p||p.branch_label!=='2718'||sha(p.data)!==p.sha256)throw Error('Final ausente o inválido: '+id);
  const prior=(await client.query("SELECT * FROM production_stage WHERE projection_id=$1 AND stage_key='finish'",[id])).rows[0];
  if(!prior||prior.asset_id&&prior.asset_id!==p.asset_id)throw Error('No se reemplaza un acabado diferente: '+id);
  const proof=Buffer.from(JSON.stringify({person:'Leonel Salva',date:'2026-10-27',source:'Indicación explícita en el chat del proyecto',projectionId:id,stage:'finish',assetId:p.asset_id,sha256:p.sha256,decision:'La imagen final representa Acabado pictórico también en las dos alternativas 2718. Las ocho alternativas tienen tres fases.',conformity:'No se registra automáticamente'}));
  const evidence=sha(proof);
  await client.query('INSERT INTO provenance_resource(sha256,byte_size,mime_type,content) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[evidence,proof.length,'application/json',proof]);
  await client.query("INSERT INTO provenance_link(source_sha256,field_path,target_sha256,available_in_app,target_resource_sha256,package_status) VALUES($1,'asignacion_humana_acabado_final',$2,true,$2,'confirmado_por_usuario') ON CONFLICT DO NOTHING",[evidence,p.sha256]);
  if(prior.source_status!=='user_confirmed_finish')await client.query("UPDATE production_stage SET applicability='applicable',asset_id=$2,description=$3,provenance=$4,source_status='user_confirmed_finish' WHERE projection_id=$1 AND stage_key='finish'",[id,p.asset_id,'Acabado pictórico: imagen final de la alternativa, según la correspondencia de fases confirmada por Leonel Salva.',`Corrección de asociación indicada por Leonel Salva el 27/10/2026. Se usa el archivo final original, sin modificar sus bytes. Evidencia SHA-256: ${evidence}.`]);
  changes.push({projectionId:id,assetId:p.asset_id,sha256:p.sha256,evidenceSha256:evidence});
 }
 const rows=(await client.query('SELECT p.id,count(s.stage_key)::int AS phases,bool_and(s.applicability=$1 AND s.asset_id IS NOT NULL) AS all_images FROM projection p JOIN production_stage s ON s.projection_id=p.id GROUP BY p.id ORDER BY p.id',['applicable'])).rows;
 if(rows.length!==8||rows.some(r=>r.phases!==3||!r.all_images))throw Error('Las ocho alternativas deben tener tres fases con imagen');
 if(before!==await snapshot())throw Error('Se modificó una cuenta o decisión humana');
 await client.query('COMMIT');
 const folder=new URL('data/testing/demo-generar-2026-10-27/',root);mkdirSync(folder,{recursive:true});
 const report={database,at:new Date().toISOString(),changes,projections:8,phasesWithImages:24,decisionsPreserved:true};
 writeFileSync(new URL(test?'finish-test.json':'finish-primary.json',folder),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}
