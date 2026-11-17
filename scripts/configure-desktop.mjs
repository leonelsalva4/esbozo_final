import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {createRequire} from 'node:module';
const load=createRequire(new URL('../backend/package.json',import.meta.url));
const config=load('dotenv').parse(readFileSync(new URL('../backend/.env',import.meta.url)));
if(!config.DATABASE_URL)throw Error('Falta DATABASE_URL en la instalación del proyecto');
if(!process.argv.includes('--apply'))throw Error('Usá --apply para preparar la configuración privada de esta instalación.');
const base=process.platform==='darwin'?path.join(homedir(),'Library/Application Support'):process.platform==='win32'?process.env.APPDATA:path.join(homedir(),'.config');
if(!base)throw Error('No se pudo determinar la carpeta de datos de la aplicación');
const folder=path.join(base,'Esbozo'),file=path.join(folder,'backend.env');
if(existsSync(file)){console.log(JSON.stringify({configuration:file,reused:true,overwritten:false}));}
else{
 mkdirSync(folder,{recursive:true,mode:0o700});
 writeFileSync(file,`DATABASE_URL=${JSON.stringify(config.DATABASE_URL)}\nJWT_SECRET=${randomBytes(48).toString('hex')}\nPORT=4000\n`,{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({configuration:file,created:true,credentialsPrinted:false}));
}
