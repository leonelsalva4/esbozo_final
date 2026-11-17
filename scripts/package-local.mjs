import { cp, mkdir, mkdtemp, readFile, writeFile, readdir, stat, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { packager } from '@electron/packager';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(import.meta.url);
async function command(cmd,args,cwd=root){await new Promise((resolve,reject)=>{const child=cmd==='npm'?spawn(process.execPath,[process.env.npm_execpath,...args],{cwd,stdio:'inherit'}):spawn(cmd,args,{cwd,stdio:'inherit'});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`${cmd} terminó con código ${code}`)));});}
const manifest=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
await command('npm',['run','build','--prefix','backend']);
await command('npm',['run','build','--prefix','desktop']);
await mkdir(path.join(root,'release'),{recursive:true});
const stage=await mkdtemp(path.join(root,'release/staging-'));
const output=path.join(root,'release',`local-${new Date().toISOString().replaceAll(':','-')}`);
try{
 await mkdir(path.join(stage,'assets'));
 await cp(path.join(root,'desktop/dist'),path.join(stage,'dist'),{recursive:true});
 await cp(path.join(root,'desktop/electron'),path.join(stage,'electron'),{recursive:true});
 await cp(path.join(root,'desktop/src/assets/esbozo-app-icon.png'),path.join(stage,'assets/esbozo-app-icon.png'));
 await mkdir(path.join(stage,'backend'));
 await cp(path.join(root,'backend/dist'),path.join(stage,'backend/dist'),{recursive:true});
 for(const file of await readdir(path.join(stage,'backend/dist')))if(file.startsWith('seed'))await rm(path.join(stage,'backend/dist',file));
 for(const file of ['package.json','package-lock.json'])await cp(path.join(root,'backend',file),path.join(stage,'backend',file));
 await writeFile(path.join(stage,'package.json'),JSON.stringify({name:'esbozo',productName:'Esbozo',version:manifest.version,description:'Consulta y revisión de proyecciones visuales hipotéticas',author:'Leonel Salva y Luciana Russo',main:'electron/main.cjs'},null,2));
 // El paquete usa únicamente dependencias de ejecución y nunca incorpora .env ni data/.
 await command('npm',['ci','--omit=dev','--ignore-scripts','--no-audit','--no-fund'],path.join(stage,'backend'));
 const html=path.join(stage,'dist/index.html'),csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src http://localhost:4000 http://127.0.0.1:4000; object-src 'none'; base-uri 'none'; form-action 'none'";
 await writeFile(html,(await readFile(html,'utf8')).replace('<head>',`<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}" />`));
 let icon;
 if(process.platform==='darwin'){
  const iconset=path.join(stage,'assets/Esbozo.iconset');await mkdir(iconset);
  await cp(path.join(stage,'assets/esbozo-app-icon.png'),path.join(iconset,'icon_512x512@2x.png'));
  icon=path.join(stage,'assets/Esbozo.icns');await command('/usr/bin/iconutil',['-c','icns',iconset,'-o',icon]);await rm(iconset,{recursive:true});
 }
 const electronVersion=require('../desktop/node_modules/electron/package.json').version;
 const bundles=await packager({dir:stage,out:output,name:'Esbozo',appBundleId:'ar.edu.uade.esbozo',appVersion:manifest.version,appCopyright:'Leonel Salva y Luciana Russo',platform:process.platform,arch:process.arch,electronVersion,asar:false,prune:false,icon,overwrite:false});
 async function inspect(directory){for(const name of await readdir(directory)){const file=path.join(directory,name),info=await stat(file);if(info.isDirectory())await inspect(file);else if(name==='.env'||name==='backend.env'||name.endsWith('.dump')||name.endsWith('.zip'))throw Error(`Archivo privado inesperado: ${file}`);}}
 for(const bundle of bundles)await inspect(bundle);
 async function inspectCode(directory){for(const name of await readdir(directory)){const file=path.join(directory,name),info=await stat(file);if(info.isDirectory())await inspectCode(file);else if(name.endsWith('.js')&&/stable[\s_-]*diffusion|controlnet|sd[\s_-]?1[._]?5/i.test(await readFile(file,'utf8')))throw Error('Código retirado encontrado en el paquete: '+file);}}
 await inspectCode(path.join(stage,'backend/dist'));
 await writeFile(path.join(output,'VERIFICACION.json'),JSON.stringify({version:manifest.version,platform:process.platform,arch:process.arch,electronVersion,bundles,privateFilesIncluded:false,configurationIncluded:false,databaseIncluded:false,generatedAt:new Date().toISOString()},null,2));
 console.log(JSON.stringify({bundles,report:path.join(output,'VERIFICACION.json')}));
}finally{await rm(stage,{recursive:true,force:true});}
