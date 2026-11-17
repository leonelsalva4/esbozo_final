import { readImageBlob } from "../api/images";
import { apiFetch } from "../api/transport";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ImageOff, Minus, Plus, RotateCcw, Sparkles } from "lucide-react";
import { API_URL } from "../api/reviews";
import "./ProjectionViewer.css";
interface Props {
  tools?: boolean;
  disclaimer?: string;
  token: string;
  assetId: string | null;
  title: string;
  message?: string;
  explanation?: string;
  selector?: { id: string; label: string }[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onReadyChange?: (ready: boolean) => void;
}
export function ProjectionViewer(props:Props) { return <ProjectionViewerContent key={props.assetId ?? "no-resource"} {...props} />; }
function ProjectionViewerContent({
  tools = true,
  disclaimer = "Proyección visual hipotética generada mediante inteligencia artificial",
  token,
  assetId,
  title,
  message,
  explanation,
  selector,
  selectedId,
  onSelect,
  onReadyChange,
}: Props) {
  const [url, setUrl] = useState<string | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [dragging, setDragging] = useState(false);
  const viewport = useRef<HTMLDivElement>(null),
    image = useRef<HTMLImageElement>(null),
    drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
      null,
    );
  function clamp(x: number, y: number, z: number) {
    const box = viewport.current,
      img = image.current;
    if (!box || !img?.naturalWidth || z <= 1) return { x: 0, y: 0 };
    const scale = Math.min(
      box.clientWidth / img.naturalWidth,
      box.clientHeight / img.naturalHeight,
    );
    const maxX = Math.max(
        0,
        (img.naturalWidth * scale * z - box.clientWidth) / 2,
      ),
      maxY = Math.max(
        0,
        (img.naturalHeight * scale * z - box.clientHeight) / 2,
      );
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setUrl(null);
    setError(false);
    onReadyChange?.(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    drag.current = null;
    setDragging(false);
    if (assetId)
      apiFetch(`${API_URL}/api/assets/${assetId}/content`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: controller.signal,
      })
        .then(readImageBlob)
        .then((blob) => {
          if (!controller.signal.aborted) {
            objectUrl = URL.createObjectURL(blob);
            setUrl(objectUrl);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setError(true);
        });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId, token, retry, onReadyChange]);
  useEffect(() => {
    const observer = new ResizeObserver(() =>
      setPan((previous) => clamp(previous.x, previous.y, zoom)),
    );
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [zoom, url]);
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setPan(
      clamp(
        drag.current.panX + event.clientX - drag.current.x,
        drag.current.panY + event.clientY - drag.current.y,
        zoom,
      ),
    );
  }
  const unavailable = !!message || error;
  return (
    <section
      className={`projection-viewer ${unavailable ? "projection-viewer--empty" : ""}`}
      aria-label={title}
    >
      {!message && <h2>{title}</h2>}
      <div
        ref={viewport}
        tabIndex={zoom > 1 && !!url && !unavailable ? 0 : undefined}
        role="group"
        aria-label={`${title}. Con imagen ampliada, usá las flechas para desplazar y la tecla Inicio para centrar.`}
        onKeyDown={event => {
          if (event.target !== event.currentTarget || zoom <= 1 || !url || unavailable) return;
          const delta = ({ArrowLeft:[1,0],ArrowRight:[-1,0],ArrowUp:[0,1],ArrowDown:[0,-1]} as Record<string,number[]>)[event.key];
          if (event.key === 'Home') {event.preventDefault();setPan({x:0,y:0});}
          else if (delta) {event.preventDefault();const step=event.shiftKey?96:32;setPan(previous=>clamp(previous.x+delta[0]*step,previous.y+delta[1]*step,zoom));}
        }}
        className={`projection-image ${zoom > 1 ? "projection-image--zoomed" : ""} ${dragging ? "projection-image--dragging" : ""}`}
        onPointerDown={(event) => {
          if (zoom <= 1 || !url || unavailable) return;
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            panX: pan.x,
            panY: pan.y,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
        }}
        onPointerMove={move}
        onPointerUp={() => {
          drag.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
        }}
      >
        {unavailable ? (
          <div className="projection-placeholder" role="status">
            <span>
              <ImageOff size={23} />
            </span>
            <h3>{message || "Imagen no disponible"}</h3>
            <p>
              {explanation ||
                "No pudimos recuperar esta imagen. No se muestra otra en su lugar."}
            </p>
            {error && !message && (
              <button onClick={() => setRetry((value) => value + 1)}>
                Reintentar imagen
              </button>
            )}
          </div>
        ) : url ? (
          <img
            ref={image}
            src={url}
            alt={title}
            draggable={false}
            onLoad={() => onReadyChange?.(true)}
            onError={() => {
              setError(true);
              onReadyChange?.(false);
            }}
            style={{
              transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
            }}
          />
        ) : (
          <p role="status">Cargando imagen…</p>
        )}
      </div>
      {!message && (
        <>
          <p className="projection-disclaimer">
            <Sparkles size={14} />
            <span>
              {disclaimer}
            </span>
          </p>
          {tools && (
            <div className="projection-tools">
              <button
                aria-label="Alejar"
                disabled={!url || error || zoom <= 0.6}
                onClick={() => {
                  const value = +(zoom - 0.2).toFixed(1);
                  setZoom(value);
                  setPan((previous) => clamp(previous.x, previous.y, value));
                }}
              >
                <Minus size={20} />
              </button>
              <output aria-label="Nivel de zoom">
                {Math.round(zoom * 100)} %
              </output>
              <button
                aria-label="Acercar"
                disabled={!url || error || zoom >= 2}
                onClick={() => setZoom((value) => +(value + 0.2).toFixed(1))}
              >
                <Plus size={20} />
              </button>
              <button
                disabled={!url || error}
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
              >
                <RotateCcw size={18} />
                Restablecer
              </button>
            </div>
          )}
        </>
      )}
      {selector && (
        <div
          className="projection-selector"
          role="group"
          aria-label="Alternativas"
        >
          {selector.map((option) => (
            <button
              key={option.id}
              aria-pressed={selectedId === option.id}
              onClick={() => onSelect?.(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
