import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PNG } = require("pngjs") as {
  PNG: {
    sync: {
      read: (
        data: Buffer,
        options?: unknown,
      ) => { width: number; height: number };
    };
  };
};
const jpeg = require("jpeg-js") as {
  decode: (data: Buffer, options: unknown) => { width: number; height: number };
};
export const STAGES = [
  { key: "base", label: "Escena base" },
  { key: "figures", label: "Figuras" },
  { key: "finish", label: "Acabado pictórico" },
] as const;
export class ReviewError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const MAX_IMAGE_PIXELS=64000000;
const verifiedImages=new Map<string,true>();
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export async function imageState(client: PoolClient, id: string | null) {
  if (!id) return { ok: false, reason: "Imagen no documentada", sha256: null };
  const row = (
    await client.query(
      "SELECT a.sha256,a.byte_size,a.mime_type,a.width,a.height,b.data FROM asset a LEFT JOIN asset_blob b ON b.asset_id=a.id WHERE a.id=$1",
      [id],
    )
  ).rows[0];
  return inspectImage(row);
}
export function inspectImage(
  row:
    | {
        data?: Buffer;
        sha256: string;
        byte_size: number;
        mime_type: string;
        width: number;
        height: number;
      }
    | undefined,
) {
  if (!row?.data)
    return {
      ok: false,
      reason: "Imagen no disponible",
      sha256: row?.sha256 ?? null,
    };
  const data: Buffer = row.data;
  const signature =
    row.mime_type === "image/png"
      ? data
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : row.mime_type === "image/jpeg"
        ? data[0] === 255 && data[1] === 216
        : false;
  const hash = createHash("sha256").update(data).digest("hex");
  let decoded = false;
  if (
    signature &&
    row.width > 0 &&
    row.height > 0 &&
    row.width * row.height <= MAX_IMAGE_PIXELS &&
    data.length === row.byte_size &&
    hash === row.sha256
  ) {
    // La verificación del hash y del tamaño se repite en cada lectura.
    // Sólo la decodificación de bytes idénticos y metadatos idénticos se reutiliza.
    const key=JSON.stringify([hash,row.mime_type,row.width,row.height,row.byte_size]);
    if(verifiedImages.has(key)){verifiedImages.delete(key);verifiedImages.set(key,true);return {ok:true,reason:null,sha256:hash};}
    try {
      if (
        row.mime_type === "image/png" &&
        (data.length < 24 ||
          data.readUInt32BE(16) * data.readUInt32BE(20) > MAX_IMAGE_PIXELS)
      )
        throw new Error("Dimensiones no admitidas");
      const image =
        row.mime_type === "image/png"
          ? PNG.sync.read(data)
          : jpeg.decode(data, {
              maxResolutionInMP: 64,
              maxMemoryUsageInMB: 512,
              useTArray: true,
            });
      decoded = image.width === row.width && image.height === row.height;
      if(decoded){verifiedImages.set(key,true);if(verifiedImages.size>128)verifiedImages.delete(verifiedImages.keys().next().value!);}
    } catch {
      decoded = false;
    }
  }
  const ok = decoded;
  return {
    ok,
    reason: ok ? null : "No se pudo verificar la integridad de la imagen",
    sha256: hash,
  };
}
export async function readReview(
  client: PoolClient,
  loteId: string,
  projectionId: string,
) {
  const projection = (
    await client.query(
      "SELECT p.id,p.position,p.seed,p.branch_label,p.asset_id FROM projection p JOIN lote l ON l.id=p.lote_id AND l.sketch_id=p.sketch_id JOIN lote_obtencion o ON o.lote_id=p.lote_id WHERE p.lote_id=$1 AND p.id=$2",
      [loteId, projectionId],
    )
  ).rows[0];
  if (!projection)
    throw new ReviewError(
      404,
      "La alternativa no pertenece a un lote obtenido.",
    );
  const rows = (
    await client.query(
      `SELECT s.*,r.user_id,r.reviewed_at,r.asset_sha256,r.stage_fingerprint,CASE WHEN u.deleted_at IS NULL THEN u.username ELSE NULL END AS username,u.display_name FROM production_stage s LEFT JOIN stage_review r USING(projection_id,stage_key) LEFT JOIN app_user u ON u.id=r.user_id WHERE s.projection_id=$1 ORDER BY s.stage_key`,
      [projectionId],
    )
  ).rows;
  const candidate =
    (
      await client.query(
        `SELECT c.projection_id,c.set_at,c.user_id,CASE WHEN u.deleted_at IS NULL THEN u.username ELSE NULL END AS username,u.display_name,p.position,p.seed,p.branch_label FROM lote_candidate c JOIN projection p ON p.id=c.projection_id LEFT JOIN app_user u ON u.id=c.user_id WHERE c.lote_id=$1`,
        [loteId],
      )
    ).rows[0] ?? null;
  let priorComplete = true;
  const stages = [];
  for (const definition of STAGES) {
    const row = rows.find((row) => row.stage_key === definition.key);
    const applicability = row?.applicability ?? "undocumented";
    const resource =
      applicability === "applicable"
        ? await imageState(client, row.asset_id)
        : null;
    const fingerprint = digest(
      row
        ? {
            applicability: row.applicability,
            asset_id: row.asset_id,
            description: row.description,
            provenance: row.provenance,
            guides: row.guides,
            references: row.reference_works,
          }
        : null,
    );
    const validReview: boolean =
      !!row?.reviewed_at &&
      priorComplete &&
      resource?.ok === true &&
      row.asset_sha256 === resource.sha256 &&
      row.stage_fingerprint === fingerprint;
    const status =
      applicability === "not_applicable"
        ? "No aplica"
        : applicability === "undocumented"
          ? "No documentado"
          : !priorComplete
            ? "Pendiente"
            : !row?.asset_id
              ? row?.source_status === "recurso_identificado_no_entregado" ? "No disponible" : "No documentado"
              : !resource?.ok
                ? "No disponible"
                : validReview
                  ? "Conforme"
                  : "Por revisar";
    stages.push({
      key: definition.key,
      label: definition.label,
      applicability,
      assetId: row?.asset_id ?? null,
      description: row?.description ?? null,
      provenance: row?.provenance ?? null,
      imageRole: row?.source_status === "user_confirmed_guide" ? "interpretive_guide" : "production_stage",
      guides: row?.guides ?? [],
      references: row?.reference_works ?? [],
      documentedImages: row?.documented_images ?? [],
      status,
      resource,
      review: row?.reviewed_at
        ? {
            username: row.username,
            displayName: row.display_name,
            at: row.reviewed_at,
            valid: validReview,
          }
        : null,
      canReview:
        applicability === "applicable" &&
        priorComplete &&
        resource?.ok === true &&
        !validReview,
      fingerprint,
    });
    if (applicability !== "not_applicable")
      priorComplete = priorComplete && validReview;
  }
  const documented = stages.every(
    (stage) => stage.applicability !== "undocumented",
  );
  const applicable = stages.filter(
    (stage) => stage.applicability === "applicable",
  ).length;
  const conforming = stages.filter(
    (stage) => stage.status === "Conforme",
  ).length;
  const finalResource = await imageState(client, projection.asset_id);
  return {
    projection,
    candidate,
    stages,
    documented,
    applicable: documented ? applicable : null,
    conforming,
    complete: documented && applicable > 0 && priorComplete,
    canCandidate:
      documented && applicable > 0 && priorComplete && finalResource.ok,
    finalResource,
    revision: digest({
      rows,
      candidate,
      resources: stages.map((stage) => stage.resource),
      finalResource,
    }),
  };
}
export async function lockLot(client: PoolClient, loteId: string) {
  if (
    !(
      await client.query("SELECT id FROM lote WHERE id=$1 FOR UPDATE", [loteId])
    ).rowCount
  )
    throw new ReviewError(404, "Lote no encontrado.");
}
export function assertRevision(expected: unknown, actual: string) {
  if (typeof expected !== "string")
    throw new ReviewError(
      409,
      "Actualizá el estado antes de confirmar la operación.",
    );
  if (expected !== actual)
    throw new ReviewError(
      409,
      "El estado cambió en otra operación. Revisá la información actualizada y volvé a confirmar.",
    );
}
export async function auditReview(
  client: PoolClient,
  userId: number,
  loteId: string,
  action: string,
  payload: unknown,
) {
  await client.query(
    "INSERT INTO audit_log(user_id,action,entity_type,entity_id,payload) VALUES($1,$2,'lote',$3,$4)",
    [userId, action, loteId, JSON.stringify(payload)],
  );
}
