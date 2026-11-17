-- Sólo agrega estructuras. No reclasifica ni completa material histórico.
CREATE TABLE production_stage (
  projection_id TEXT NOT NULL REFERENCES projection(id),
  stage_key TEXT NOT NULL CHECK(stage_key IN ('base','figures','finish')),
  applicability TEXT NOT NULL CHECK(applicability IN ('applicable','not_applicable','undocumented')),
  asset_id TEXT REFERENCES asset(id),
  description TEXT,
  provenance TEXT,
  guides JSONB NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(guides)='array'),
  reference_works JSONB NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(reference_works)='array'),
  PRIMARY KEY(projection_id,stage_key),
  CHECK(applicability='applicable' OR asset_id IS NULL)
);
CREATE TABLE stage_review (
  projection_id TEXT NOT NULL,
  stage_key TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES app_user(id),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  asset_sha256 TEXT NOT NULL,
  stage_fingerprint TEXT NOT NULL,
  PRIMARY KEY(projection_id,stage_key),
  FOREIGN KEY(projection_id,stage_key) REFERENCES production_stage(projection_id,stage_key)
);
