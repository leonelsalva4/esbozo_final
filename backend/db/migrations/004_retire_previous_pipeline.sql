-- Ejecutar después de importar y comprobar los resultados precomputados.
-- El respaldo completo conserva el conjunto anterior fuera de la base activa.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM source_package)
    OR EXISTS(SELECT 1 FROM generation_run WHERE base_model_name ~* 'stable[ _-]*diffusion|sd.?1.?5|controlnet')
    OR EXISTS(SELECT 1 FROM control_map)
    OR EXISTS(SELECT 1 FROM asset WHERE kind::text IN ('control_map','control_map_diff')) THEN
  RAISE EXCEPTION 'Primero importar el paquete real con respaldo verificado; no se retira un conjunto histórico todavía activo';
 END IF;
END $$;
ALTER TABLE lote DROP COLUMN control_map_id;
DROP TABLE control_map;
DROP TYPE map_provenance;
ALTER TABLE generation_run DROP COLUMN controlnet_name;
ALTER TABLE generation_run DROP COLUMN controlnet_sha256;
ALTER TABLE projection DROP COLUMN controlnet_weight;
ALTER TABLE projection DROP COLUMN controlnet_guidance_start;
ALTER TABLE projection DROP COLUMN controlnet_guidance_end;
CREATE TYPE asset_kind_precomputed AS ENUM ('sketch','projection','corpus_work','production_stage','interpretive_guide','reference_fragment');
ALTER TABLE asset ALTER COLUMN kind TYPE asset_kind_precomputed USING kind::text::asset_kind_precomputed;
DROP TYPE asset_kind;
ALTER TYPE asset_kind_precomputed RENAME TO asset_kind;
INSERT INTO system_metadata(key,value) VALUES('schema_version','4'),('dossier_schema_version','2')
ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now();
