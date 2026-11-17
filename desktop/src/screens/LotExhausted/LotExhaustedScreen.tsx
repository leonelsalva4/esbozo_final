import {ArrowLeft,History,Package} from 'lucide-react';
import type {Session} from '../Login/LoginScreen';
import type {Sketch} from '../../types';
import {AppHeader,type NavKey} from '../../components/AppHeader';
import {PageFooter} from '../../components/ui/Brand';
import {Button,Eyebrow,Notice} from '../../components/ui/Controls';
import './LotExhaustedScreen.css';
export interface ConservedLot{id:string;sketch_id:string;projection_count:number}
interface Props{session:Session;sketch:Sketch;conservedLot:ConservedLot|null;navEnabled:Partial<Record<NavKey,boolean>>;onLogout:()=>void;onGoHome:()=>void;onGoBoceto:()=>void;onGoAlternativas:()=>void;onGoLots:()=>void}
export function LotExhaustedScreen({session,sketch,conservedLot,navEnabled,onLogout,onGoHome,onGoBoceto,onGoAlternativas,onGoLots}:Props){
 return <div className="exhausted-screen"><AppHeader active="boceto" session={session} onLogout={onLogout} navEnabled={navEnabled} breadcrumb={[{label:'Inicio',onClick:onGoHome},{label:`Inventario ${sketch.id}`,onClick:onGoBoceto},{label:'Obtención del lote'}]} onNavigate={key=>{if(key==='inicio')onGoHome();if(key==='boceto')onGoBoceto();if(key==='alternativas')onGoAlternativas();}}/><main className="exhausted-main"><Eyebrow>Obtención local</Eyebrow><div className="exhausted-heading"><div><h1>{conservedLot?'No hay más lotes disponibles':'No hay lotes disponibles'}</h1><p>Boceto {sketch.id}{conservedLot&&<> · Lote <code>{conservedLot.id}</code></>}</p></div><Button onClick={onGoBoceto}><ArrowLeft size={18}/>Volver al boceto</Button></div><section className="exhausted-card"><span className="exhausted-icon"><Package size={21}/></span><h2>{conservedLot?'Ya obtuviste el lote disponible.':'No hay un lote precomputado disponible.'}</h2><p>{conservedLot?'El lote anterior se conserva. Podés volver a consultarlo sin reemplazar sus alternativas ni su candidata.':'Podés consultar los registros del boceto. La aplicación no genera imágenes nuevas.'}</p><Button variant="primary" onClick={onGoLots}><History size={18}/>Ver lotes</Button></section>{conservedLot&&<Notice tone="neutral" title="Lote conservado"><code>{conservedLot.id}</code> · {conservedLot.projection_count} alternativas · Inventario {sketch.id}</Notice>}</main><PageFooter/></div>;
}
