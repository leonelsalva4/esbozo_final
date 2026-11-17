import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { logTechnicalError } from '../dist/technical-log.js';

const folder=mkdtempSync(path.join(tmpdir(),'esbozo-log-'));
const file=path.join(folder,'backend.log');
const previous=process.env.ESBOZO_LOG_FILE;
process.env.ESBOZO_LOG_FILE=file;
test('el registro técnico conserva operación y código sin filtrar mensajes ni credenciales', () => {
    const error=Object.assign(new Error('SELECT password_hash FROM app_user; password=privada'),{code:'ECONNREFUSED'});
    logTechnicalError('database.connection',error);
    const entry=JSON.parse(readFileSync(file,'utf8').trim());
    assert.equal(entry.code,'ECONNREFUSED');assert.equal(entry.operation,'database.connection');
    assert(!readFileSync(file,'utf8').includes('privada'));assert(!readFileSync(file,'utf8').includes('SELECT'));
  });
  test('el tamaño del registro está acotado y conserva la rotación anterior', () => {
    writeFileSync(file,'x'.repeat(2*1024*1024+1));logTechnicalError('database.retry',new Error('dato privado'));
    assert(existsSync(file+'.1'));assert.equal(JSON.parse(readFileSync(file,'utf8')).code,'UNEXPECTED_ERROR');
  });
  test('un fallo del archivo no propaga una excepción al servidor', () => {
    process.env.ESBOZO_LOG_FILE=folder;const before=console.error;const entries=[];console.error=line=>entries.push(line);
    try{assert.doesNotThrow(()=>logTechnicalError('database.unavailable',{code:'57P01',message:'secreto'}));assert.equal(entries.length,1);assert(!entries[0].includes('secreto'));}finally{console.error=before;process.env.ESBOZO_LOG_FILE=file;}
  });
after(()=>{if(previous===undefined)delete process.env.ESBOZO_LOG_FILE;else process.env.ESBOZO_LOG_FILE=previous;rmSync(folder,{recursive:true,force:true});});
