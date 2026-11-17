import { readImageBlob } from "../../api/images";
import { apiFetch } from "../../api/transport";
import { useContext, useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowLeft, ArrowRight, Check, History, Minus, Package, Plus, RotateCcw } from "lucide-react";
import type { ConservedLot } from "../LotExhausted/LotExhaustedScreen";
import type { Session } from "../Login/LoginScreen";
import type { Sketch } from "../../types";
import type { LoteObtenidoResult } from "../LoteObtenido/LoteObtenidoScreen";
import { AppHeader, type NavKey } from "../../components/AppHeader";
import { Eyebrow } from "../../components/ui/Controls";
import { PageFooter } from "../../components/ui/Brand";
import { LotsNavigation } from "../../components/LotsNavigation";
import { Dialog } from "../../components/ui/Dialog";
import "./BocetoScreen.css";

const API_URL = "http://localhost:4000";
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.2;
type LotSummary = { id: string; sequence: number; generated_at: string };
type RegisteredLot = LotSummary & { obtained_at: string | null; obtained_by: string | null; projection_count: number };
type ObtainedStatus = { obtained: boolean; obtainedAt?: string; obtainedBy?: string; lote?: LotSummary };
type LotStatus = { available: boolean; lote?: LotSummary };
interface BocetoScreenProps {
  session: Session;
  sketch: Sketch;
  onLogout: () => void;
  onBackToHome: () => void;
  onExhausted?: (lot:ConservedLot|null)=>void;
  onLoteObtained: (result: LoteObtenidoResult) => void;
  navEnabled: Partial<Record<NavKey, boolean>>;
  onGoHome: () => void;
  onGoAlternativas?: () => void;
  onViewLoteObtenido?: () => void;
}
function displayDate(value?: string | null) {
  if (!value) return "No documentado";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No documentado" : new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function BocetoScreen({ session, sketch, onLogout, onBackToHome, navEnabled, onGoHome, onGoAlternativas, onLoteObtained, onExhausted, onViewLoteObtenido }: BocetoScreenProps) {
  const goLots = useContext(LotsNavigation);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lotStatus, setLotStatus] = useState<LotStatus | null>(null);
  const [obtained, setObtained] = useState<ObtainedStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [reload, setReload] = useState(0);
  const [obtaining, setObtaining] = useState(false);
  const [obtainError, setObtainError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lots, setLots] = useState<RegisteredLot[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const obtainLock = useRef(false);
  const obtainRequest = useRef<AbortController | null>(null);
  const dragStart = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number } | null>(null);

  function clampPan(x: number, y: number, value: number) {
    const viewport = viewportRef.current;
    const image = imageRef.current;
    if (!viewport || !image?.naturalWidth || value <= 1) return { x: 0, y: 0 };
    const fit = Math.min(viewport.clientWidth / image.naturalWidth, viewport.clientHeight / image.naturalHeight);
    const maxX = Math.max(0, (image.naturalWidth * fit * value - viewport.clientWidth) / 2);
    const maxY = Math.max(0, (image.naturalHeight * fit * value - viewport.clientHeight) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  }
  function changeZoom(delta: number) {
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +(zoom + delta).toFixed(2)));
    setZoom(next);
    setPan(current => clampPan(current.x, current.y, next));
  }
  function resetView() { setZoom(1); setPan({ x: 0, y: 0 }); setIsDragging(false); dragStart.current = null; }
  function pointerDown(event: PointerEvent<HTMLImageElement>) {
    if (zoom <= 1 || event.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { mouseX: event.clientX, mouseY: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLImageElement>) {
    const start = dragStart.current;
    if (!start) return;
    setPan(clampPan(start.panX + event.clientX - start.mouseX, start.panY + event.clientY - start.mouseY, zoom));
  }
  function pointerUp() { setIsDragging(false); dragStart.current = null; }

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setImageUrl(null); setImageError(false);
    setZoom(1); setPan({ x: 0, y: 0 }); setIsDragging(false); dragStart.current = null;
    apiFetch(`${API_URL}/api/assets/${sketch.asset_id}/content`, { headers: { Authorization: `Bearer ${session.token}` }, signal: controller.signal })
      .then(readImageBlob)
      .then(blob => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setImageUrl(objectUrl); } })
      .catch(() => { if (!controller.signal.aborted) setImageError(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [sketch.asset_id, session.token, reload]);

  useEffect(() => {
    const controller = new AbortController();
    setLotStatus(null); setObtained(null); setStatusError(false); setObtainError(null);
    const headers = { Authorization: `Bearer ${session.token}` };
    Promise.all(["lote", "lote-obtenido"].map(endpoint => apiFetch(`${API_URL}/api/sketches/${sketch.id}/${endpoint}`, { headers, signal: controller.signal }).then(res => res.ok ? res.json() : Promise.reject(res))))
      .then(([status, saved]) => { if (!controller.signal.aborted) { setLotStatus(status); setObtained(saved); } })
      .catch(() => { if (!controller.signal.aborted) setStatusError(true); });
    return () => controller.abort();
  }, [sketch.id, session.token, reload]);

  useEffect(() => {
    if (!historyOpen) return;
    const controller = new AbortController();
    setLots(null); setHistoryError(false);
    apiFetch(`${API_URL}/api/sketches/${sketch.id}/lotes`, { headers: { Authorization: `Bearer ${session.token}` }, signal: controller.signal })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => { if (!controller.signal.aborted) setLots(data); })
      .catch(() => { if (!controller.signal.aborted) setHistoryError(true); });
    return () => controller.abort();
  }, [historyOpen, sketch.id, session.token, reload]);

  useEffect(() => () => obtainRequest.current?.abort(), [sketch.id, session.token]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => setPan(current => clampPan(current.x, current.y, zoom)));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [zoom, sketch.id]);

  async function obtainLot() {
    if (obtainLock.current || !lotStatus?.available || obtained?.obtained) return;
    obtainLock.current = true;
    const controller = new AbortController();
    obtainRequest.current = controller;
    setObtaining(true); setObtainError(null);
    try {
      const response = await apiFetch(`${API_URL}/api/sketches/${sketch.id}/lote/obtain`, { method: "POST", headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ loteId: lotStatus.lote?.id }), signal: controller.signal });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        if(data.failure==="exhausted"&&onExhausted){onExhausted(data.conservedLot??null);return;}
        setObtainError(data.error ?? "No se pudo obtener el lote.");
        if (data.lote && data.steps?.length === 4) onLoteObtained(data);
        return;
      }
      onLoteObtained(data);
    } catch { if (!controller.signal.aborted) setObtainError("No se pudo conectar con la aplicación. Intentá nuevamente."); }
    finally { obtainLock.current = false; obtainRequest.current = null; if (!controller.signal.aborted) setObtaining(false); }
  }

  const seriesParts = sketch.series.replace(/^Serie\s+/i, "").split(/\.\s*Sello\s*/i);
  const series = seriesParts[0];
  const stamp = seriesParts[1] || "No documentado";
  const collection = sketch.provenance === "Museo Benito Quinquela Martín" ? "Colección MBQM" : sketch.provenance;
  const date = /^sin fecha documentada$/i.test(sketch.date_documented?.trim() ?? "") ? "No documentado" : sketch.date_documented || "No documentado";
  const saved = obtained?.obtained;
  const currentLot = saved ? obtained.lote : lotStatus?.lote;
  const loading = !statusError && (!lotStatus || !obtained);
  const fields = [["Inventario", sketch.id], ["Autor", sketch.author], ["Título", sketch.title], ["Serie", series], ["Sello", stamp], ["Fecha", date], ["Técnica", sketch.technique], ["Dimensiones", sketch.dimensions_cm], ["Colección", collection]];

  return <div className="boceto-screen">
    <AppHeader active="boceto" breadcrumb={[{ label: "Inicio", onClick: onGoHome }, { label: `Inventario ${sketch.id}` }]} session={session} onLogout={onLogout} navEnabled={navEnabled} onNavigate={key => { if (key === "inicio") onGoHome(); if (key === "alternativas") onGoAlternativas?.(); }} />
    <main className="boceto-main">
      <div className="boceto-heading"><div><Eyebrow>Ficha documental</Eyebrow><h1>Boceto de inventario {sketch.id}</h1><p>Revisá la identificación del material y el lote asociado.</p></div><button className="boceto-change" onClick={onBackToHome}><ArrowLeft size={18} />Cambiar de boceto</button></div>
      <div className="boceto-columns">
        <section className="boceto-viewer" aria-label={`Visor del boceto ${sketch.id}`}>
          <h2>Boceto {sketch.id}</h2>
          <div className="boceto-image-viewport" ref={viewportRef}>{imageUrl && !imageError ? <img ref={imageRef} src={imageUrl} alt={`Boceto ${sketch.id}`} className={zoom > 1 ? (isDragging ? "panning" : "zoomed") : ""} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onLostPointerCapture={pointerUp} onError={() => setImageError(true)} draggable={false} /> : <div className="boceto-image-message" role="status">{imageError ? <>Imagen no disponible.<button onClick={() => setReload(value => value + 1)}>Reintentar</button></> : "Cargando imagen…"}</div>}</div>
          <p className="boceto-credit">{sketch.author} · Inventario {sketch.id} · <strong>{collection}</strong></p>
          <div className="boceto-tools" role="group" aria-label="Controles del visor"><button aria-label="Alejar" onClick={() => changeZoom(-ZOOM_STEP)} disabled={!imageUrl || imageError || zoom <= ZOOM_MIN}><Minus size={20} /></button><output aria-label="Porcentaje de zoom">{Math.round(zoom * 100)} %</output><button aria-label="Acercar" onClick={() => changeZoom(ZOOM_STEP)} disabled={!imageUrl || imageError || zoom >= ZOOM_MAX}><Plus size={20} /></button><button className="boceto-reset" onClick={resetView}><RotateCcw size={18} />Restablecer</button></div>
        </section>
        <div className="boceto-right"><section className="boceto-document"><h2>Identificación documental</h2><dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={label === "Inventario" ? "boceto-inventory" : ""}>{value}</dd></div>)}</dl></section>
          <section className="boceto-lot" aria-busy={loading}>
            <div className="boceto-lot-heading"><h2>{statusError ? "Estado del lote no disponible" : loading ? "Consultando lote" : saved ? "Lote obtenido" : lotStatus?.available ? "Lote disponible" : "Sin lotes registrados"}</h2>{currentLot && <span className="boceto-status-badge"><Package size={14} />{saved ? "Obtenido" : "1 lote"}</span>}</div>
            {statusError ? <><p role="alert">No se pudo consultar el estado del lote.</p><button className="boceto-secondary" onClick={() => setReload(value => value + 1)}>Reintentar</button></> : loading ? <p role="status">Consultando los registros locales…</p> : currentLot ? <><code className="boceto-lot-id">{currentLot.id}</code><p className="boceto-lot-description">{saved ? <>Obtenido por {obtained.obtainedBy ?? "No documentado"}<br />{displayDate(obtained.obtainedAt)}</> : "Se recuperarán las cuatro proyecciones ya registradas en el entorno local."}</p><button className="boceto-primary" disabled={obtaining || (saved && !onViewLoteObtenido)} onClick={saved ? onViewLoteObtenido : obtainLot}><ArrowRight size={18} />{obtaining ? "Preparando…" : "Generar"}</button><button className="boceto-secondary" onClick={() => goLots ? goLots() : setHistoryOpen(true)}><History size={18} />Ver lotes</button></> : <><p className="boceto-lot-description">Todavía no hay lotes precomputados cargados para este boceto.</p><button className="boceto-primary" disabled>Sin lotes disponibles</button></>}
            {obtainError && <p className="boceto-error" role="alert">{obtainError}</p>}
          </section>
        </div>
      </div>
    </main><PageFooter />
    <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} title={`Lotes del boceto ${sketch.id}`} wide icon={<History size={22} />} actions={<button className="boceto-secondary" onClick={() => setHistoryOpen(false)}><Check size={16} />Cerrar</button>}>
      <p>Registros locales de sólo lectura.</p>{historyError ? <div role="alert"><p>No se pudieron consultar los lotes.</p><button className="boceto-secondary" onClick={() => setReload(value => value + 1)}>Reintentar</button></div> : lots === null ? <p role="status">Consultando lotes…</p> : lots.length === 0 ? <p>No hay lotes registrados.</p> : <div className="boceto-history">{lots.map(lot => <article key={lot.id}><code>{lot.id}</code><p>{lot.projection_count} alternativas · {lot.obtained_at ? "Obtenido" : "Disponible"}</p>{lot.obtained_at && <p>{lot.obtained_by ?? "No documentado"} · {displayDate(lot.obtained_at)}</p>}{lot.id === obtained?.lote?.id && onViewLoteObtenido && <button className="boceto-secondary" onClick={() => { setHistoryOpen(false); onViewLoteObtenido(); }}>Ver comprobación del lote</button>}</article>)}</div>}
    </Dialog>
  </div>;
}
