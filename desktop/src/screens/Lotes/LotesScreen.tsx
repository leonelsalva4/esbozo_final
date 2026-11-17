import { apiFetch } from "../../api/transport";
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CircleCheck, Package, RefreshCw } from 'lucide-react';
import type { ConservedLot } from '../LotExhausted/LotExhaustedScreen';
import type { Session } from '../Login/LoginScreen';
import type { Sketch } from '../../types';
import type { LoteObtenidoResult } from '../LoteObtenido/LoteObtenidoScreen';
import { AppHeader, type NavKey } from '../../components/AppHeader';
import { Eyebrow, Notice } from '../../components/ui/Controls';
import { PageFooter } from '../../components/ui/Brand';
import {ReviewCount} from '../../components/ReviewCount';
import './LotesScreen.css';
interface Lot { id:string; sequence:number; projection_count:number; obtained_at:string | null; obtained_by:string | null; candidate_position:number | null; candidate_seed:string | null; candidate_branch:string | null; }
interface Props { onExhausted?:(lot:ConservedLot|null)=>void; session:Session; sketch:Sketch; activeLotId?:string; navEnabled:Partial<Record<NavKey,boolean>>; onLogout:()=>void; onGoHome:()=>void; onGoBoceto:()=>void; onGoAlternativas:()=>void; onOpened:(result:LoteObtenidoResult)=>void; onObtained:(result:LoteObtenidoResult)=>void; }
const API='http://localhost:4000/api';
const PAGE_SIZE=5;
export function LotesScreen({session,sketch,activeLotId,navEnabled,onLogout,onGoHome,onGoBoceto,onGoAlternativas,onOpened,onExhausted,onObtained}:Props){
  const [lots,setLots]=useState<Lot[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string | null>(null);
  const [reload,setReload]=useState(0);
  const [pending,setPending]=useState<string | null>(null);
  const [rowError,setRowError]=useState<{id:string;message:string} | null>(null);
  const [page,setPage]=useState(1);
  const request=useRef<AbortController | null>(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError(null);
    apiFetch(`${API}/sketches/${sketch.id}/lotes`,{headers:{Authorization:`Bearer ${session.token}`},signal:controller.signal})
      .then(response=>response.ok?response.json():Promise.reject())
      .then(data=>{if(!controller.signal.aborted){setLots(data);setPage(current=>Math.min(current,Math.max(1,Math.ceil(data.length/PAGE_SIZE))));}})
      .catch(()=>{if(!controller.signal.aborted)setError('No se pudieron consultar los lotes. El lote activo se conserva.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[sketch.id,session.token,reload]);
  async function open(lot:Lot){
    if(request.current)return;
    const controller=new AbortController();request.current=controller;setPending(lot.id);setRowError(null);
    try{
      const response=await apiFetch(lot.obtained_at?`${API}/lotes/${lot.id}/open`:`${API}/sketches/${sketch.id}/lote/obtain`,{method:lot.obtained_at?'GET':'POST',headers:{Authorization:`Bearer ${session.token}`,'Content-Type':'application/json'},body:lot.obtained_at?undefined:JSON.stringify({loteId:lot.id}),signal:controller.signal});
      const data=await response.json();
      if(!response.ok&&data.failure==='exhausted'&&onExhausted&&!controller.signal.aborted){onExhausted(data.conservedLot??null);return;}
      if(!response.ok)throw new Error(data.error || data.steps?.find((step:{state?:string})=>step.state==='failed')?.detail || 'No se pudo abrir el lote.');
      if(data.sketchId && data.sketchId!==sketch.id)throw new Error('El lote no corresponde al boceto.');
      if(!controller.signal.aborted){if(lot.obtained_at)onOpened(data);else onObtained(data);}
    }catch(reason){if(!controller.signal.aborted)setRowError({id:lot.id,message:reason instanceof Error?reason.message:'No se pudo abrir el lote. El lote activo se conserva.'});}
    finally{request.current=null;if(!controller.signal.aborted)setPending(null);}
  }
  const pages=Math.max(1,Math.ceil(lots.length/PAGE_SIZE));
  return <div className="lots-screen"><AppHeader active="lotes" breadcrumb={[{label:'Inicio',onClick:onGoHome},{label:`Inventario ${sketch.id}`,onClick:onGoBoceto},{label:'Lotes'}]} session={session} onLogout={onLogout} navEnabled={navEnabled} onNavigate={key=>{if(key==='inicio')onGoHome();if(key==='boceto')onGoBoceto();if(key==='alternativas')onGoAlternativas();}}/>
    <main className="lots-main"><div className="lots-heading"><div><Eyebrow>Historial del boceto</Eyebrow><h1>Lotes · Boceto {sketch.id}</h1><p>Consultá los lotes asociados al boceto. Los lotes anteriores se conservan.</p></div><button className="lot-secondary" onClick={onGoBoceto}><ArrowLeft size={18}/>Volver al boceto</button></div>
      {error && <div className="lots-error"><Notice title="No se pudo consultar el historial" tone="error">{error}</Notice><button className="lot-secondary" onClick={()=>setReload(value=>value+1)}>Reintentar</button></div>}
      {rowError && <div className="lots-error"><Notice title="No pudimos reabrir el lote" tone="error">El lote abierto se conserva sin cambios. Podés reintentar la operación.</Notice><button className="lot-secondary" disabled={pending!==null} onClick={()=>{const lot=lots.find(item=>item.id===rowError.id);if(lot)open(lot);}}><RefreshCw size={16}/>Reintentar</button></div>}
      <section className="lots-table-card" aria-busy={loading}><div className="lots-table-title"><h2>{error?'Consulta no disponible':loading?'Consultando lotes…':lots.length===1?'Un lote asociado':`${lots.length} lotes asociados`}</h2><span>Boceto {sketch.id}</span></div><div className="lots-table-scroll"><table><thead><tr><th>Lote</th><th>Obtención</th><th>Candidata</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{lots.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE).map(lot=><tr key={lot.id}><td><code>{lot.id}</code><small>Inventario {sketch.id} · {lot.projection_count} alternativas</small></td><td>{lot.obtained_at?new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(lot.obtained_at)):'No obtenido'}<small>{lot.obtained_by ?? 'Sin responsable de obtención'}</small></td><td>{lot.candidate_position?`Alternativa ${lot.candidate_position} · ${lot.candidate_branch ?? lot.candidate_seed ?? "No documentado"}`:'Sin candidata'}<ReviewCount token={session.token} lotId={lot.id} position={lot.candidate_position}/></td><td><span className="lots-state">{lot.id===activeLotId?<CircleCheck size={14}/>:<Package size={14}/>} {lot.id===activeLotId?'Abierto ahora':lot.obtained_at?'Obtenido':'Disponible'}</span></td><td><button className="lots-open" disabled={pending!==null} onClick={()=>open(lot)}>{lot.obtained_at?<RefreshCw size={16}/>:<ArrowRight size={16}/>} {pending===lot.id?'Comprobando…':lot.obtained_at?'Reabrir lote':'Obtener lote'}</button></td></tr>)}</tbody></table></div>{!loading && !lots.length && !error && <p className="lots-empty">No hay lotes registrados para este boceto.</p>}<div className="lots-pagination"><span>{error?'Total no disponible':loading?'Consultando…':`${lots.length} ${lots.length===1?'lote':'lotes'}`}</span><div><button disabled={page<=1} onClick={()=>setPage(value=>value-1)}>Anterior</button><span>{page}</span><button disabled={page>=pages} onClick={()=>setPage(value=>value+1)}>Siguiente</button></div></div></section>
      <Notice title="Los lotes no se sobrescriben" tone="neutral">Reabrir un lote conserva sus alternativas, su trazabilidad y su candidata.</Notice>
    </main><PageFooter/></div>;
}
