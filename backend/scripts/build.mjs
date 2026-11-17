import {rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const backend=new URL('../',import.meta.url);
// El destino es generado. Limpiarlo evita distribuir módulos retirados del código fuente.
rmSync(new URL('dist/',backend),{recursive:true,force:true});
const result=spawnSync(process.execPath,[fileURLToPath(new URL('node_modules/typescript/bin/tsc',backend)),'--project',fileURLToPath(new URL('tsconfig.json',backend))],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
