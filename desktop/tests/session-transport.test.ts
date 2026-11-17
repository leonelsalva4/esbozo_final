import {afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {apiFetch,SESSION_EVENT} from '../src/api/transport.ts';
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;});
async function check(status:number,body:unknown,authorized=true){
 const target=new EventTarget();Object.assign(globalThis,{window:target});const events:unknown[]=[];target.addEventListener(SESSION_EVENT,e=>events.push((e as CustomEvent).detail));
 globalThis.fetch=async()=>Response.json(body,{status});
 const response=await apiFetch('http://localhost:4000/api/lotes',{headers:authorized?{Authorization:'Bearer fixture-only'}:{}});assert.deepEqual(await response.json(),body);return events;
}
test('401 autenticado informa vencimiento sin consumir el cuerpo',async()=>{assert.deepEqual(await check(401,{error:'Vencida',code:'SESSION_EXPIRED'}),[{token:'fixture-only',reason:'expired'}]);});
test('403 de cuenta inactiva informa desactivación',async()=>{assert.deepEqual(await check(403,{error:'Inactiva',code:'ACCOUNT_INACTIVE'}),[{token:'fixture-only',reason:'inactive'}]);});
test('un permiso denegado no cierra la sesión válida',async()=>{assert.deepEqual(await check(403,{error:'Requiere administrador'}),[]);});
test('una falla de servidor o una solicitud sin sesión no generan vencimiento',async()=>{assert.deepEqual(await check(503,{error:'Temporal'}),[]);assert.deepEqual(await check(401,{error:'Sin sesión'},false),[]);});
