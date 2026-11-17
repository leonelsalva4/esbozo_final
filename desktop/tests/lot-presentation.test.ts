import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lotPresentation, type StepResult} from '../src/screens/LoteObtenido/presentation';
const done:StepResult[]=Array.from({length:4},()=>({ok:true,state:'completed'}));
test('la demo revela cuatro pasos en orden y sólo libera alternativas al final',()=>{
 for(let n=0;n<4;n++){
  const p=lotPresentation(done,true,false,false,true,n);
  assert.equal(p.ready,false);assert.equal(p.animating,true);assert.equal(p.completed,n);
  assert.deepEqual(p.states,[...Array(n).fill('completed'),'active',...Array(3-n).fill('pending')]);
 }
 const p=lotPresentation(done,true,false,false,true,4);assert.equal(p.ready,true);assert.equal(p.animating,false);assert.equal(p.completed,4);
});
test('el tiempo visual no convierte un fallo real en éxito',()=>{
 for(const count of [0,2,4,100]){
  const steps:StepResult[]=[...done.slice(0,2),{ok:false,state:'failed'},{ok:false,state:'pending'}];
  const p=lotPresentation(steps,false,false,false,true,count);assert.equal(p.ready,false);assert.equal(p.animating,false);assert.equal(p.completed,2);assert.equal(p.states[2],'failed');
 }
});
test('espera a la respuesta real aunque la animación tenga cuatro pasos revelados',()=>{
 assert.equal(lotPresentation(done,true,true,false,true,4).ready,false);
 assert.equal(lotPresentation(done,true,false,true,true,4).ready,false);
 assert.equal(lotPresentation(done,false,false,false,true,4).ready,false);
 assert.equal(lotPresentation(done.slice(0,3),true,false,false,true,4).ready,false);
 assert.equal(lotPresentation([{ok:true,state:'pending'},...done.slice(1)],true,false,false,true,4).ready,false);
});
test('la reapertura normal conserva el resultado inmediato y no agrega espera',()=>{
 const p=lotPresentation(done,true,false,false,false,0);assert.equal(p.ready,true);assert.equal(p.animating,false);assert.deepEqual(p.states,Array(4).fill('completed'));
});
