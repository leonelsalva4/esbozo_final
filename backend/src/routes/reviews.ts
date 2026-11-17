import { Router, type Request, type Response } from "express";
import type { PoolClient } from "pg";
import { pool } from "../db.js";
import { requireAuth } from "../auth.js";
import {
  readReview,
  lockLot,
  assertRevision,
  auditReview,
  ReviewError,
  STAGES,
} from "../services/stage-review.js";
import { logTechnicalError } from "../technical-log.js";
export const reviewsRouter = Router();
async function operation(
  req: Request,
  res: Response,
  write: boolean,
  handler: (client: PoolClient) => Promise<unknown>,
) {
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query(
      write ? "BEGIN" : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY",
    );
    if (write) {
      await lockLot(client, req.params.loteId);
      const user = (
        await client.query("SELECT is_active FROM app_user WHERE id=$1", [
          req.user!.sub,
        ])
      ).rows[0];
      if (!user?.is_active)
        throw new ReviewError(403, "La cuenta no está activa.");
    }
    const result = await handler(client);
    await client.query("COMMIT");
    res.set("Cache-Control", "no-store").json(result);
  } catch (error) {
    if (!(error instanceof ReviewError)) logTechnicalError("stage-review.operation", error);
    if (client) await client.query("ROLLBACK").catch(() => undefined);
    const code = (error as { code?: string }).code;
    res
      .status(
        error instanceof ReviewError
          ? error.status
          : code === "42P01"
            ? 503
            : 500,
      )
      .json({
        error:
          error instanceof ReviewError
            ? error.message
            : code === "42P01"
              ? "El esquema de revisión de etapas todavía no está instalado."
              : "No se pudo completar la operación. No se guardaron cambios.",
      });
  } finally {
    client?.release();
  }
}
reviewsRouter.get(
  "/:loteId/projections/:projectionId/review",
  requireAuth,
  (req, res) =>
    operation(req, res, false, (client) =>
      readReview(client, req.params.loteId, req.params.projectionId),
    ),
);
reviewsRouter.get("/:loteId/reviews", requireAuth, (req, res) =>
  operation(req, res, false, async (client) => {
    const ids = (
      await client.query(
        "SELECT id FROM projection WHERE lote_id=$1 ORDER BY position",
        [req.params.loteId],
      )
    ).rows;
    const results = [];
    for (const { id } of ids) {
      const review = await readReview(client, req.params.loteId, id);
      results.push({
        id,
        position: review.projection.position,
        documented: review.documented,
        conforming: review.conforming,
        applicable: review.applicable,
        complete: review.complete,
      });
    }
    return results;
  }),
);
reviewsRouter.post(
  "/:loteId/projections/:projectionId/stages/:stageKey/review",
  requireAuth,
  (req, res) =>
    operation(req, res, true, async (client) => {
      const { loteId, projectionId, stageKey } = req.params;
      const review = await readReview(client, loteId, projectionId);
      assertRevision(req.body.expectedRevision, review.revision);
      const stage = review.stages.find((stage) => stage.key === stageKey);
      if (!stage) throw new ReviewError(404, "Etapa no encontrada.");
      if (!stage.canReview)
        throw new ReviewError(
          422,
          "La etapa requiere documentación, una imagen válida y la conformidad de las etapas anteriores.",
        );
      await client.query(
        `INSERT INTO stage_review(projection_id,stage_key,user_id,asset_sha256,stage_fingerprint) VALUES($1,$2,$3,$4,$5) ON CONFLICT(projection_id,stage_key) DO UPDATE SET user_id=EXCLUDED.user_id,reviewed_at=clock_timestamp(),asset_sha256=EXCLUDED.asset_sha256,stage_fingerprint=EXCLUDED.stage_fingerprint`,
        [
          projectionId,
          stageKey,
          req.user!.sub,
          stage.resource!.sha256,
          stage.fingerprint,
        ],
      );
      await auditReview(client, req.user!.sub, loteId, "stage.conformity.set", {
        projection_id: projectionId,
        stage_key: stageKey,
        asset_sha256: stage.resource!.sha256,
        stage_fingerprint: stage.fingerprint,
      });
      return readReview(client, loteId, projectionId);
    }),
);
reviewsRouter.delete(
  "/:loteId/projections/:projectionId/stages/:stageKey/review",
  requireAuth,
  (req, res) =>
    operation(req, res, true, async (client) => {
      const { loteId, projectionId, stageKey } = req.params;
      const review = await readReview(client, loteId, projectionId);
      assertRevision(req.body.expectedRevision, review.revision);
      const index = STAGES.findIndex((stage) => stage.key === stageKey);
      if (index < 0 || !review.stages[index].review)
        throw new ReviewError(
          422,
          "La etapa no tiene una conformidad registrada.",
        );
      const keys = STAGES.slice(index).map((stage) => stage.key);
      const removed = (
        await client.query(
          "DELETE FROM stage_review WHERE projection_id=$1 AND stage_key=ANY($2::text[]) RETURNING *",
          [projectionId, keys],
        )
      ).rows;
      const candidateRemoved = review.candidate?.projection_id === projectionId;
      if (candidateRemoved)
        await client.query("DELETE FROM lote_candidate WHERE lote_id=$1", [
          loteId,
        ]);
      await auditReview(
        client,
        req.user!.sub,
        loteId,
        "stage.conformity.clear",
        {
          projection_id: projectionId,
          stage_key: stageKey,
          removed_reviews: removed,
          candidate_removed: candidateRemoved,
        },
      );
      if (candidateRemoved)
        await auditReview(client, req.user!.sub, loteId, "candidate.clear", {
          projection_id: projectionId,
          reason: "stage.conformity.clear",
        });
      return readReview(client, loteId, projectionId);
    }),
);
reviewsRouter.put("/:loteId/candidate", requireAuth, (req, res) =>
  operation(req, res, true, async (client) => {
    const { loteId } = req.params;
    const { projectionId } = req.body;
    if (typeof projectionId !== "string")
      throw new ReviewError(400, "Falta la alternativa.");
    const review = await readReview(client, loteId, projectionId);
    assertRevision(req.body.expectedRevision, review.revision);
    if (!review.canCandidate)
      throw new ReviewError(
        422,
        "Se requieren todas las conformidades aplicables y una imagen final válida.",
      );
    if (review.candidate?.projection_id === projectionId) return review;
    await client.query(
      `INSERT INTO lote_candidate(lote_id,projection_id,user_id) VALUES($1,$2,$3) ON CONFLICT(lote_id) DO UPDATE SET projection_id=EXCLUDED.projection_id,user_id=EXCLUDED.user_id,set_at=clock_timestamp()`,
      [loteId, projectionId, req.user!.sub],
    );
    await auditReview(client, req.user!.sub, loteId, "candidate.set", {
      projection_id: projectionId,
      previous_projection_id: review.candidate?.projection_id ?? null,
    });
    return readReview(client, loteId, projectionId);
  }),
);
reviewsRouter.delete("/:loteId/candidate", requireAuth, (req, res) =>
  operation(req, res, true, async (client) => {
    const { loteId } = req.params;
    const { projectionId } = req.body;
    if (typeof projectionId !== "string")
      throw new ReviewError(400, "Falta la alternativa.");
    const review = await readReview(client, loteId, projectionId);
    assertRevision(req.body.expectedRevision, review.revision);
    if (review.candidate?.projection_id !== projectionId)
      throw new ReviewError(409, "Esta alternativa ya no es la candidata.");
    await client.query("DELETE FROM lote_candidate WHERE lote_id=$1", [loteId]);
    await auditReview(client, req.user!.sub, loteId, "candidate.clear", {
      projection_id: projectionId,
    });
    return readReview(client, loteId, projectionId);
  }),
);
