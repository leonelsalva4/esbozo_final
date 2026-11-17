import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clampComparisonPan} from '../src/screens/Comparacion/geometry.ts';
test('el encuadre vuelve al centro al reducir a tamaño original',()=>{
 assert.deepEqual(clampComparisonPan({x:.4,y:-.4},1,600,400,[{width:1200,height:800}]),{x:0,y:0});
});
test('el paneo se limita al contenido ampliado, sin avanzar sobre márgenes',()=>{
 assert.deepEqual(clampComparisonPan({x:2,y:-2},2,600,400,[{width:1200,height:800}]),{x:.5,y:-.5});
 const value=clampComparisonPan({x:2,y:2},1.5,600,400,[{width:400,height:800}]);assert.equal(value.x,0);assert.equal(value.y,.25);
});
test('dos imágenes sincronizadas respetan el límite común de sus proporciones',()=>{
 const value=clampComparisonPan({x:1,y:1},2,600,400,[{width:1200,height:800},{width:400,height:800}]);assert.equal(value.x,0);assert.equal(value.y,.5);
});
test('los límites proporcionales se conservan al cambiar el tamaño del visor',()=>{
 assert.deepEqual(clampComparisonPan({x:.4,y:.4},2,600,400,[{width:1200,height:800}]),clampComparisonPan({x:.4,y:.4},2,300,200,[{width:1200,height:800}]));
});
