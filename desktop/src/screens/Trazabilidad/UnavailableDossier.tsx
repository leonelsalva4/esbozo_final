import { ArrowLeft, RotateCcw } from "lucide-react";
import { AppHeader, type NavKey } from "../../components/AppHeader";
import { ProjectionViewer } from "../../components/ProjectionViewer";
import { Button, Eyebrow, Notice } from "../../components/ui/Controls";
import { PageFooter } from "../../components/ui/Brand";
import { alternativeLabel } from "../../api/reviews";
import type { Session } from "../Login/LoginScreen";
import "./UnavailableDossier.css";
interface Props {
  session: Session;
  sketchId: string;
  lotId: string;
  projectionId: string;
  projection?: { position: number; seed: string | null; branch_label?: string|null; asset_id: string };
  projectionLoading?: boolean;
  pending: boolean;
  navEnabled: Partial<Record<NavKey, boolean>>;
  onLogout: () => void;
  onGoHome: () => void;
  onGoBoceto: () => void;
  onGoAlternativas: () => void;
  onBack: () => void;
  onRetry: () => void;
}
export function UnavailableDossier({
  session,
  sketchId,
  lotId,
  projectionId,
  projection,
  projectionLoading,
  pending,
  navEnabled,
  onLogout,
  onGoHome,
  onGoBoceto,
  onGoAlternativas,
  onBack,
  onRetry,
}: Props) {
  const title = projection ? alternativeLabel(projection) : projectionId;
  return (
    <div className="trace-unavailable-screen">
      <AppHeader
        active="alternativas"
        session={session}
        navEnabled={navEnabled}
        onLogout={onLogout}
        breadcrumb={[
          { label: "Inicio", onClick: onGoHome },
          { label: `Inventario ${sketchId}`, onClick: onGoBoceto },
          { label: "Alternativas", onClick: onGoAlternativas },
          { label: title, onClick: onBack },
          { label: "Trazabilidad" },
        ]}
        onNavigate={(key) => {
          if (key === "inicio") onGoHome();
          if (key === "boceto") onGoBoceto();
          if (key === "alternativas") onGoAlternativas();
        }}
      />
      <main className="trace-unavailable-main">
        <div className="trace-unavailable-heading">
          <div>
            <Eyebrow>Consulta de procedencia</Eyebrow>
            <h1>Trazabilidad no disponible</h1>
            <p>
              {title} · Lote <code>{lotId}</code>
            </p>
          </div>
          <Button onClick={onBack}>
            <ArrowLeft size={18} />
            Volver al detalle
          </Button>
        </div>
        <div className="trace-unavailable-columns">
          <ProjectionViewer
            token={session.token}
            assetId={projection?.asset_id ?? null}
            title={title}
            tools={false}
            message={projection ? undefined : projectionLoading ? "Recuperando identificación de la imagen…" : "Imagen no disponible"}
          />
          <aside>
            <Notice tone="warning" title="No pudimos recuperar la ficha">
              La imagen conserva su identificación. No se muestran metadatos de
              otra alternativa como sustituto.
            </Notice>
            <dl>
              <div>
                <dt>Boceto</dt>
                <dd>{sketchId}</dd>
              </div>
              <div>
                <dt>Alternativa</dt>
                <dd>{title}</dd>
              </div>
              <div>
                <dt>Ficha</dt>
                <dd>No disponible</dd>
              </div>
            </dl>
            <Button variant="primary" disabled={pending} onClick={onRetry}>
              <RotateCcw size={18} />
              {pending ? "Reintentando…" : "Reintentar"}
            </Button>
            <Button onClick={onBack}>
              <ArrowLeft size={18} />
              Volver al detalle
            </Button>
          </aside>
        </div>
      </main>
      <PageFooter />
    </div>
  );
}
