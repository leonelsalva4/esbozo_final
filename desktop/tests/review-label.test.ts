import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewLabel} from '../src/api/reviews';
test('la documentación incompleta no oculta una conformidad registrada',()=>{
 assert.equal(reviewLabel({documented:false,conforming:1,applicable:null}),'1 etapa conforme · documentación incompleta');
 assert.equal(reviewLabel({documented:false,conforming:0,applicable:null}),'0 etapas conformes · documentación incompleta');
});
test('el conjunto documentado conserva el total de etapas aplicables',()=>{
 assert.equal(reviewLabel({documented:true,conforming:2,applicable:2}),'2 de 2 conformes');
});
