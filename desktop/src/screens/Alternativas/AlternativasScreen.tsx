import { readImageBlob } from "../../api/images";
import { apiFetch } from "../../api/transport";
import { useContext, useEffect, useState } from "react";
import { ArrowRight, CircleCheck, History, ImageOff, Sparkles } from "lucide-react";
import type { Session } from "../Login/LoginScreen";
import type { Sketch } from "../../types";
import { AppHeader, type NavKey } from "../../components/AppHeader";
import { LotsNavigation } from "../../components/LotsNavigation";
import { Eyebrow, Notice } from "../../components/ui/Controls";
import { PageFooter } from "../../components/ui/Brand";
import {reviewLabel,reviewRequest} from "../../api/reviews";
import "./AlternativasScreen.css";
interface Summary {id:string;documented:boolean;conforming:number;applicable:number|null;}
const API_URL = "http://localhost:4000";
interface Projection { id:string; position:number; seed:string | number; branch_label?:string; generated_at:string; asset_id:string; is_candidate:boolean; }
function ProjectionCard({ projection, session, onViewDetail,summary,summaryFailed }: { projection:Projection; session:Session;summary?:Summary;summaryFailed:boolean; onViewDetail:(id:string)=>void }) {
  const [url,setUrl] = useState<string | null>(null);
  const [error,setError] = useState(false);
  useEffect(() => {
    const controller=new AbortController(); let objectUrl:string | null=null;
    setUrl(null); setError(false);
    apiFetch(`${API_URL}/api/assets/${projection.asset_id}/content`,{headers:{Authorization:`Bearer ${session.token}`},signal:controller.signal,cache:'no-store'})
      .then(readImageBlob)
      .then(blob=>{if(!controller.signal.aborted){objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);}})
      .catch(()=>{if(!controller.signal.aborted)setError(true);});
    return ()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[projection.asset_id,session.token]);
  return <article className={`alt-card ${projection.is_candidate?'candidate':''}`} aria-labelledby={`alt-${projection.id}`}>
    <div className="alt-card-heading"><h2 id={`alt-${projection.id}`}>Alternativa {projection.position} · <code>{projection.branch_label ?? projection.seed ?? "No documentado"}</code></h2>{projection.is_candidate && <span className="alt-candidate"><CircleCheck size={14}/>Candidata</span>}</div>
    <div className="alt-viewer"><div className="alt-image-stage">{url && !error ? <img src={url} alt={`Alternativa ${projection.position}`} onError={()=>setError(true)}/> : <div className={`alt-image-placeholder ${error?'alt-image-placeholder--error':''}`} role="status">{error?<><ImageOff size={18}/><strong>Imagen no disponible</strong><small>Alternativa {projection.position} · {projection.branch_label ?? projection.seed ?? "No documentado"}</small></>:<span>Cargando imagen…</span>}</div>}</div><p className="alt-disclaimer"><Sparkles size={14} aria-hidden="true"/><span>Proyección visual hipotética generada mediante inteligencia artificial</span></p></div>
    <div className="alt-card-footer"><span className="alt-conformity">{summary?reviewLabel(summary):summaryFailed?'Conformidades no disponibles':'Consultando conformidades…'}</span><button onClick={()=>onViewDetail(projection.id)} aria-label={`Ver detalle de la alternativa ${projection.position}`}><ArrowRight size={18}/>Ver detalle</button></div>
  </article>;
}
interface Props { session:Session; sketch:Sketch; loteId:string; onLogout:()=>void; navEnabled:Partial<Record<NavKey,boolean>>; onGoHome:()=>void; onGoBoceto:()=>void; onGoLoteObtenido:()=>void; onViewDetail:(id:string)=>void; }
export function AlternativasScreen({session,sketch,loteId,onLogout,navEnabled,onGoHome,onGoBoceto,onGoLoteObtenido,onViewDetail}:Props){
  const goLots=useContext(LotsNavigation);
  const [summaryFailed,setSummaryFailed]=useState(false);
  const [summaries,setSummaries]=useState<Summary[]>([]);
  const [projections,setProjections]=useState<Projection[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string | null>(null);
  const [reload,setReload]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError(null);setProjections([]);setSummaries([]);setSummaryFailed(false);
    const headers={Authorization:`Bearer ${session.token}`};
    Promise.all([apiFetch(`${API_URL}/api/lotes/${loteId}/open`,{headers,signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok && !(response.status===422 && data.obtainedAt)){throw new Error(data.error || data.steps?.find((step:{ok:boolean;state?:string})=>!step.ok && step.state==='failed')?.detail || 'No se pudo verificar la integridad del lote.');}return data;}),apiFetch(`${API_URL}/api/lotes/${loteId}/projections`,{headers,signal:controller.signal}).then(response=>response.ok?response.json():Promise.reject(new Error('No se pudieron cargar las alternativas.')))])
      .then(([,data])=>{if(!controller.signal.aborted){if(data.length!==4)throw new Error('El lote no contiene las cuatro alternativas.');setProjections(data);}})
      .catch(reason=>{if(!controller.signal.aborted)setError(reason.message || 'No se pudieron cargar las alternativas.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    reviewRequest<Summary[]>(session.token,`/api/lotes/${loteId}/reviews`,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setSummaries(data);}).catch(()=>{if(!controller.signal.aborted)setSummaryFailed(true);});
    return()=>controller.abort();
  },[loteId,session.token,reload]);
  return <div className="alt-screen"><AppHeader active="alternativas" breadcrumb={[{label:'Inicio',onClick:onGoHome},{label:`Inventario ${sketch.id}`,onClick:onGoBoceto},{label:'Obtención del lote',onClick:onGoLoteObtenido},{label:'Alternativas'}]} session={session} onLogout={onLogout} navEnabled={navEnabled} onNavigate={key=>{if(key==='inicio')onGoHome();if(key==='boceto')onGoBoceto();}}/>
    <main className="alt-main"><div className="alt-heading"><div><Eyebrow>Proyecciones hipotéticas</Eyebrow><h1>Alternativas disponibles</h1><p>Lote <code>{loteId}</code> · Abrí una alternativa para revisarla. El orden no indica preferencia.</p></div><button className="alt-history-button" onClick={goLots} disabled={!goLots}><History size={18}/>Ver lotes</button></div>
      {loading && <p role="status" className="alt-loading">Recuperando y verificando las alternativas…</p>}{error && <div className="alt-error"><Notice tone="error" title="No se muestran alternativas">{error}</Notice><button className="alt-history-button" onClick={()=>setReload(value=>value+1)}>Reintentar</button></div>}
      <div className="alt-grid" aria-busy={loading}>{projections.map(projection=><ProjectionCard key={projection.id} projection={projection} summaryFailed={summaryFailed} summary={summaries.find(item=>item.id===projection.id)} session={session} onViewDetail={onViewDetail}/>)}</div>
    </main><PageFooter/></div>;
}
