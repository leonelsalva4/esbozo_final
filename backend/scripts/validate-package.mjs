import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,relative,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {inspectImage} from '../dist/services/stage-review.js';
const require=createRequire(import.meta.url),root=resolve(process.argv[2] || '../data/imports/resultados-2026-10-23');
const index=JSON.parse(readFileSync(resolve(root,'indice.json'),'utf8')),unique=new Map(),errors=[],counts={};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function safe(path){const file=resolve(root,path);if(relative(root,file).startsWith('..'))throw new Error('Ruta fuera del paquete');return file;}
for(const entry of index.archivos){try{let saved=unique.get(entry.ruta_zip);if(!saved){const bytes=readFileSync(safe(entry.ruta_zip));saved={sha:hash(bytes),bytes:bytes.length};unique.set(entry.ruta_zip,saved);counts[extname(entry.ruta_zip)]=(counts[extname(entry.ruta_zip)]||0)+1;}if(saved.sha!==entry.sha256_calculado_exportacion || saved.bytes!==entry.bytes)throw new Error('Hash o tamaño diferente del índice');}catch(error){errors.push({path:entry.ruta_zip,error:error.message});}}
const lots=[];
for(const lot of index.lotes){const alternatives=[];for(const alternative of lot.alternativas){const stages=[];for(const [key,stage] of Object.entries(alternative.etapas)){
 if(!stage.archivo){stages.push({key,status:stage.estado});continue;}
 const bytes=readFileSync(safe(stage.archivo)),png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));const image=png?require('pngjs').PNG.sync.read(bytes):require('jpeg-js').decode(bytes),sha=hash(bytes);
 if(!inspectImage({data:bytes,sha256:sha,byte_size:bytes.length,mime_type:png?'image/png':'image/jpeg',width:image.width,height:image.height}).ok)errors.push({path:stage.archivo,error:'Imagen no verificable'});
 stages.push({key,status:stage.estado,path:stage.archivo,sha,width:image.width,height:image.height,bytes:bytes.length});
 if(key==='final' && hash(readFileSync(safe(`finales/${lot.boceto}/${alternative.posicion_definitiva}_${alternative.etiqueta_rama}.png`)))!==sha)errors.push({path:stage.archivo,error:'Final duplicado no coincide'});
 }alternatives.push({position:alternative.posicion_definitiva,branch:alternative.etiqueta_rama,stages});}
 if(alternatives.length!==4 || new Set(alternatives.map(a=>a.position)).size!==4)errors.push({lot:lot.id,error:'Posiciones incompletas'});lots.push({id:lot.id,sketch:lot.boceto,alternatives});}
const report={at:new Date().toISOString(),entries:index.archivos.length,uniqueFiles:unique.size,counts,lots,errors};const output=new URL('../../data/testing/importacion-final/',import.meta.url);mkdirSync(output,{recursive:true});writeFileSync(new URL('validacion.json',output),JSON.stringify(report,null,2));console.log(JSON.stringify({entries:report.entries,uniqueFiles:report.uniqueFiles,counts,lots:lots.map(l=>({id:l.id,alternatives:l.alternatives.length,missing:l.alternatives.flatMap(a=>a.stages.filter(s=>!s.path).map(s=>({branch:a.branch,...s})))})),errors}));if(errors.length)process.exitCode=1;
