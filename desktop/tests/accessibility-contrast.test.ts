import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const system=readFileSync(new URL('../src/components/ui/system.css',import.meta.url),'utf8');
const stages=readFileSync(new URL('../src/screens/Etapas/EtapasScreen.css',import.meta.url),'utf8');
function declarations(css:string,selector:string){const start=css.indexOf(selector+' {');assert(start>=0,selector);return css.slice(start,css.indexOf('}',start));}
function luminance(hex:string){const c=hex.slice(1).match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('pie y etiquetas de etapas superan 4,5:1 para texto normal usando los colores reales del CSS',()=>{
 assert.equal(contrast('#000000','#ffffff'),21);
 const bg=system.match(/--es-bg:\s*(#[a-f0-9]{6})/i)![1];
 for(const [css,selector,fallback]of [[system,'.es-footer',bg],[stages,'.etapa-tab',null],[stages,'.etapa-tab.no-aplica',null]]as const){
  const rule=declarations(css,selector),color=rule.match(/(?:^|[;{])\s*color:\s*(#[a-f0-9]{6})/i)![1],background=rule.match(/background:\s*(#[a-f0-9]{6})/i)?.[1]??fallback;
  assert(background,selector);assert(contrast(color,background)>=4.5,`${selector}: ${contrast(color,background).toFixed(3)}:1`);
 }
});
