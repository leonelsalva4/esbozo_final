import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{startBackend}=require('../electron/backend-runtime.cjs');
const directory=mkdtempSync(path.join(tmpdir(),'esbozo-runtime-')),configPath=path.join(directory,'backend.env'),backendDir=fileURLToPath(new URL('../../backend/',import.meta.url));
writeFileSync(configPath,'DATABASE_URL=postgres://fixture/fixture\nJWT_SECRET='+('fixture-'.repeat(8))+'\nPORT=4000\n',{mode:0o600});
after(()=>rmSync(directory,{recursive:true,force:true}));
function options(){let env,kills=0;const child=new EventEmitter();child.kill=()=>{kills++;return true;};return {options:{backendDir,configPath,appVersion:'fixture-version',available:async()=>true,spawnChild:(_file,e)=>{env=e;return child;},request:async()=>Response.json({ok:true,ready:true,instanceId:env.ESBOZO_INSTANCE_ID})},child,kills:()=>kills};}
test('el arranque espera su propia identidad y detiene únicamente su hijo',async()=>{const state=options();const running=await startBackend(state.options);assert.equal(state.kills(),0);assert.equal(running.child,state.child);running.stop();running.stop();assert.equal(state.kills(),1);});
test('un puerto ocupado no adopta ni detiene un servidor ajeno',async()=>{const state=options();await assert.rejects(startBackend({...state.options,available:async()=>false}),/ocupado/);assert.equal(state.kills(),0);});
test('una identidad inesperada detiene el hijo sin aceptar una respuesta ajena',async()=>{const state=options();await assert.rejects(startBackend({...state.options,request:async()=>Response.json({ok:true,ready:true,instanceId:'otro'})}),/otro servidor/);assert.equal(state.kills(),1);});
test('una base sin migraciones no dispara seeds ni actualizaciones automáticas',async()=>{const state=options();let env;state.options.spawnChild=(_file,e)=>{env=e;return state.child;};await assert.rejects(startBackend({...state.options,request:async()=>Response.json({ok:true,ready:false,instanceId:env.ESBOZO_INSTANCE_ID})}),/actualización/);assert.equal(state.kills(),1);});
test('configuración ausente o incompleta falla antes de iniciar un proceso',async()=>{const state=options();await assert.rejects(startBackend({...state.options,configPath:path.join(directory,'ausente')}),/Falta/);const invalid=path.join(directory,'invalido.env');writeFileSync(invalid,'DATABASE_URL=fixture\nJWT_SECRET=corto\n');await assert.rejects(startBackend({...state.options,configPath:invalid}),/32 caracteres/);assert.equal(state.kills(),0);});
