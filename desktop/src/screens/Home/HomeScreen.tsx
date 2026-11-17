import { readImageBlob } from "../../api/images";
import { apiFetch } from "../../api/transport";
import { useEffect, useState } from "react";
import { ArrowRight, Package } from "lucide-react";
import type { Session } from "../Login/LoginScreen";
import type { Sketch } from "../../types";
import { AppHeader, type NavKey } from "../../components/AppHeader";
import { Button, Eyebrow } from "../../components/ui/Controls";
import { PageFooter } from "../../components/ui/Brand";
import "./HomeScreen.css";

const API_URL = "http://localhost:4000";

function SketchCard({ sketch, session, onSelect }: {
  sketch: Sketch;
  session: Session;
  onSelect: (sketch: Sketch) => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageRetry, setImageRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setImageUrl(null);
    setImageError(false);
    const loadImage = async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await apiFetch(`${API_URL}/api/assets/${sketch.asset_id}/content`, {
            headers: { Authorization: `Bearer ${session.token}` }, signal: controller.signal,
          });
          if (!response.ok) {
            if (response.status === 503 && attempt === 0) continue;
            throw response;
          }
          return await readImageBlob(response);
        } catch (reason) {
          if (controller.signal.aborted || attempt === 1 || reason instanceof Response) throw reason;
        }
      }
      throw new Error("No se pudo cargar la imagen");
    };
    loadImage()
      .then(blob => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch(() => { if (!controller.signal.aborted) setImageError(true); });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sketch.asset_id, session.token, imageRetry]);

  const count = sketch.lot_count;
  const availability = count === undefined ? "Disponibilidad no documentada"
    : count === 0 ? "Sin lotes disponibles"
    : `${count} ${count === 1 ? "lote disponible" : "lotes disponibles"}`;
  const series = sketch.series.replace(/^Serie\s+/i, "").replace(/\.\s*Sello/, " · Sello");
  const date = /^(sin fecha documentada|no documentado)$/i.test(sketch.date_documented?.trim() ?? "")
    ? "No documentado" : sketch.date_documented || "No documentado";

  return (
    <article className="home-sketch-card" aria-labelledby={`home-sketch-${sketch.id}`}>
      <div className="home-sketch-heading">
        <h2 id={`home-sketch-${sketch.id}`}>Boceto {sketch.id}</h2>
        <span className={`home-lot-badge ${count ? "has-lots" : ""}`}>
          <Package size={14} aria-hidden="true" />{availability}
        </span>
      </div>
      <div className="home-sketch-image">
        {imageUrl && !imageError ? <img src={imageUrl} alt={`Boceto de inventario ${sketch.id}`} onError={() => setImageError(true)} />
          : <span role="status">{imageError ? <>No pudimos cargar la imagen. <button onClick={() => setImageRetry(n => n + 1)}>Reintentar</button></> : "Cargando imagen…"}</span>}
      </div>
      <div className="home-sketch-content">
        <h3>{sketch.title}</h3>
        <p className="home-sketch-series">Serie {series}</p>
        <p className="home-sketch-credit">{sketch.author} · <strong>{sketch.provenance === "Museo Benito Quinquela Martín" ? "Colección MBQM" : sketch.provenance}</strong></p>
        <div className="home-sketch-metadata">
          <p>{sketch.technique} · {sketch.dimensions_cm}</p>
          <p>Fecha: {date}</p>
        </div>
        <button className="home-sketch-button" onClick={() => onSelect(sketch)} aria-label={`Ver detalle del boceto ${sketch.id}`}>
          <ArrowRight size={18} aria-hidden="true" />Ver detalle
        </button>
      </div>
    </article>
  );
}

interface HomeScreenProps {
  session: Session;
  onLogout: () => void;
  onSelectSketch: (sketch: Sketch) => void;
  navEnabled: Partial<Record<NavKey, boolean>>;
  onGoBoceto?: () => void;
  onGoAlternativas?: () => void;
}

export function HomeScreen({ session, onLogout, onSelectSketch, navEnabled, onGoBoceto, onGoAlternativas }: HomeScreenProps) {
  const [sketches, setSketches] = useState<Sketch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    apiFetch(`${API_URL}/api/sketches`, {
      headers: { Authorization: `Bearer ${session.token}` },
      signal: controller.signal,
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => { if (!controller.signal.aborted) setSketches(data); })
      .catch(() => { if (!controller.signal.aborted) setError("No se pudieron cargar los bocetos."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session.token, reload]);

  function handleNavigate(key: NavKey) {
    if (key === "boceto") onGoBoceto?.();
    if (key === "alternativas") onGoAlternativas?.();
  }

  return (
    <div className="home-screen">
      <AppHeader active="inicio" breadcrumb={[{ label: "Inicio" }]} session={session}
        onLogout={onLogout} onNavigate={handleNavigate} navEnabled={navEnabled}
        navigationHint={!navEnabled.boceto ? "Elegí un boceto para habilitar el recorrido." : undefined} plainHomeBreadcrumb />
      <main className="home-main">
        <Eyebrow>Colección disponible</Eyebrow>
        <h1 className="home-title">Bocetos disponibles</h1>
        <p className="home-description">Elegí un boceto para consultar su ficha y acceder a sus lotes de cuatro alternativas.</p>
        {error && <div className="home-error" role="alert"><p>{error}</p><Button onClick={() => setReload(value => value + 1)}>Reintentar</Button></div>}
        {loading && <p className="home-loading" role="status">Cargando bocetos…</p>}
        {!loading && !error && sketches.length === 0 && <p role="status">No hay bocetos disponibles.</p>}
        <div className="home-cards" aria-busy={loading}>
          {sketches.map(sketch => <SketchCard key={sketch.id} sketch={sketch} session={session} onSelect={onSelectSketch} />)}
        </div>
      </main>
      <PageFooter />
    </div>
  );
}
