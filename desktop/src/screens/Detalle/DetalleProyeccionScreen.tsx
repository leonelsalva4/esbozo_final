import { useEffect, useState } from "react";
import { ArrowLeft, FileText, Layers, PanelsTopLeft } from "lucide-react";
import type { Session } from "../Login/LoginScreen";
import type { Sketch } from "../../types";
import { AppHeader, type NavKey } from "../../components/AppHeader";
import { PageFooter } from "../../components/ui/Brand";
import { Badge, Button, Eyebrow, Notice } from "../../components/ui/Controls";
import { ProjectionViewer } from "../../components/ProjectionViewer";
import { CandidatePanel } from "../../components/CandidatePanel";
import {
  alternativeLabel,
  reviewLabel,
  reviewRequest,
  useProjectionReview,
} from "../../api/reviews";
import "./DetalleProyeccionScreen.css";
interface Props {
  session: Session;
  sketch: Sketch;
  loteId: string;
  initialProjectionId: string;
  onLogout: () => void;
  navEnabled: Partial<Record<NavKey, boolean>>;
  onGoHome: () => void;
  onGoBoceto: () => void;
  onGoLoteObtenido: () => void;
  onGoAlternativas: () => void;
  onCompare: (id: string) => void;
  onViewTrazabilidad: (id: string) => void;
  onReviewStages: (id: string) => void;
}
export function DetalleProyeccionScreen({
  session,
  sketch,
  loteId,
  initialProjectionId,
  onLogout,
  navEnabled,
  onGoHome,
  onGoBoceto,
  onGoAlternativas,
  onCompare,
  onViewTrazabilidad,
  onReviewStages,
}: Props) {
  const [viewerReady, setViewerReady] = useState(false);
  const [currentId, setCurrentId] = useState(initialProjectionId),
    [projections, setProjections] = useState<
      { id: string; position: number; seed: string | null; branch_label?: string; asset_id: string }[]
    >([]),
    [listError, setListError] = useState<string | null>(null),
    [reload, setReload] = useState(0);
  const {
    data: review,
    error,
    setData,
    refresh,
  } = useProjectionReview(session.token, loteId, currentId);
  useEffect(() => {
    setCurrentId(initialProjectionId);
  }, [initialProjectionId]);
  useEffect(() => {
    const controller = new AbortController();
    setProjections([]);
    setListError(null);
    reviewRequest<typeof projections>(
      session.token,
      `/api/lotes/${loteId}/projections`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setProjections(data);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setListError(reason.message);
      });
    return () => controller.abort();
  }, [session.token, loteId, reload]);
  const projection =
      review?.projection ?? projections.find((item) => item.id === currentId),
    title = projection
      ? alternativeLabel(projection)
      : "Detalle de alternativa";
  return (
    <div className="detalle-screen">
      <AppHeader
        active="alternativas"
        breadcrumb={[
          { label: "Inicio", onClick: onGoHome },
          { label: `Inventario ${sketch.id}`, onClick: onGoBoceto },
          { label: "Alternativas", onClick: onGoAlternativas },
          { label: title },
        ]}
        session={session}
        onLogout={onLogout}
        navEnabled={navEnabled}
        onNavigate={(key) => {
          if (key === "inicio") onGoHome();
          if (key === "boceto") onGoBoceto();
          if (key === "alternativas") onGoAlternativas();
        }}
      />
      <main className="detalle-main">
        <ProjectionViewer
          onReadyChange={setViewerReady}
          key={currentId}
          token={session.token}
          assetId={review?.finalResource.ok ? review.projection.asset_id : null}
          title={title}
          message={
            error
              ? "Detalle no disponible"
              : review && !review.finalResource.ok
                ? "Imagen final no disponible"
                : undefined
          }
          explanation={review?.finalResource.reason ?? undefined}
          selector={projections.map((item) => ({
            id: item.id,
            label: alternativeLabel(item),
          }))}
          selectedId={currentId}
          onSelect={id=>{setViewerReady(false);setCurrentId(id);}}
        />
        <aside className="detalle-sidebar">
          <Button className="detalle-back" onClick={onGoAlternativas}>
            <ArrowLeft size={18} />
            Volver a alternativas
          </Button>
          <div className="detalle-title-block">
            <Eyebrow>Revisión individual</Eyebrow>
            <h1>
              {projection ? (
                <>
                  Alternativa {projection.position} ·{" "}
                  <code>{projection.branch_label ?? projection.seed ?? "No documentado"}</code>
                </>
              ) : (
                "Detalle de alternativa"
              )}
            </h1>
            <p>
              <code>{loteId}</code>
            </p>
          </div>
          <div className="detalle-conformity">
            <Badge
              tone={
                review?.complete
                  ? "success"
                  : review?.documented
                    ? "warning"
                    : "neutral"
              }
            >
              {review ? reviewLabel(review) : "Consultando conformidades…"}
            </Badge>
          </div>
          <div className="detalle-actions">
            <Button
              variant="primary"
              disabled={!projection}
              onClick={() => onCompare(currentId)}
            >
              <PanelsTopLeft size={18} />
              Comparar con el boceto
            </Button>
            <Button
              disabled={!projection}
              onClick={() => onReviewStages(currentId)}
            >
              <Layers size={18} />
              Revisar etapas
            </Button>
            <Button
              disabled={!projection}
              onClick={() => onViewTrazabilidad(currentId)}
            >
              <FileText size={18} />
              Ver trazabilidad
            </Button>
          </div>
          {(error || listError) && (
            <>
              <Notice tone="error" title="No se pudo cargar el detalle">
                {error || listError}
              </Notice>
              <Button
                onClick={() => {
                  refresh();
                  setReload((value) => value + 1);
                }}
              >
                Reintentar
              </Button>
            </>
          )}
          {!review && !error && <p role="status">Recuperando la revisión…</p>}
          {review && (
            <CandidatePanel
              imageReady={viewerReady}
              key={currentId}
              review={review}
              token={session.token}
              lotId={loteId}
              onChanged={setData}
              onConflict={refresh}
            />
          )}
        </aside>
      </main>
      <PageFooter />
    </div>
  );
}
