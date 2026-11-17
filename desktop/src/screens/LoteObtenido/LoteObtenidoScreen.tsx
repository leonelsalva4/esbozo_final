import { apiFetch } from "../../api/transport";
import { useContext, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleX, FileText, History, LoaderCircle, Minus, RefreshCw } from "lucide-react";
import type { ConservedLot } from "../LotExhausted/LotExhaustedScreen";
import type { Session } from "../Login/LoginScreen";
import type { Sketch } from "../../types";
import { AppHeader, type NavKey } from "../../components/AppHeader";
import { LotsNavigation } from "../../components/LotsNavigation";
import { Eyebrow, Notice } from "../../components/ui/Controls";
import { PageFooter } from "../../components/ui/Brand";
import { ShellActions } from "../../components/ShellActions";
import { lotPresentation } from "./presentation";
import "./LoteObtenidoScreen.css";

export interface VerificationStep { key: string; label: string; ok: boolean; detail?: string; state?: "completed" | "failed" | "pending"; }
export interface LoteObtenidoResult {
  lote: { id: string; sequence: number; generated_at: string };
  steps: VerificationStep[];
  ok?: boolean;
  obtainedAt?: string;
  obtainedBy?: string;
  projectionCount?: number;
  failure?: string | null;
}
export type RevealMode = "instant" | "demo";
interface Props {
  onExhausted?:(lot:ConservedLot|null)=>void;
  session: Session; sketch: Sketch; result: LoteObtenidoResult;
  revealMode: RevealMode;
  onLogout: () => void; onBackToHome: () => void; onViewProjections: () => void;
  navEnabled: Partial<Record<NavKey, boolean>>; onGoHome: () => void; onGoBoceto: () => void;
  onVerified?: (result: LoteObtenidoResult) => void;
}
const API_URL = "http://localhost:4000";
export function LoteObtenidoScreen({ session, sketch, result, revealMode, onLogout, onViewProjections, navEnabled, onGoHome, onGoBoceto, onExhausted, onVerified }: Props) {
  const {onOperations}=useContext(ShellActions);
  const goLots = useContext(LotsNavigation);
  const [current, setCurrent] = useState<LoteObtenidoResult | null>(result.steps[0]?.key === "locate" && typeof result.ok === "boolean" ? result : null);
  const [loading, setLoading] = useState(!(result.steps[0]?.key === "locate" && typeof result.ok === "boolean"));
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [revealed, setRevealed] = useState(revealMode === "demo" ? 0 : 4);
  useEffect(() => {
    if (result.steps[0]?.key === "locate" && typeof result.ok === "boolean" && reload === 0) { setCurrent(result); return; }
    const controller = new AbortController();
    setLoading(true); setError(null); setCurrent(null);
    apiFetch(result.obtainedAt ? `${API_URL}/api/lotes/${result.lote.id}/open` : `${API_URL}/api/sketches/${sketch.id}/lote/obtain`, {
      method: result.obtainedAt ? "GET" : "POST",
      headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" },
      body: result.obtainedAt ? undefined : JSON.stringify({ loteId: result.lote.id }), signal: controller.signal,
    })
      .then(async response => {
        const data = await response.json();
        if(!response.ok&&data.failure==="exhausted"&&onExhausted&&!controller.signal.aborted){onExhausted(data.conservedLot??null);return;}
        if (!response.ok && !data.steps) throw new Error(data.error || "No se pudo consultar el lote.");
        if (!controller.signal.aborted) { setCurrent(data); if (response.ok) onVerified?.(data); }
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message || "No se pudo completar la operación."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
    // La consulta real es independiente de la reproducción visual de demostración.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.lote.id, session.token, reload]);
  const steps = current?.steps ?? [];
  const { successful, animating, ready, completed, states } = lotPresentation(steps, current?.ok === true && current.lote.id === result.lote.id, loading, !!error, revealMode === "demo", revealed);
  useEffect(() => {
    if (!successful) { setRevealed(0); return; }
    if (revealMode !== "demo" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setRevealed(4); return; }
    setRevealed(0);
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1;
      setRevealed(count);
      if (count >= 4) window.clearInterval(timer);
    }, 900);
    return () => window.clearInterval(timer);
  }, [successful, result.lote.id, reload, revealMode]);
  const busy = loading || animating;
  const title = busy || !current && !error ? revealMode === "demo" ? "Preparando las alternativas…" : "Verificando el lote…" : error ? "No se pudo completar la operación" : ready ? "El lote está listo" : current?.failure === "integrity" ? "La integridad del lote no coincide" : "El lote está incompleto";
  return <div className="lote-screen">
    <AppHeader active="boceto" breadcrumb={[{ label: "Inicio", onClick: onGoHome }, { label: `Inventario ${sketch.id}`, onClick: onGoBoceto }, { label: "Obtención del lote" }]} session={session} onLogout={onLogout} navEnabled={{ ...navEnabled, alternativas: ready }} onNavigate={key => { if (key === "inicio") onGoHome(); if (key === "boceto") onGoBoceto(); if (key === "alternativas" && ready) onViewProjections(); }} />
    <main className="lote-main"><div className="lote-heading"><div><Eyebrow>{revealMode === "demo" ? "Demostración · resultados precargados" : "Obtención local"}</Eyebrow><h1>{title}</h1><p>Boceto {sketch.id} · Lote <code>{result.lote.id}</code></p></div><button className="lot-secondary" onClick={onGoBoceto}><ArrowLeft size={18} />Volver al boceto</button></div>
      <div className="lote-columns"><section className="lote-checklist" aria-label="Verificación del lote" aria-busy={busy}>
        {steps.length ? steps.map((step, index) => {
          const state = states[index];
          return <div className={`lot-step lot-step--${state}`} key={step.key}><span className="lot-step-icon">{state === "completed" ? <Check size={18} /> : state === "failed" ? <CircleX size={18} /> : state === "active" ? <LoaderCircle className="lot-spinner" size={18} /> : <Minus size={18} />}</span><div><h2>{index + 1}. {step.label}</h2><p>{animating && state !== "completed" ? state === "active" ? "Preparando este paso de la demostración…" : "A continuación…" : step.detail}</p></div><span className="lot-step-state">{state === "completed" && <Check size={12} />}{state === "completed" ? "Completado" : state === "failed" ? "No completado" : state === "active" ? "En curso" : "Pendiente"}</span></div>;
        }) : <p className="lot-pending" role="status">{error ? "La consulta no se completó. No se modificó el lote guardado." : "Recuperando y verificando los recursos locales…"}</p>}
      </section>
      {animating ? <section className="lote-summary lote-summary--preparing" role="status" aria-live="polite">
        <span className="lot-success lot-preparing"><LoaderCircle className="lot-spinner" size={32} /></span>
        <h2>Preparando el lote</h2><code>{result.lote.id}</code>
        <div className="lot-demo-progress" role="progressbar" aria-label="Pasos de la demostración" aria-valuemin={0} aria-valuemax={4} aria-valuenow={completed}><span style={{width:`${completed * 25}%`}} /></div>
        <p className="lot-demo-count">{completed} / 4 pasos</p>
        <p>Simulación visual de la demo.<br />Se utilizan las proyecciones ya producidas.</p>
        <button className="lot-primary" disabled><LoaderCircle className="lot-spinner" size={18} />Preparando…</button>
      </section> : ready ? <section className="lote-summary"><span className="lot-success"><Check size={32} /></span><h2>Lote recuperado</h2><code>{result.lote.id}</code><div className="lot-stats"><div><strong>{current?.projectionCount ?? 4}</strong><span>alternativas disponibles</span></div><div><strong>{completed} / 4</strong><span>operaciones completadas</span></div></div><p>Las imágenes ya estaban producidas.<br />La aplicación recuperó y verificó el lote.</p><button className="lot-primary" onClick={onViewProjections}><ArrowRight size={18} />Ver cuatro proyecciones</button><button className="lot-records" onClick={() => onOperations?.({inventory:sketch.id,lot:result.lote.id})}><FileText size={18} />Ver los registros</button></section>
        : <section className="lot-failure"><Notice title={loading ? "Consulta en curso" : error ? "El estado anterior se conserva" : "No se muestran alternativas"} tone={loading ? "info" : "error"}>{error ?? steps.find(step => step.state === "failed" || !step.ok && step.state !== "pending")?.detail ?? "Se están comprobando los recursos del lote."}</Notice><dl><div><dt>Recurso</dt><dd><code>{result.lote.id}</code></dd></div><div><dt>Boceto</dt><dd>{sketch.id}</dd></div><div><dt>Estado</dt><dd>{loading ? "Consulta en curso" : "Operación no completada"}</dd></div></dl><button className="lot-primary" disabled={loading} onClick={() => setReload(value => value + 1)}><RefreshCw size={18} />Reintentar</button><button className="lot-secondary" onClick={onGoBoceto}><ArrowLeft size={18} />Volver al boceto</button>{goLots && <button className="lot-history-link" onClick={goLots}><History size={15} />Ver lotes conservados</button>}</section>}
      </div>
    </main><PageFooter />

  </div>;
}
