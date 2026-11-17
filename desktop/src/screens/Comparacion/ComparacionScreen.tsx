import { readImageBlob } from "../../api/images";
import { apiFetch } from "../../api/transport";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowLeft, Columns2, Layers, Minus, Plus, RotateCcw, Link2, Sparkles, ImageOff, ArrowLeftRight } from "lucide-react";
import type { Session } from "../Login/LoginScreen";
import type { Sketch } from "../../types";
import { AppHeader, type NavKey } from "../../components/AppHeader";
import { PageFooter } from "../../components/ui/Brand";
import { API_URL, alternativeLabel, reviewRequest } from "../../api/reviews";
import { clampComparisonPan, type Pan } from "./geometry";
import "./ComparacionScreen.css";
interface Projection { id: string; position: number; asset_id: string; seed: string | null; branch_label?: string | null }
interface Props { session: Session; sketch: Sketch; loteId: string; initialProjectionId: string; onLogout: () => void; navEnabled: Partial<Record<NavKey, boolean>>; onGoHome: () => void; onGoBoceto: () => void; onGoLoteObtenido: () => void; onGoAlternativas: () => void; onBackToDetail: (id: string) => void }
function useImage(assetId: string | undefined, token: string) {
  const [state, setState] = useState<{ id?: string; url: string | null; error: boolean; width: number; height: number }>({ url: null, error: false, width: 0, height: 0 }), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let url: string | undefined;
    setState({ id: assetId, url: null, error: false, width: 0, height: 0 });
    if (assetId) apiFetch(`${API_URL}/api/assets/${assetId}/content`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal })
      .then(readImageBlob)
      .then(async blob => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob); const image = new Image(); image.src = url; await image.decode();
        if (!controller.signal.aborted) setState({ id: assetId, url, error: false, width: image.naturalWidth, height: image.naturalHeight });
      }).catch(() => { if (!controller.signal.aborted) setState({ id: assetId, url: null, error: true, width: 0, height: 0 }); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [assetId, token, retry]);
  // El recurso anterior nunca se reutiliza mientras cambia la alternativa.
  return { ...(state.id === assetId ? state : { url: null, error: false, width: 0, height: 0 }), retry: () => setRetry(n => n + 1) };
}
type ImageState = ReturnType<typeof useImage>;
function MissingImage({ image, label }: { image: ImageState; label: string }) {
  return <div className="comparison-missing" role="status">{image.error ? <><span><ImageOff size={22} /></span><h2>Imagen no disponible</h2><p>No pudimos mostrar la imagen de {label}. No se muestra otra en su lugar.</p><button className="es-button es-button--primary" onClick={image.retry}><RotateCcw size={18} />Reintentar</button></> : <p>Cargando imagen…</p>}</div>;
}
function usePan(viewport: React.RefObject<HTMLDivElement | null>, images: ImageState[], zoom: number, pan: Pan, onPan: (p: Pan) => void) {
  const drag = useRef<{ x: number; y: number; pan: Pan } | null>(null), [dragging, setDragging] = useState(false);
  const ready = images.every(image => !!image.url && !image.error);
  function clamp(value: Pan) {
    const box = viewport.current;
    if (!box || !ready) return { x: 0, y: 0 };
    return clampComparisonPan(value, zoom, box.clientWidth, box.clientHeight, images);
  }
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const next = clamp(pan); if (next.x !== pan.x || next.y !== pan.y) onPan(next);
    });
    if (viewport.current) observer.observe(viewport.current);
    const next = clamp(pan); if (next.x !== pan.x || next.y !== pan.y) onPan(next);
    return () => observer.disconnect();
  });
  function down(event: PointerEvent<HTMLDivElement>) {
    if (!ready || zoom <= 1 || event.target instanceof HTMLInputElement) return;
    drag.current = { x: event.clientX, y: event.clientY, pan }; setDragging(true); event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const box = viewport.current; if (!drag.current || !box) return;
    onPan(clamp({ x: drag.current.pan.x + (event.clientX - drag.current.x) / box.clientWidth, y: drag.current.pan.y + (event.clientY - drag.current.y) / box.clientHeight }));
  }
  function keyboard(event:KeyboardEvent<HTMLDivElement>) {
    if(event.target!==event.currentTarget||!ready||zoom<=1)return;
    const delta=({ArrowLeft:[1,0],ArrowRight:[-1,0],ArrowUp:[0,1],ArrowDown:[0,-1]} as Record<string,number[]>)[event.key];
    if(event.key==='Home'){event.preventDefault();onPan({x:0,y:0});}
    else if(delta){event.preventDefault();const step=event.shiftKey?.08:.025;onPan(clamp({x:pan.x+delta[0]*step,y:pan.y+delta[1]*step}));}
  }
  function up() { drag.current = null; setDragging(false); }
  return { tabIndex:ready&&zoom>1?0:undefined,role:'group','aria-label':'Imagen ampliable. Usá las flechas para desplazar y la tecla Inicio para centrar.',onKeyDown:keyboard,onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up, className: `comparison-viewport ${ready && zoom > 1 ? "pannable" : ""} ${dragging ? "dragging" : ""}` };
}
const disclaimer = <><Sparkles size={14} /><span>Proyección visual hipotética generada mediante inteligencia artificial</span></>;
function SidePanel({ image, title, source, zoom, pan, onPan, sketchId }: { image: ImageState; title: string; source?: boolean; zoom: number; pan: Pan; onPan: (p: Pan) => void; sketchId: string }) {
  const viewport = useRef<HTMLDivElement>(null), interaction = usePan(viewport, [image], zoom, pan, onPan);
  return <section className={`comparison-panel ${image.error ? "comparison-panel--error" : ""}`} aria-label={title}><h2>{title}</h2><div ref={viewport} {...interaction}>{image.url ? <img src={image.url} alt={title} draggable={false} style={{ transform: `translate(${pan.x * 100}%,${pan.y * 100}%) scale(${zoom})` }} /> : <MissingImage image={image} label={title} />}</div><p className={`comparison-caption ${source ? "source" : ""}`}>{source ? <>Benito Quinquela Martín · Inventario {sketchId} · <strong>Colección MBQM</strong></> : disclaimer}</p></section>;
}
function Overlay({ left, right, leftTitle, rightTitle, zoom, pan, onPan, reset }: { left: ImageState; right: ImageState; leftTitle: string; rightTitle: string; zoom: number; pan: Pan; onPan: (p: Pan) => void; reset: number }) {
  const viewport = useRef<HTMLDivElement>(null), interaction = usePan(viewport, [left, right], zoom, pan, onPan), [divider, setDivider] = useState(50);
  useEffect(() => setDivider(50), [right.url, reset]);
  const draggingDivider = useRef(false);
  const ready = !!left.url && !!right.url;
  const style = { transform: `translate(${pan.x * 100}%,${pan.y * 100}%) scale(${zoom})` };
  return <section className="comparison-panel comparison-overlay"><div className="comparison-overlay-titles"><h2>{leftTitle}</h2><h2>{rightTitle}</h2></div><div ref={viewport} {...interaction}>{ready ? <><img src={left.url!} alt={leftTitle} draggable={false} style={style} /><div className="comparison-overlay-clip" style={{ clipPath: `inset(0 0 0 ${divider}%)` }}><img src={right.url!} alt={rightTitle} draggable={false} style={style} /></div><div className="comparison-divider" style={{ left: `${divider}%` }}><span><ArrowLeftRight size={24} /></span></div><input type="range" min={0} max={100} step={1} value={divider} aria-label="División entre boceto y proyección" aria-valuetext={`${divider}% boceto, ${100 - divider}% proyección`} onChange={event => setDivider(Number(event.target.value))} onPointerDown={event=>{event.preventDefault();event.stopPropagation();event.currentTarget.focus();event.currentTarget.setPointerCapture(event.pointerId);draggingDivider.current=true;}} onPointerMove={event=>{if(!draggingDivider.current||!viewport.current)return;event.stopPropagation();const box=viewport.current.getBoundingClientRect();setDivider(Math.max(0,Math.min(100,(event.clientX-box.left)/box.width*100)));}} onPointerUp={()=>{draggingDivider.current=false;}} onPointerCancel={()=>{draggingDivider.current=false;}} style={{ left: `calc(${divider}% - 24px)` }} /></> : <MissingImage image={left.error ? left : right} label={left.error ? leftTitle : rightTitle} />}</div><p className="comparison-caption">{disclaimer}</p></section>;
}
export function ComparacionScreen({ session, sketch, loteId, initialProjectionId, onLogout, navEnabled, onGoHome, onGoBoceto, onGoAlternativas, onBackToDetail }: Props) {
  const [projections, setProjections] = useState<Projection[]>([]), [currentId, setCurrentId] = useState(initialProjectionId), [mode, setMode] = useState<"side" | "overlay">("side"), [zoom, setZoom] = useState(1), [pan, setPan] = useState<Pan>({ x: 0, y: 0 }), [reset, setReset] = useState(0), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();setError(false);setProjections([]);
    reviewRequest<Projection[]>(session.token, `/api/lotes/${loteId}/projections`, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) { if(!value.some(p=>p.id===initialProjectionId)) throw Error("Alternativa no encontrada"); setProjections(value); } }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [loteId, session.token, initialProjectionId, retry]);
  const current = projections.find(p => p.id === currentId), left = useImage(sketch.asset_id, session.token), right = useImage(current?.asset_id, session.token), missing = left.error || right.error, ready = !!left.url && !!right.url;
  function resetView() { setZoom(1); setPan({ x: 0, y: 0 }); setReset(n => n + 1); }
  function select(id: string) { setCurrentId(id); resetView(); }
  const label = current ? alternativeLabel(current) : "Alternativa";
  return <div className="comparison-screen"><AppHeader active="alternativas" session={session} onLogout={onLogout} navEnabled={navEnabled} breadcrumb={[{ label: "Inicio", onClick: onGoHome }, { label: `Inventario ${sketch.id}`, onClick: onGoBoceto }, { label: "Alternativas", onClick: onGoAlternativas }, { label, onClick: () => onBackToDetail(currentId) }, { label: "Comparación" }]} onNavigate={key => { if (key === "inicio") onGoHome(); if (key === "boceto") onGoBoceto(); if (key === "alternativas") onGoAlternativas(); }} />
    <main className="comparison-main"><div className="comparison-eyebrow">COMPARACIÓN CON EL BOCETO</div><div className="comparison-heading"><div><h1>{mode === "side" ? "Comparación lado a lado" : "Comparación por superposición"}</h1><p>Compará el boceto y la alternativa con el encuadre sincronizado.</p></div><button className="es-button" onClick={() => onBackToDetail(currentId)}><ArrowLeft size={18} />Volver al detalle</button></div>
    <div className="comparison-toolbar"><div className="comparison-modes"><button aria-pressed={mode === "side"} onClick={() => { setMode("side"); resetView(); }}><Columns2 size={18} />Lado a lado</button><button aria-pressed={mode === "overlay"} disabled={missing} onClick={() => { setMode("overlay"); resetView(); }}><Layers size={18} />Superposición</button></div><div className="comparison-tools"><button aria-label="Alejar" disabled={!ready || zoom <= .6} onClick={() => setZoom(z => Math.max(.6, +(z - .2).toFixed(1)))}><Minus size={20} /></button><output aria-label="Nivel de zoom">{Math.round(zoom * 100)} %</output><button aria-label="Acercar" disabled={!ready || zoom >= 2} onClick={() => setZoom(z => Math.min(2, +(z + .2).toFixed(1)))}><Plus size={20} /></button><button disabled={!ready} onClick={resetView}><RotateCcw size={18} />Restablecer encuadre</button></div><span className="comparison-sync"><Link2 size={15} />{missing ? "Imagen no disponible" : "Zoom sincronizado"}</span></div>
    {error ? <div className="comparison-list-error" role="alert"><h2>No se pudo recuperar el lote</h2><p>No se muestran alternativas de otro lote.</p><button className="es-button" onClick={() => setRetry(n => n + 1)}>Reintentar</button></div> : mode === "side" || missing ? <div className="comparison-pair"><SidePanel image={left} title={`Boceto ${sketch.id}`} source zoom={zoom} pan={pan} onPan={setPan} sketchId={sketch.id} /><SidePanel image={right} title={label} zoom={zoom} pan={pan} onPan={setPan} sketchId={sketch.id} /></div> : <Overlay left={left} right={right} leftTitle={`Boceto ${sketch.id} · Colección MBQM`} rightTitle={label} zoom={zoom} pan={pan} onPan={setPan} reset={reset} />}
    <div className="comparison-selector" role="group" aria-label="Alternativas">{projections.map(p => <button key={p.id} aria-pressed={currentId === p.id} onClick={() => select(p.id)}>{alternativeLabel(p)}</button>)}</div></main><PageFooter /></div>;
}
