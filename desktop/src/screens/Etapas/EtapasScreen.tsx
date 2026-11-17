import { useState } from "react";
import {
  ArrowLeft,
  CircleCheck,
  CircleHelp,
  LockKeyhole,
  Minus,
  RotateCcw,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import type { Session } from "../Login/LoginScreen";
import type { Sketch } from "../../types";
import { AppHeader, type NavKey } from "../../components/AppHeader";
import { ProjectionViewer } from "../../components/ProjectionViewer";
import { CandidatePanel } from "../../components/CandidatePanel";
import { PageFooter } from "../../components/ui/Brand";
import { Badge, Button, Eyebrow, Notice } from "../../components/ui/Controls";
import { Dialog } from "../../components/ui/Dialog";
import {
  alternativeLabel,
  formatReviewDate,
  reviewLabel,
  reviewRequest,
  useProjectionReview,
  type ProjectionReview,
} from "../../api/reviews";
import "../Detalle/DetalleProyeccionScreen.css";
import "./EtapasScreen.css";
interface Props {
  session: Session;
  sketch: Sketch;
  lotId: string;
  projectionId: string;
  onLogout: () => void;
  navEnabled: Partial<Record<NavKey, boolean>>;
  onGoHome: () => void;
  onGoBoceto: () => void;
  onGoAlternativas: () => void;
  onBack: () => void;
}
function resourceLabel(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return (
      [row.title,typeof row.inventory === "string" ? `Inventario ${row.inventory}` : null]
        .filter((item) => typeof item === "string")
        .join(" · ") || "Referencia sin descripción"
    );
  }
  return "Referencia sin descripción";
}
export function EtapasScreen({
  session,
  sketch,
  lotId,
  projectionId,
  onLogout,
  navEnabled,
  onGoHome,
  onGoBoceto,
  onGoAlternativas,
  onBack,
}: Props) {
  const {
    data: review,
    error,
    setData,
    refresh,
  } = useProjectionReview(session.token, lotId, projectionId);
  const [viewerReady, setViewerReady] = useState(false);
  const [resourcePreview,setResourcePreview]=useState<{assetId:string;title:string}|null>(null);
  const [selected, setSelected] = useState("base"),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState<string | null>(null);
  const stage = review?.stages.find((stage) => stage.key === selected),
    title = review
      ? alternativeLabel(review.projection)
      : "Revisión por etapas",
    candidate = review?.candidate?.projection_id === projectionId;
  const noApply = stage?.applicability === "not_applicable",
    unknown =
      stage?.applicability === "undocumented" ||
      stage?.status === "No documentado",
    blocked = stage?.status === "Pendiente",
    unavailable = stage?.resource?.ok === false;
  const showFinal = !!review?.complete && !noApply && !unknown && !unavailable;
  async function save(remove: boolean) {
    if (!review || !stage) return;
    setBusy(true);
    setActionError(null);
    try {
      setData(
        await reviewRequest<ProjectionReview>(
          session.token,
          `/api/lotes/${lotId}/projections/${projectionId}/stages/${stage.key}/review`,
          {
            method: remove ? "DELETE" : "POST",
            body: JSON.stringify({ expectedRevision: review.revision }),
          },
        ),
      );
      setConfirm(false);
    } catch (reason) {
      setActionError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const message = noApply
    ? `${stage.label}: No aplica`
    : unknown
      ? "Etapa no documentada"
      : blocked
        ? "Etapa pendiente"
        : unavailable
          ? "Imagen de etapa no disponible"
          : undefined;
  return (
    <div className="etapas-screen">
      <AppHeader
        active="alternativas"
        session={session}
        onLogout={onLogout}
        navEnabled={navEnabled}
        breadcrumb={[
          { label: "Inicio", onClick: onGoHome },
          { label: `Inventario ${sketch.id}`, onClick: onGoBoceto },
          { label: "Alternativas", onClick: onGoAlternativas },
          { label: title, onClick: onBack },
          { label: "Revisión por etapas" },
        ]}
        onNavigate={(key) => {
          if (key === "inicio") onGoHome();
          if (key === "boceto") onGoBoceto();
          if (key === "alternativas") onGoAlternativas();
        }}
      />
      <main className="etapas-main">
        <div className="etapas-heading">
          <div>
            <Eyebrow>Revisión por etapas</Eyebrow>
            <h1>
              {review ? (
                <>
                  Alternativa {review.projection.position} ·{" "}
                  <code>{review.projection.branch_label ?? review.projection.seed ?? "No documentado"}</code>
                </>
              ) : (
                "Revisión por etapas"
              )}
            </h1>
            <p>
              Lote <code>{lotId}</code> · Revisá etapas de producción ya
              consolidadas.
            </p>
          </div>
          <Button onClick={onBack}>
            <ArrowLeft size={18} />
            Volver al detalle
          </Button>
        </div>
        {error && (
          <>
            <Notice tone="error" title="No se pudo cargar la revisión">
              {error}
            </Notice>
            <Button onClick={refresh}>Reintentar</Button>
          </>
        )}
        {!review && !error && (
          <p role="status">Recuperando las etapas documentadas…</p>
        )}
        {review && (
          <>
            <div
              className="etapas-tabs"
              role="group"
              aria-label="Etapas de producción"
            >
              {review.stages.map((item, index) => {
                const Icon =
                  item.status === "Conforme"
                    ? CircleCheck
                    : item.status === "No aplica"
                      ? Minus
                      : item.status === "Pendiente"
                        ? LockKeyhole
                        : item.status === "No disponible"
                          ? XCircle
                          : CircleHelp;
                return (
                  <button
                    key={item.key}
                    aria-pressed={selected === item.key}
                    disabled={busy || item.status === "Pendiente"}
                    className={`etapa-tab ${item.status === "Conforme" ? "conforme" : ""} ${item.status === "No aplica" ? "no-aplica" : ""}`}
                    onClick={() => {
                      setViewerReady(false);
                      setSelected(item.key);
                      setActionError(null);
                    }}
                  >
                    <Icon size={17} />
                    <span>
                      <strong>
                        {index + 1}. {item.label}
                      </strong>
                      <small>{item.status}</small>
                    </span>
                  </button>
                );
              })}
            </div>
            <div
              className={`etapas-columns ${unavailable ? "etapas-columns--missing" : ""}`}
            >
              <ProjectionViewer
                disclaimer={!showFinal && stage?.imageRole === "interpretive_guide" ? "Guía interpretativa de Figuras · imagen asignada por Leonel Salva" : undefined}
                onReadyChange={setViewerReady}
                key={`${selected}-${showFinal}`}
                token={session.token}
                assetId={
                  message
                    ? null
                    : showFinal
                      ? review.finalResource.ok
                        ? review.projection.asset_id
                        : null
                      : (stage?.assetId ?? null)
                }
                title={
                  showFinal
                    ? `Proyección final · ${title}`
                    : `${stage?.label} · ${title}`
                }
                message={
                  showFinal && !review.finalResource.ok
                    ? "Imagen final no disponible"
                    : message
                }
                explanation={
                  noApply
                    ? "Esta etapa no corresponde al procedimiento documentado. No cuenta en el total y no requiere conformidad."
                    : unknown
                      ? "No hay una imagen única documentada como cierre de esta etapa. Podés consultar las imágenes disponibles en Hitos documentados, junto a sus guías y referencias."
                      : blocked
                        ? "La revisión de esta etapa se habilita después de las conformidades anteriores."
                        : "No pudimos recuperar o verificar la imagen registrada. No se muestra otra imagen en su lugar."
                }
              />
              <aside className="etapas-panel">
                {noApply ? (
                  <>
                    <h2>Esta etapa no corresponde</h2>
                    <p>
                      {stage?.description ||
                        "El registro de producción identifica esta etapa como no aplicable."}
                    </p>
                    <Badge>No aplica</Badge>
                    <hr />
                    <h2>Etapas aplicables: {reviewLabel(review)}</h2>
                    <p>
                      Las etapas que no aplican quedan fuera del total y no
                      requieren conformidad.
                    </p>
                  </>
                ) : (
                  <>
                    {!showFinal && (
                      <div className="etapas-panel-heading">
                        <h2>
                          {showFinal
                            ? "Revisión completa"
                            : `Etapa ${review.stages.findIndex((item) => item.key === selected) + 1}: ${stage?.label}`}
                        </h2>
                        {!showFinal && (
                          <Badge
                            tone={
                              unavailable
                                ? "error"
                                : stage?.status === "Conforme"
                                  ? "success"
                                  : "neutral"
                            }
                          >
                            {stage?.status}
                          </Badge>
                        )}
                      </div>
                    )}
                    {showFinal ? (
                      <>
                        <Notice tone="success" title="Revisión completa">
                          {review.applicable === 2
                            ? "Las dos etapas aplicables cuentan con conformidad."
                            : review.applicable === 3
                              ? "Las tres etapas aplicables cuentan con conformidad."
                              : "Todas las etapas aplicables cuentan con conformidad."}
                        </Notice>
                        <dl className="etapas-summary">
                          {review.stages.map((item) => (
                            <div key={item.key}>
                              <dt>
                                {item.key === "finish" ? "Acabado" : item.label}
                              </dt>
                              <dd>{item.status}</dd>
                            </div>
                          ))}
                        </dl>
                      </>
                    ) : (
                      <>
                        <p>
                          {stage?.description ||
                            "Descripción de producción no documentada."}
                        </p>
                        {stage?.provenance && (
                          <p>Procedencia: {stage.provenance}</p>
                        )}
                        <hr />
                        {!!stage?.documentedImages?.length && <>
                          <h2>Hitos documentados</h2>
                          <p>Imágenes de operaciones de producción. Su consulta no registra conformidad ni acredita el cierre de la etapa.</p>
                          <ul>{stage.documentedImages.map((item) => <li key={item.assetId}>
                            <strong>{item.title}</strong>
                            <p>{item.provenance}</p>
                            <Button onClick={() => setResourcePreview({assetId:item.assetId,title:item.title})}>Ver imagen</Button>
                          </li>)}</ul>
                          <hr />
                        </>}
                        <h2>Guías y referencias de la etapa</h2>
                        {stage?.guides.length ? (
                          <ul>
                            {stage.guides.map((item, index) => (
                              <li key={index}>{resourceLabel(item)}{!!item && typeof item === "object" && "assetId" in item && typeof item.assetId === "string" && <Button onClick={()=>setResourcePreview({assetId:item.assetId as string,title:"title" in item&&typeof item.title==="string"?item.title:"Recurso documentado de la etapa"})}>Ver imagen</Button>}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>Guías interpretativas: no documentadas.</p>
                        )}
                        {stage?.references.length ? (
                          <ul>
                            {stage.references.map((item, index) => (
                              <li key={index}>{resourceLabel(item)}{!!item && typeof item === "object" && "assetId" in item && typeof item.assetId === "string" && <Button onClick={()=>setResourcePreview({assetId:item.assetId as string,title:"title" in item&&typeof item.title==="string"?item.title:"Recurso documentado de la etapa"})}>Ver imagen</Button>}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>
                            Obras y fragmentos de referencia: no documentados.
                          </p>
                        )}
                      </>
                    )}
                    {stage?.review && (
                      <p className="etapas-reviewer">
                        {stage.review.username || stage.review.displayName || "Cuenta no disponible"} ·{" "}
                        {formatReviewDate(stage.review.at)}
                        <br />
                        {stage.review.displayName || "Nombre no disponible"}
                        {!stage.review.valid && (
                          <>
                            <br />
                            La conformidad guardada requiere revisión.
                          </>
                        )}
                      </p>
                    )}
                    {!stage?.canReview && !stage?.review && (
                      <Notice
                        tone="warning"
                        title="No se puede registrar conformidad"
                      >
                        {unknown
                          ? "Primero debe incorporarse la documentación de esta etapa."
                          : blocked
                            ? "Falta la conformidad de una etapa anterior."
                            : "La imagen no está disponible o no supera la verificación de integridad."}
                      </Notice>
                    )}
                    <Button
                      variant={stage?.review ? "danger" : "primary"}
                      disabled={
                        busy ||
                        ((!stage?.canReview || !viewerReady) && !stage?.review)
                      }
                      onClick={() => {
                        setActionError(null);
                        if (stage?.review) setConfirm(true);
                        else void save(false);
                      }}
                    >
                      {stage?.review ? (
                        <RotateCcw size={18} />
                      ) : (
                        <CircleCheck size={18} />
                      )}
                      {busy
                        ? "Guardando…"
                        : stage?.review
                          ? "Retirar conformidad"
                          : "Registrar conformidad"}
                    </Button>
                    {actionError && !confirm && (
                      <>
                        <p role="alert" className="review-action-error">
                          {actionError}
                        </p>
                        <Button onClick={refresh}>Actualizar estado</Button>
                      </>
                    )}
                    {!showFinal && (
                      <p className="etapas-next">
                        La siguiente etapa se habilita después de registrar
                        conformidad.
                      </p>
                    )}
                    {showFinal && (
                      <>
                        <hr />
                        <CandidatePanel
                          imageReady={viewerReady}
                          compact
                          review={review}
                          token={session.token}
                          lotId={lotId}
                          onChanged={setData}
                          onConflict={refresh}
                        />
                      </>
                    )}
                  </>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
      <PageFooter />
      <Dialog
        className="review-dialog"
        wide
        open={confirm}
        onClose={() => {
          if (!busy) setConfirm(false);
        }}
        title="Retirar conformidad"
        icon={<TriangleAlert size={20} />}
        actions={
          <>
            <Button disabled={busy} onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => void save(true)}
            >
              <RotateCcw size={18} />
              {busy
                ? "Guardando…"
                : candidate
                  ? "Retirar conformidad y candidata"
                  : "Retirar conformidad"}
            </Button>
          </>
        }
      >
        <p>
          Vas a retirar la conformidad de {stage?.label} de {title}.
        </p>
        <Notice
          tone="warning"
          title={
            candidate
              ? "También se retirará la candidata"
              : "Las etapas siguientes volverán a requerir conformidad"
          }
        >
          {review &&
            new Intl.ListFormat("es-AR", { type: "conjunction" }).format(
              review.stages
                .slice(review.stages.findIndex((item) => item.key === selected))
                .filter((item) => item.applicability === "applicable")
                .map((item) => item.label),
            )}{" "}
          volverán a requerir conformidad.{" "}
          {review?.stages
            .filter((item) => item.applicability === "not_applicable")
            .map((item) => `${item.label} seguirá en No aplica. `)
            .join("")}
          Las imágenes y el historial se conservan.
        </Notice>
        {actionError && (
          <>
            <p role="alert" className="review-action-error">
              {actionError}
            </p>
            <Button
              onClick={() => {
                setConfirm(false);
                refresh();
              }}
            >
              Actualizar estado
            </Button>
          </>
        )}
      </Dialog>
      <Dialog open={!!resourcePreview} onClose={()=>setResourcePreview(null)} title="Recurso documentado de la etapa" wide>
        {resourcePreview && <ProjectionViewer token={session.token} assetId={resourcePreview.assetId} title={resourcePreview.title} disclaimer="Recurso de producción vinculado mediante un registro original" />}
      </Dialog>
    </div>
  );
}
