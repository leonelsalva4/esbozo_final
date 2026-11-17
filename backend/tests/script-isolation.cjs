// Sólo para los procesos hijos de scripts.test.mjs. No se carga en la aplicación.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {fileURLToPath}=require('node:url');
const {syncBuiltinESMExports}=require('node:module');
const root=path.resolve(__dirname,'../..'),fixture=process.env.ESBOZO_SCRIPT_FIXTURE;
if(!fixture||!path.resolve(fixture).startsWith(path.join(root,'data/testing/validation-scripts-')))throw Error('Falta el entorno descartable de scripts');
const rawRead=fs.readFileSync;
const config=require('dotenv').parse(rawRead(path.join(fixture,'backend.env')));
const database=new URL(config.DATABASE_URL).pathname.slice(1);
if(!/^esbozo_test_validation_\d+_\d+$/.test(database))throw Error('Se exige la base descartable propia');
function redirect(value){
 if(typeof value!=='string'&&!(value instanceof URL))return value;
 const file=path.resolve(value instanceof URL?fileURLToPath(value):value);
 if(file.startsWith(fixture+path.sep))return file;
 if(file===path.join(root,'backend/.env')||file===path.join(root,'data/testing/p00/backend.env'))return path.join(fixture,'backend.env');
 if(process.env.ESBOZO_SCRIPT_CORRUPT&&file===process.env.ESBOZO_SCRIPT_CORRUPT)return path.join(fixture,'corrupt-resource');
 for(const prefix of ['data/testing/importacion-final','data/testing/complemento-final','data/testing/performance','data/testing/installation','data/backups','data/delivery']){
  const base=path.join(root,prefix);if(file===base||file.startsWith(base+path.sep))return path.join(fixture,prefix,path.relative(base,file));
 }
 return value;
}
for(const name of ['readFileSync','writeFileSync','mkdirSync','chmodSync','statSync','rmSync']){const original=fs[name];fs[name]=(first,...args)=>original(redirect(first),...args);}
const originalSpawnSync=cp.spawnSync;
cp.spawnSync=(binary,args=[],options)=>originalSpawnSync(binary,args.map(arg=>typeof arg==='string'&&arg.startsWith('--file=')?'--file='+redirect(arg.slice(7)):redirect(arg)),options);
syncBuiltinESMExports();
const pg=require('pg'),OriginalPool=pg.Pool;
pg.Pool=class extends OriginalPool{constructor(options){const target=new URL(options.connectionString).pathname.slice(1);if(target!==database&&!/^esbozo_restore_test_\d+_[a-f0-9]+$/.test(target))throw Error('Destino ajeno a la prueba bloqueado');super(options);}};
