import { useState } from "react";
import {
  CircleCheck,
  LockKeyhole,
  Repeat2,
  Trash2,
  TriangleAlert,
  Info,
} from "lucide-react";
import { Button, Notice } from "./ui/Controls";
import { Dialog } from "./ui/Dialog";
import {
  alternativeLabel,
  formatReviewDate,
  reviewRequest,
  type ProjectionReview,
} from "../api/reviews";
interface Props {
  review: ProjectionReview;
  token: string;
  lotId: string;
  onChanged: (review: ProjectionReview) => void;
  onConflict: () => void;
  compact?: boolean;
  imageReady?: boolean;
  actionOnly?: boolean;
  triggerClassName?: string;
}
export function CandidatePanel({
  review,
  token,
  lotId,
  onChanged,
  onConflict,
  compact = false,
  imageReady = true,
  actionOnly = false,
  triggerClassName = "",
}: Props) {
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const selected = review.candidate?.projection_id === review.projection.id,
    other = !!review.candidate && !selected && review.canCandidate;
  const label = selected
    ? "Retirar candidata"
    : other
      ? "Reemplazar candidata"
      : "Marcar como candidata";
  const Icon = selected
    ? Trash2
    : other
      ? Repeat2
      : review.canCandidate
        ? CircleCheck
        : LockKeyhole;
  async function save() {
    setBusy(true);
    setError(null);
    try {
      onChanged(
        await reviewRequest<ProjectionReview>(
          token,
          `/api/lotes/${lotId}/candidate`,
          {
            method: selected ? "DELETE" : "PUT",
            body: JSON.stringify({
              projectionId: review.projection.id,
              expectedRevision: review.revision,
            }),
          },
        ),
      );
      setConfirm(false);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div
        className={
          actionOnly ? "review-candidate-action-only" : "review-candidate-panel"
        }
      >
        {!actionOnly &&
          (compact ? (
            <h2>
              {selected
                ? review.complete ? "Esta alternativa ya es la candidata del lote." : "Candidata conservada: faltan conformidades de etapas."
                : !review.canCandidate
                  ? "Se requiere una imagen final válida para marcar la candidata."
                  : other
                    ? "Esta alternativa puede reemplazar a la candidata actual."
                    : "Ya podés marcar esta alternativa como candidata."}
            </h2>
          ) : selected ? (
            <>
              <Notice tone={review.complete ? "success" : "warning"} title={review.complete ? "Candidata del lote" : "Candidata con revisión pendiente"}>
                {review.complete ? "Esta alternativa está marcada como candidata. La selección es reversible." : "La selección anterior se conserva. Completá las conformidades de las etapas pendientes para finalizar la revisión."}
              </Notice>
              <p className="review-candidate-meta">
                {review.candidate?.username || review.candidate?.display_name || "Cuenta no disponible"} ·{" "}
                {review.candidate && formatReviewDate(review.candidate.set_at)}
                <br />
                {review.candidate?.display_name || "Nombre no disponible"}
              </p>
            </>
          ) : !review.canCandidate ? (
            <>
              <Notice
                tone="warning"
                title={
                  review.complete
                    ? "Imagen final no disponible"
                    : review.documented
                      ? "Faltan conformidades"
                      : "Etapas no documentadas"
                }
              >
                {review.complete
                  ? "La imagen final debe recuperarse y validarse antes de marcar esta alternativa."
                  : review.documented
                    ? "Todavía no podés marcar esta alternativa como candidata."
                    : "Falta incorporar la documentación de las etapas para habilitar una nueva candidatura."}
              </Notice>
              <p className="review-candidate-meta">
                {review.complete
                  ? "No se pudo recuperar o verificar la imagen final."
                  : review.documented
                    ? `Falta revisar ${new Intl.ListFormat("es-AR", { style: "long", type: "conjunction" }).format(review.stages.filter((stage) => stage.applicability === "applicable" && stage.status !== "Conforme").map((stage) => stage.label)) || "la imagen final no está disponible"}.`
                    : "La imagen final no reemplaza a las imágenes de producción."}
              </p>
            </>
          ) : other ? (
            <Notice title="Ya hay una candidata">
              La candidata actual es {alternativeLabel(review.candidate!)}. Esta
              alternativa puede reemplazarla.
            </Notice>
          ) : (
            <Notice tone="success" title="Lista para marcar como candidata">
              Todas las etapas aplicables cuentan con conformidad.
            </Notice>
          ))}
        <Button
          className={triggerClassName}
          variant={selected ? "danger" : "primary"}
          disabled={
            busy || (!selected && (!review.canCandidate || !imageReady))
          }
          onClick={() => {
            setError(null);
            setConfirm(true);
          }}
        >
          <Icon size={18} />
          {label}
        </Button>
      </div>
      {!compact && !actionOnly && (
        <p className="review-nonapproval">
          La candidata no constituye una aprobación institucional ni una
          valoración experta.
        </p>
      )}
      <Dialog
        className="review-dialog"
        open={confirm}
        onClose={() => {
          if (!busy) setConfirm(false);
        }}
        title={label}
        icon={selected ? <TriangleAlert size={20} /> : <Info size={20} />}
        actions={
          <>
            <Button disabled={busy} onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button
              variant={selected ? "danger" : "primary"}
              disabled={busy}
              onClick={save}
            >
              <Icon size={18} />
              {busy ? "Guardando…" : label}
            </Button>
          </>
        }
      >
        {selected ? (
          <p>
            Vas a retirar la marca de {alternativeLabel(review.projection)}.
          </p>
        ) : other ? (
          <>
            <p>Vas a cambiar la candidata del lote {lotId}.</p>
            <dl className="candidate-dialog-details">
              <div>
                <dt>Candidata actual</dt>
                <dd>{alternativeLabel(review.candidate!)}</dd>
              </div>
              <div>
                <dt>Nueva candidata</dt>
                <dd>{alternativeLabel(review.projection)}</dd>
              </div>
              <div>
                <dt>Conformidad</dt>
                <dd>
                  {review.conforming} de {review.applicable} etapas aplicables
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <p>
            Vas a marcar {alternativeLabel(review.projection)} como candidata
            del lote {lotId}.
          </p>
        )}
        <Notice
          tone={selected || other ? "warning" : "success"}
          title={
            selected
              ? "El lote quedará sin candidata"
              : other
                ? "Una sola candidata por lote"
                : `${review.conforming} de ${review.applicable} etapas aplicables conformes`
          }
        >
          {selected
            ? "Las conformidades y las imágenes se conservan. Podés volver a marcar una alternativa que cumpla las condiciones."
            : other
              ? "La marca anterior se retira. Las imágenes y las conformidades se conservan."
              : "Esta selección es reversible y no constituye una aprobación institucional ni una valoración experta."}
        </Notice>
        {error && (
          <>
            <p role="alert" className="review-action-error">
              {error}
            </p>
            <Button
              onClick={() => {
                setConfirm(false);
                onConflict();
              }}
            >
              Actualizar estado
            </Button>
          </>
        )}
      </Dialog>
    </>
  );
}
