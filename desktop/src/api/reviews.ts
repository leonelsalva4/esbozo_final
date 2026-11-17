import { apiFetch } from "./transport";
import { useEffect, useRef, useState } from "react";
export const API_URL = "http://localhost:4000";
export interface ReviewStage {
  key: string;
  label: string;
  applicability: "applicable" | "not_applicable" | "undocumented";
  assetId: string | null;
  description: string | null;
  provenance: string | null;
  imageRole?: "interpretive_guide" | "production_stage";
  guides: unknown[];
  references: unknown[];
  documentedImages?: {assetId: string; title: string; provenance: string}[];
  status:
    | "No aplica"
    | "No documentado"
    | "Pendiente"
    | "No disponible"
    | "Conforme"
    | "Por revisar";
  resource: { ok: boolean; reason: string | null } | null;
  review: {
    username: string | null;
    displayName: string | null;
    at: string;
    valid: boolean;
  } | null;
  canReview: boolean;
}
export interface ProjectionReview {
  projection: { id: string; position: number; seed: string | null; branch_label?:string | null; asset_id: string };
  candidate: {
    projection_id: string;
    position: number;
    seed: string | null; branch_label?:string | null;
    username: string | null;
    display_name: string | null;
    set_at: string;
  } | null;
  stages: ReviewStage[];
  documented: boolean;
  applicable: number | null;
  conforming: number;
  complete: boolean;
  canCandidate: boolean;
  revision: string;
  finalResource: { ok: boolean; reason: string | null };
}
export class ApiError extends Error { status: number; constructor(message: string, status: number) { super(message); this.status=status; } }
export async function reviewRequest<T>(
  token: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await apiFetch(API_URL + path, {
    ...options,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(data.error || "No se pudo recuperar la información.", response.status);
  return data;
}
export function useProjectionReview(
  token: string,
  lotId: string,
  projectionId: string,
) {
  const activeProjection = useRef(projectionId);
  activeProjection.current = projectionId;
  const [data, setData] = useState<ProjectionReview | null>(null),
    [error, setError] = useState<string | null>(null),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(null);
    reviewRequest<ProjectionReview>(
      token,
      `/api/lotes/${lotId}/projections/${projectionId}/review`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [token, lotId, projectionId, reload]);
  return {
    data: data?.projection.id === projectionId ? data : null,
    error,
    setData: (next: ProjectionReview) => {
      if (next.projection.id === activeProjection.current) setData(next);
    },
    setError,
    refresh: () => setReload((value) => value + 1),
  };
}
export const reviewLabel = (
  review: Pick<ProjectionReview, "documented" | "conforming" | "applicable">,
) =>
  review.documented
    ? `${review.conforming} de ${review.applicable} conformes`
    : `${review.conforming} ${review.conforming === 1 ? "etapa conforme" : "etapas conformes"} · documentación incompleta`;
export const alternativeLabel = (projection: {
  position: number;
  seed: string | number | null; branch_label?:string | null;
}) => `Alternativa ${projection.position} · ${projection.branch_label ?? projection.seed ?? "No documentado"}`;
export function formatReviewDate(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
