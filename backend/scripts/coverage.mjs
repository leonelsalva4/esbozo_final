import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const backend=fileURLToPath(new URL('../',import.meta.url));
const report=path.resolve(backend,'../data/testing/coverage',new Date().toISOString().replaceAll(':','-'));
mkdirSync(report,{recursive:true});
const policy=JSON.parse(readFileSync(path.join(backend,'.c8rc.json')));
writeFileSync(path.join(report,'alcance-previo.json'),JSON.stringify({at:new Date().toISOString(),policy,threshold:{metric:'lines',minimum:90},note:'Se informa sin alterar exclusiones después de medir. Autores del proyecto Leonel Salva y Luciana Russo.'},null,2));
async function run(binary,args,log){return new Promise((resolve,reject)=>{let output='';const child=spawn(binary,args,{cwd:backend,stdio:['ignore','pipe','pipe']});for(const stream of [child.stdout,child.stderr])stream.on('data',bytes=>{process.stdout.write(bytes);output+=bytes;});child.on('error',reject);child.on('exit',code=>{if(log)writeFileSync(path.join(report,log),output);code===0?resolve():reject(Error('La ejecución terminó con código '+code));});});}
await run(process.execPath,['scripts/build.mjs']);
await run(process.execPath,['node_modules/typescript/bin/tsc','--sourceMap']);
console.log('Evidencia de cobertura: '+report);
await run(process.execPath,['node_modules/c8/bin/c8.js','--report-dir',path.join(report,'coverage'),'--temp-directory',path.join(report,'v8'),process.execPath,'--test','--test-concurrency=1',...readdirSync(path.join(backend,'tests')).filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f)],'suite.log');
const summary=JSON.parse(readFileSync(path.join(report,'coverage/coverage-summary.json')));
writeFileSync(path.join(report,'resultado.json'),JSON.stringify({at:new Date().toISOString(),report,backend:summary.total,threshold:90,meetsLineThreshold:summary.total.lines.pct>=90,frozenCommit:false},null,2));
writeFileSync(path.resolve(backend,'../data/testing/coverage/ultima-ejecucion.json'),JSON.stringify({report},null,2));
