import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

export interface LotStep { key: string; label: string; ok: boolean; state: "completed" | "failed" | "pending"; detail: string; }
export function initialSteps(): LotStep[] {
  return [
    ["locate", "Localizar el lote"],
    ["recover", "Recuperar imágenes y metadatos"],
    ["verify", "Verificar SHA-256 y asociaciones"],
    ["prepare", "Preparar la grilla de alternativas"],
  ].map(([key, label]) => ({ key, label, ok: false, state: "pending", detail: "Esta operación no se ejecutó." }));
}
export async function verifyLot(client: PoolClient, lotId: string, sketchId: string) {
  const steps = initialSteps();
  const finish = (index: number, ok: boolean, detail: string) => { steps[index] = { ...steps[index], ok, state: ok ? "completed" : "failed", detail }; };
  const lot = (await client.query("SELECT id, sequence, generated_at, sketch_id FROM lote WHERE id=$1 AND sketch_id=$2", [lotId, sketchId])).rows[0];
  if (!lot) { finish(0, false, "El lote no pertenece al boceto activo o no está registrado."); return { ok: false, steps, projectionCount: 0, failure: "incomplete" }; }
  finish(0, true, "Se localizó el lote asociado al boceto activo.");
  const projections = (await client.query(
    `SELECT p.id, p.position, p.sketch_id, p.asset_id, a.sha256, a.byte_size, a.mime_type, b.data
     FROM projection p LEFT JOIN asset a ON a.id=p.asset_id LEFT JOIN asset_blob b ON b.asset_id=p.asset_id
     WHERE p.lote_id=$1 ORDER BY p.position`, [lotId])).rows;
  const sketch = (await client.query(
    `SELECT s.id, s.asset_id, a.sha256, a.byte_size, a.mime_type, b.data
     FROM sketch s LEFT JOIN asset a ON a.id=s.asset_id LEFT JOIN asset_blob b ON b.asset_id=s.asset_id WHERE s.id=$1`, [sketchId])).rows[0];
  const missing = projections.find(row => !row.data || !row.sha256 || !row.mime_type);
  if (projections.length !== 4 || missing || !sketch?.data) {
    const detail = missing ? `No se pudo recuperar el recurso de ${missing.id}.` : !sketch?.data ? `No se pudo recuperar la imagen del boceto ${sketchId}.` : `Se esperaban cuatro proyecciones y se recuperaron ${projections.length}.`;
    finish(1, false, detail); return { ok: false, steps, projectionCount: projections.filter(row => row.data && row.sha256 && row.mime_type).length, failure: "incomplete" };
  }
  finish(1, true, "Se recuperaron los archivos y sus metadatos desde el entorno local.");
  const invalid = [sketch, ...projections].find(row => !row.mime_type?.startsWith("image/") || row.byte_size !== row.data.length || createHash("sha256").update(row.data).digest("hex") !== row.sha256?.toLowerCase());
  const associations = projections.every((row, index) => row.position === index + 1 && row.sketch_id === sketchId);
  if (invalid || !associations) {
    finish(2, false, invalid ? `La integridad de ${invalid.id} (${invalid.asset_id}) no coincide con su registro SHA-256 o tamaño.` : "Las posiciones o asociaciones de las proyecciones no corresponden al lote.");
    return { ok: false, steps, projectionCount: 4, failure: "integrity" };
  }
  finish(2, true, "Se comprobó la integridad y la correspondencia de los recursos.");
  finish(3, true, "Las cuatro alternativas quedan disponibles para consulta.");
  return { ok: true, steps, projectionCount: 4, failure: null };
}
