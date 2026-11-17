import { readImageBlob } from "../../api/images";
import { apiFetch } from "../../api/transport";
import { useContext, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Info, AlertTriangle, Sparkles, FileText, ImageOff } from "lucide-react";
import type { Session } from "../Login/LoginScreen";
import type { Sketch } from "../../types";
import { ShellActions } from "../../components/ShellActions";
import { AppHeader, type NavKey } from "../../components/AppHeader";
import { ProjectionViewer } from "../../components/ProjectionViewer";
import { Dialog } from "../../components/ui/Dialog";
import { UnavailableDossier } from "./UnavailableDossier";
import { API_URL, alternativeLabel, reviewRequest, type ProjectionReview } from "../../api/reviews";
import "./TrazabilidadScreen.css";
interface ProjectionIdentity { id:string; position:number; seed:string|null; branch_label?:string|null; asset_id:string; lotId:string }
interface Operation {id:string;stage_key:string|null;source_sha256:string;call_label:string|null;seed:string|null;date_documented:string|null;pipeline:string|null}
interface OperationInput {operation_id:string;field_path:string;role_documented:string;sha256:string;asset_id:string|null;identities:{title:string;inventory:string;sourceSha256:string;field:string}[]}
interface Dossier {
  info: { id: string; position: number; branch_label: string | null; seed: string | null; width: number; height: number; asset_id: string; production_notes: string | null; date_documented: string | null; source_identifier: string; base_model_name: string; base_model_revision: string | null; adapter: string; adapter_sha256: string | null; sha256: string; manifest_sha256: string; export_date: string; mime_type: string };
  review: ProjectionReview;
  externalSelection: { person: string; date_documented: string; modality: string; evidence_sha256: string | null } | null;
  operations:Operation[];
  inputs:OperationInput[];
  records: { sha256: string; original_path: string | null; field_path: string; mime_type: string }[];
}
interface Props {
  session: Session; sketch: Sketch; loteId: string; initialProjectionId: string;
  onLogout: () => void; navEnabled: Partial<Record<NavKey, boolean>>;
  onGoHome: () => void; onGoBoceto: () => void; onGoLoteObtenido: () => void;
  onGoAlternativas: () => void; onBackToDetail: (id: string) => void; onGoComparacion: (id: string) => void;
}
function EvidenceImage({ token, assetId, title, generated = false, caption }: { token: string; assetId: string; title: string; generated?: boolean; caption?:string|null }) {
  const [url, setUrl] = useState<string | null>(null), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let objectUrl: string | undefined;
    setUrl(null); setError(false);
    apiFetch(`${API_URL}/api/assets/${assetId}/content`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: "no-store" })
      .then(readImageBlob)
      .then(blob => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); } })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [assetId, token, retry]);
  return <figure className="dossier-image"><figcaption>{title}</figcaption><div>{url && !error ? <img src={url} alt={title} onError={() => setError(true)} /> : <p role="status">{error ? <>Imagen no disponible. <button onClick={() => setRetry(n => n + 1)}>Reintentar</button></> : "Cargando imagen…"}</p>}</div>{caption===null?null:generated ? <p className="dossier-image-note"><Sparkles size={14} />Proyección visual hipotética generada mediante inteligencia artificial</p> : <p className="dossier-image-note">{caption??"Benito Quinquela Martín · Colección MBQM"}</p>}</figure>;
}
export function TrazabilidadScreen({ session, sketch, loteId, initialProjectionId, onLogout, navEnabled, onGoHome, onGoBoceto, onGoAlternativas, onBackToDetail }: Props) {
  const {onOperations}=useContext(ShellActions);
  const [data, setData] = useState<Dossier | null>(null), [error, setError] = useState(false), [retry, setRetry] = useState(0), [loading, setLoading] = useState(true);
  const [inputPreview,setInputPreview]=useState<{assetId:string;title:string}|null>(null);
  const [selectedGuide,setSelectedGuide]=useState<string|null>(null);
  const [identity,setIdentity]=useState<ProjectionIdentity|null>(null),[identityLoading,setIdentityLoading]=useState(true);
  const [record, setRecord] = useState<{ title: string; text: string } | null>(null), [recordError, setRecordError] = useState<string | null>(null), [recordLoading, setRecordLoading] = useState(false);
  useEffect(()=>{setError(false);},[session.token,loteId,initialProjectionId]);
  useEffect(()=>{
    const controller=new AbortController();setIdentityLoading(true);
    reviewRequest<Omit<ProjectionIdentity,'lotId'>[]>(session.token,`/api/lotes/${loteId}/projections`,{signal:controller.signal})
      .then(items=>{if(!controller.signal.aborted){const item=items.find(p=>p.id===initialProjectionId);setIdentity(item?{...item,lotId:loteId}:null);}})
      .catch(()=>{if(!controller.signal.aborted)setIdentity(null);})
      .finally(()=>{if(!controller.signal.aborted)setIdentityLoading(false);});
    return()=>controller.abort();
  },[session.token,loteId,initialProjectionId,retry]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setData(null); setRecord(null); setRecordError(null);
    reviewRequest<Dossier>(session.token, `/api/lotes/${loteId}/projections/${initialProjectionId}/dossier`, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) {setData(value);setError(false);} })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session.token, loteId, initialProjectionId, retry]);
  async function openRecord(hash: string, title: string) {
    setRecordLoading(true); setRecordError(null);
    try {
      const response = await apiFetch(`${API_URL}/api/lotes/resources/${hash}`, { headers: { Authorization: `Bearer ${session.token}` }, cache: "no-store" });
      if (!response.ok) throw Error("No se pudo recuperar el registro de producción.");
      const text = await response.text();
      setRecord({ title, text: response.headers.get("Content-Type")?.includes("application/json") ? JSON.stringify(JSON.parse(text), null, 2) : text });
    } catch { setRecordError("Registro no disponible. Podés volver a intentar abrirlo."); }
    finally { setRecordLoading(false); }
  }
  if (error) return <UnavailableDossier session={session} sketchId={sketch.id} lotId={loteId} projectionId={initialProjectionId} projection={identity?.id===initialProjectionId&&identity.lotId===loteId?identity:undefined} projectionLoading={identityLoading} pending={loading} navEnabled={navEnabled} onLogout={onLogout} onGoHome={onGoHome} onGoBoceto={onGoBoceto} onGoAlternativas={onGoAlternativas} onBack={() => onBackToDetail(initialProjectionId)} onRetry={() => setRetry(n => n + 1)} />;
  const review = data?.review, info = data?.info, candidate = review?.candidate;
  const records = [...new Map((data?.records ?? []).map(item => [item.sha256, item])).values()];
  const guides=[...new Map((review?.stages.flatMap(s=>s.guides)??[]).filter((g):g is {assetId:string;title?:string;id?:string}=>!!g&&typeof g==='object'&&'assetId' in g&&typeof g.assetId==='string').map(g=>[g.assetId,g])).values()];
  const guide=guides.find(g=>g.assetId===selectedGuide)??guides[0];
  const rows = info ? [
    ["Modelo base", info.base_model_name], ["Adaptación", info.adapter],
    ["Entorno de producción", "Fuera de la aplicación · registros originales por operación"],
    ["Revisión exacta del modelo", info.base_model_revision ?? "No documentado"],
    ["Dimensiones del archivo disponible", `${info.width} × ${info.height} px`],
    ["Etiqueta de la rama", `${info.branch_label ?? "No documentado"} · no es una semilla única de toda la secuencia`],
    ["Semilla global", info.seed ?? "No documentado"],
    ["Semillas descritas por operación", info.production_notes ?? "Ver registros originales"],
    ["Acabado pictórico", review?.stages.find(s => s.key === "finish")?.status ?? "No documentado"],
    ["Identificador del lote de origen", info.source_identifier],
    ["Fecha de producción documentada", info.date_documented ?? "No documentado"],
    ["SHA-256 de la imagen final", info.sha256], ["SHA-256 del adaptador registrado", info.adapter_sha256 ?? "No documentado"],
    ["SHA-256 del índice de entrega", info.manifest_sha256],
  ] : [];
  return <div className="dossier-screen"><AppHeader active="alternativas" session={session} onLogout={onLogout} navEnabled={navEnabled} breadcrumb={[{ label: "Inicio", onClick: onGoHome }, { label: `Inventario ${sketch.id}`, onClick: onGoBoceto }, { label: "Alternativas", onClick: onGoAlternativas }, { label: info ? alternativeLabel(info) : "Detalle proyección", onClick: () => onBackToDetail(initialProjectionId) }, { label: "Trazabilidad" }]} onNavigate={key => { if (key === "inicio") onGoHome(); if (key === "boceto") onGoBoceto(); if (key === "alternativas") onGoAlternativas(); }} />
    <main className="dossier-main"><div className="dossier-eyebrow">PROCEDENCIA DOCUMENTADA</div><div className="dossier-title"><div><h1>Trazabilidad</h1><p>Consultá el origen, las etapas y las condiciones de producción de la alternativa.</p></div><button className="es-button" onClick={() => onBackToDetail(initialProjectionId)}><ArrowLeft size={18} />Volver al detalle</button></div>
    {loading ? <p role="status">Consultando procedencia…</p> : info && review && <>
      <div className="dossier-summary"><div><span>Alternativa</span><strong>{alternativeLabel(info)}</strong></div><div><span>Lote</span><strong className="dossier-mono">{loteId}</strong></div><div><span>Selección</span><strong>{candidate?.projection_id === info.id ? "Candidata" : "Sin selección de esta alternativa"}</strong></div><div><span>Conformidad</span><strong>{review.conforming} de {review.applicable ?? "—"} etapas aplicables</strong></div></div>
      <h2 className="dossier-heading"><i>1</i>Cadena de procedencia</h2><div className="dossier-chain">{[[`Boceto ${sketch.id}`, "Documento de origen. Colección MBQM."], ["Guías interpretativas", guides.length?"Guías vinculadas por registro.":"Guías adoptadas: no documentadas."], ["Etapas", review.stages.map(s => `${s.label}: ${s.status}`).join(" · ")], ["Lote", loteId], ["Proyección", alternativeLabel(info)]].map(([title, text]) => <div key={title}><strong>{title}</strong><p>{text}</p></div>)}</div>
      <h2 className="dossier-heading"><i>2</i>Material de origen y proyección final</h2><div className="dossier-pair"><EvidenceImage token={session.token} assetId={sketch.asset_id} title={`Boceto de origen · Inventario ${sketch.id}`} /><EvidenceImage token={session.token} assetId={info.asset_id} title={`Proyección final · ${alternativeLabel(info)}`} generated /></div>
      <h2 className="dossier-heading"><i>3</i>Guías y etapas</h2><div className="dossier-pair dossier-guides"><div className="dossier-guide-image">{guide?<EvidenceImage token={session.token} assetId={guide.assetId} title={guide.title??'Guía interpretativa documentada'} caption={null}/>:<figure className="dossier-image"><figcaption>Guías interpretativas · Inventario {sketch.id}</figcaption><div className="dossier-guide-empty"><ImageOff size={23}/><h3>Guía no documentada</h3><p>No se incorporó una guía adoptada con asociación verificable a esta alternativa.</p></div></figure>}{guides.length>1&&<label className="dossier-guide-select">Guía documentada<select value={guide?.assetId} onChange={event=>setSelectedGuide(event.target.value)}>{guides.map(g=><option key={g.assetId} value={g.assetId}>{g.title??g.id??g.assetId}</option>)}</select></label>}<p className="dossier-guide-caption">{guide?'Recurso interpretativo de producción; procedencia en el registro vinculado.':'La ausencia de una asociación documentada no se completa con otra imagen.'}</p></div><div className="dossier-stage-card"><div className="dossier-stages">{review.stages.map((s, i) => <div key={s.key} className={s.status === "Conforme" ? "conforming" : s.status === "No aplica" ? "not-applicable" : ""}><CheckCircle2 size={17} /><div><strong>{i + 1}. {s.label}</strong><span>{s.status}</span></div></div>)}</div><h3>Conformidades registradas en Esbozo</h3><p>Las revisiones corresponden a cada etapa de esta alternativa. Una selección externa de imágenes no registra una conformidad en la aplicación.</p>{review.stages.some(s => !s.assetId && s.applicability !== "not_applicable") && <div className="dossier-notice warning"><AlertTriangle size={20} /><div><strong>Recursos pendientes</strong><p>{review.stages.filter(s => !s.assetId && s.applicability !== "not_applicable").map(s => `${s.label}: ${s.status}`).join(". ")}. No se muestra otro archivo en su lugar.</p></div></div>}</div></div>
      <h2 className="dossier-heading"><i>4</i>Detalle técnico · solo lectura</h2><dl className="dossier-technical">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <h2 className="dossier-heading"><i>5</i>Revisión y registro</h2><div className="dossier-notice"><Info size={18} /><div><strong>Sin valoración experta registrada</strong><p>La proyección no se presenta como validada. La candidata es una selección humana reversible.</p></div></div><div className="dossier-review"><h3>Selección de candidata</h3>{candidate ? <p>{candidate.projection_id === info.id ? "Esta alternativa es la candidata del lote." : `La candidata es la alternativa ${candidate.position}.`} {candidate.display_name ?? "Usuario no disponible"} · {new Date(candidate.set_at).toLocaleString("es-AR")}</p> : <p>Todavía no se marcó una candidata para este lote.</p>}{data?.externalSelection && <><h3>Selección externa documentada</h3><p>{data.externalSelection.person} · {data.externalSelection.date_documented} · {data.externalSelection.modality}</p><p>Corresponde a la producción de la imagen; no equivale a la candidata del lote en Esbozo.</p>{data.externalSelection.evidence_sha256 && <button className="es-button" disabled={recordLoading} onClick={() => openRecord(data.externalSelection!.evidence_sha256!, "Evidencia de selección externa")}><FileText size={16} />Consultar evidencia original</button>}</>}</div>
      <div className="dossier-records">{onOperations&&<button className="es-button" onClick={()=>onOperations({inventory:sketch.id,lot:loteId,projection:initialProjectionId})}><FileText size={16}/>Ver registro de operaciones</button>}<details className="dossier-originals"><summary>Consultar los registros e insumos de producción</summary><h3>Operaciones vinculadas por registro</h3><p>Se conserva la relación documental. No se afirma una corrida homogénea ni una revisión humana. Los intermedios técnicos pueden no corresponder a una etapa de la interfaz.</p>{data?.operations.map(operation=><article className="dossier-operation" key={operation.id}><h4>{operation.call_label??"Operación sin etiqueta documentada"}</h4><p>{operation.pipeline??"Pipeline no documentado"} · Semilla de esta operación: {operation.seed??"No documentado"}</p><button className="es-button" disabled={recordLoading} onClick={()=>openRecord(operation.source_sha256,operation.call_label??"Registro de operación")}><FileText size={15}/>Consultar registro original</button><ul>{data.inputs.filter(input=>input.operation_id===operation.id).map(input=><li key={`${input.field_path}-${input.sha256}`}><div><strong>{({base:"Base",parent:"Composición de origen",reference:"Referencia pictórica",mask:"Máscara",example_before:"Ejemplo previo",example_after:"Ejemplo posterior"} as Record<string,string>)[input.role_documented]??input.role_documented}</strong><code>{input.sha256}</code>{input.identities.map(identity=><p key={`${identity.sourceSha256}-${identity.field}`}>{identity.title} · Inventario {identity.inventory} <button disabled={recordLoading} onClick={()=>openRecord(identity.sourceSha256,"Procedencia de la referencia")}>Consultar procedencia</button></p>)}</div>{input.asset_id?<button className="es-button" onClick={()=>setInputPreview({assetId:input.asset_id!,title:`Insumo documentado · ${input.role_documented}`})}>Ver imagen</button>:<span>Recurso no incorporado</span>}</li>)}</ul></article>)}<h3>Otros documentos vinculados por hash</h3><p>Vínculos documentados mediante SHA-256. La presencia de una relación no afirma que todos los recursos mencionados hayan sido adoptados.</p>{records.length ? records.map(r => <button key={r.sha256} disabled={recordLoading} onClick={() => openRecord(r.sha256, r.original_path?.split("/").pop() ?? r.sha256)}><FileText size={16} /><span>{r.original_path?.split("/").pop() ?? r.sha256}<small>{r.sha256}</small></span></button>) : <p>No se encontraron registros asociados por hash a estos archivos.</p>}{recordError && <p role="alert">{recordError}</p>}</details></div>
    </>}</main><Dialog open={!!record} onClose={()=>setRecord(null)} title={record?.title ?? "Registro original"} wide className="dossier-record-dialog">{record && <pre tabIndex={0}>{record.text}</pre>}</Dialog><Dialog open={!!inputPreview} onClose={()=>setInputPreview(null)} title={inputPreview?.title??"Insumo documentado"} wide>{inputPreview&&<ProjectionViewer token={session.token} assetId={inputPreview.assetId} title={inputPreview.title} disclaimer="Insumo de producción conservado; función según el registro original"/>}</Dialog></div>;
}
