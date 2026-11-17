-- Preparación aditiva del dominio de resultados precomputados.
-- La retirada autorizada del conjunto anterior se realiza por el importador,
-- sólo después de comprobar el paquete y los respaldos.
ALTER TYPE asset_kind ADD VALUE IF NOT EXISTS 'production_stage';
ALTER TYPE asset_kind ADD VALUE IF NOT EXISTS 'interpretive_guide';
ALTER TYPE asset_kind ADD VALUE IF NOT EXISTS 'reference_fragment';
ALTER TABLE generation_run ALTER COLUMN controlnet_name DROP NOT NULL;
ALTER TABLE generation_run ALTER COLUMN run_at DROP NOT NULL;
ALTER TABLE generation_run ADD COLUMN base_model_revision TEXT;
ALTER TABLE generation_run ADD COLUMN inference_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE generation_run ADD COLUMN date_documented TEXT;
ALTER TABLE lora_version ALTER COLUMN corpus_version_id DROP NOT NULL;
ALTER TABLE lote ALTER COLUMN control_map_id DROP NOT NULL;
ALTER TABLE lote ALTER COLUMN generated_at DROP NOT NULL;
ALTER TABLE lote ADD COLUMN source_identifier TEXT;
ALTER TABLE lote ADD COLUMN date_documented TEXT;
ALTER TABLE projection ALTER COLUMN generated_at DROP NOT NULL;
ALTER TABLE projection ALTER COLUMN seed DROP NOT NULL;
ALTER TABLE projection ALTER COLUMN steps DROP NOT NULL;
ALTER TABLE projection ALTER COLUMN cfg_scale DROP NOT NULL;
ALTER TABLE projection ALTER COLUMN scheduler DROP NOT NULL;
ALTER TABLE projection ALTER COLUMN controlnet_weight DROP NOT NULL;
ALTER TABLE projection ALTER COLUMN lora_weight DROP NOT NULL;
ALTER TABLE projection ALTER COLUMN lora_checkpoint_epoch DROP NOT NULL;
ALTER TABLE projection ALTER COLUMN prompt DROP NOT NULL;
ALTER TABLE projection ALTER COLUMN negative_prompt DROP NOT NULL;
ALTER TABLE projection ADD COLUMN branch_label TEXT;
ALTER TABLE projection ADD COLUMN date_documented TEXT;
ALTER TABLE projection ADD COLUMN production_notes TEXT;
ALTER TABLE production_stage ADD COLUMN source_status TEXT;
CREATE TABLE source_package (
 id TEXT PRIMARY KEY,
 filename TEXT NOT NULL,
 manifest_sha256 TEXT NOT NULL UNIQUE,
 imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 export_date DATE,
 summary JSONB NOT NULL
);
ALTER TABLE lote ADD COLUMN package_id TEXT REFERENCES source_package(id);
CREATE TABLE provenance_resource (
 sha256 TEXT PRIMARY KEY CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 byte_size BIGINT NOT NULL CHECK(byte_size>=0),
 mime_type TEXT NOT NULL,
 asset_id TEXT REFERENCES asset(id),
 content BYTEA,
 CHECK((asset_id IS NULL) <> (content IS NULL))
);
CREATE TABLE provenance_origin (
 package_id TEXT NOT NULL REFERENCES source_package(id),
 resource_sha256 TEXT NOT NULL REFERENCES provenance_resource(sha256),
 original_path TEXT NOT NULL,
 package_path TEXT NOT NULL,
 PRIMARY KEY(package_id,resource_sha256,original_path,package_path)
);
CREATE TABLE provenance_link (
 source_sha256 TEXT NOT NULL REFERENCES provenance_resource(sha256),
 field_path TEXT NOT NULL,
 target_sha256 TEXT NOT NULL,
 delivered BOOLEAN NOT NULL,
 target_resource_sha256 TEXT REFERENCES provenance_resource(sha256),
 PRIMARY KEY(source_sha256,field_path,target_sha256)
);
-- Las selecciones externas no son candidaturas ni conformidades de la app.
CREATE TABLE external_selection (
 projection_id TEXT PRIMARY KEY REFERENCES projection(id),
 person TEXT,
 date_documented TEXT,
 modality TEXT NOT NULL,
 evidence_sha256 TEXT REFERENCES provenance_resource(sha256)
);
-- Se preservan los registros de operación sin inferir adopción por su nombre.
CREATE TABLE production_operation (
 id TEXT PRIMARY KEY,
 projection_id TEXT NOT NULL REFERENCES projection(id),
 source_sha256 TEXT NOT NULL REFERENCES provenance_resource(sha256),
 stage_key TEXT,
 documented_order INTEGER,
 adoption TEXT NOT NULL DEFAULT 'documented_relation' CHECK(adoption IN ('documented_relation','explicitly_adopted')),
 parameters JSONB NOT NULL,
 FOREIGN KEY(projection_id,stage_key) REFERENCES production_stage(projection_id,stage_key),
 UNIQUE(projection_id,source_sha256)
);
CREATE TABLE interpretive_guide (
 id TEXT PRIMARY KEY,
 sketch_id TEXT NOT NULL REFERENCES sketch(id),
 asset_id TEXT NOT NULL REFERENCES asset(id),
 sector TEXT,
 version_documented TEXT,
 provenance TEXT,
 derived_from_id TEXT REFERENCES interpretive_guide(id),
 source_sha256 TEXT REFERENCES provenance_resource(sha256)
);
CREATE TABLE stage_guide (
 projection_id TEXT NOT NULL,
 stage_key TEXT NOT NULL,
 guide_id TEXT NOT NULL REFERENCES interpretive_guide(id),
 PRIMARY KEY(projection_id,stage_key,guide_id),
 FOREIGN KEY(projection_id,stage_key) REFERENCES production_stage(projection_id,stage_key)
);
CREATE TABLE stage_reference (
 projection_id TEXT NOT NULL,
 stage_key TEXT NOT NULL,
 resource_sha256 TEXT NOT NULL REFERENCES provenance_resource(sha256),
 inventory_documented TEXT,
 title_documented TEXT,
 provenance TEXT,
 PRIMARY KEY(projection_id,stage_key,resource_sha256),
 FOREIGN KEY(projection_id,stage_key) REFERENCES production_stage(projection_id,stage_key)
);
CREATE INDEX operation_projection_idx ON production_operation(projection_id);
CREATE INDEX provenance_target_idx ON provenance_link(target_sha256);
