-- Hitos reales que complementan una etapa, sin acreditar su cierre ni conformidad.
ALTER TABLE production_stage ADD COLUMN documented_images JSONB NOT NULL DEFAULT '[]'
  CHECK(jsonb_typeof(documented_images)='array');
