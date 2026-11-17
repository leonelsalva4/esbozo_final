-- =====================================================================
--  Esbozo — Esquema de base de datos
--  PostgreSQL 16 o superior
--
--  Cada tabla implementa requerimientos del análisis funcional.
--  Las referencias RF-xx / RNF-xx apuntan a ese documento.
-- =====================================================================

-- ⚠  ADVERTENCIA: las dos líneas siguientes BORRAN LA BASE ENTERA sin
-- confirmación. Este script es de creación desde cero (npm run db:reset).
-- Toda la data se reconstruye con el importador. NO ejecutar sobre una base
-- con trabajo no reimportable.
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS citext;

-- =====================================================================
--  TIPOS
-- =====================================================================

CREATE TYPE asset_kind AS ENUM (
  'sketch',              -- imagen del boceto
  'control_map',         -- mapa de control (original o curado)
  'control_map_diff',    -- diff visual entre versiones del mapa
  'projection',          -- proyección generada
  'corpus_work'          -- óleo del corpus
);

CREATE TYPE map_provenance AS ENUM (
  'algorithmic',         -- extraído por el preprocesador, sin intervención
  'manually_curated'     -- corregido a mano por los autores
);

-- Un solo valor: el AF (4.3) declara un actor institucional único y (4.2)
-- reserva la administración de cuentas como función externa a la aplicación.
-- La columna existe para el RF de perfiles diferenciados de la próxima
-- entrega; sumar un valor entonces es una línea y no migra datos:
--     ALTER TYPE user_role ADD VALUE 'admin';
CREATE TYPE user_role AS ENUM ('institucional');


-- =====================================================================
--  SISTEMA Y CUENTAS
-- =====================================================================

-- RNF-09: los esquemas y configuraciones se identifican por versión.
CREATE TABLE system_metadata (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Claves esperadas:
--   schema_version              versión de este esquema
--   dossier_schema_version      versión del esquema de ficha de trazabilidad
--   disclaimer_version          versión del texto de no autenticidad (RF-10)
--   methodological_note_version versión de la nota metodológica al pie
--   app_version                 versión de la aplicación

-- RF-01, RNF-01. Las cuentas se aprovisionan por script (tarea técnica
-- externa a la aplicación): no hay registro público ni pantalla de alta.
CREATE TABLE app_user (
  id            SERIAL PRIMARY KEY,
  username      CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,                       -- argon2id
  display_name  TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'institucional',  -- ver nota del tipo
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,       -- CU-01: cuenta desactivada
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- RF-13 exige conservar la cuenta y la fecha de cada acción.
-- El registro TÉCNICO de errores (RF-15) va a archivo, no acá: si falla la
-- conexión a la base, un log en la base no se escribe.
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id     INTEGER REFERENCES app_user(id),
  action      TEXT NOT NULL,     -- session.login | session.login_failed | session.logout
                                 -- lote.obtain | candidate.set | candidate.clear
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  payload     JSONB
);
CREATE INDEX audit_log_entity_idx ON audit_log (entity_type, entity_id, occurred_at DESC);


-- =====================================================================
--  IMÁGENES
--
--  Los bytes viven en tabla aparte de los metadatos. Postgres ya evita
--  leerlos de más mediante TOAST; la separación existe por otras razones:
--    1. hace imposible el SELECT * que arrastra megabytes
--    2. permite exportar la base sin imágenes (--exclude-table=asset_blob)
--    3. mover las imágenes a disco o a S3 es borrar una tabla, no alterar
--       la que todo el esquema referencia
-- =====================================================================

CREATE TABLE asset (
  id         TEXT PRIMARY KEY,
  kind       asset_kind NOT NULL,
  filename   TEXT NOT NULL,          -- nombre original en Drive
  mime_type  TEXT NOT NULL,
  width      INTEGER NOT NULL,
  height     INTEGER NOT NULL,
  byte_size  INTEGER NOT NULL,
  sha256     TEXT NOT NULL,          -- integridad verificable
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE asset_blob (
  asset_id TEXT PRIMARY KEY REFERENCES asset(id) ON DELETE CASCADE,
  data     BYTEA NOT NULL
);


-- =====================================================================
--  MATERIAL DE ORIGEN
-- =====================================================================

-- RF-02: únicamente los bocetos 1582 y 1663.
-- Los textos vienen tal cual de la ficha del Museo Benito Quinquela Martín:
-- "Sin título" y "Sin fecha documentada" son datos del museo, no ausencias.
CREATE TABLE sketch (
  id               TEXT PRIMARY KEY,          -- ES el número de inventario: '1582'
  title            TEXT NOT NULL,             -- 'Sin título'
  series           TEXT,
  author           TEXT NOT NULL,
  date_documented  TEXT NOT NULL,             -- 'Sin fecha documentada'
  technique        TEXT NOT NULL,
  dimensions_cm    TEXT NOT NULL,
  provenance       TEXT NOT NULL,             -- 'Museo Benito Quinquela Martín'
  asset_id         TEXT NOT NULL REFERENCES asset(id)
);

-- Linaje versionado. En los datos reales:
--   1582_lineart_neutral_05  v1 algorithmic
--     └─ 1582_lineart_curado_v1  v2 manually_curated  ← usado por el lote final
--   1663_lineart_neutral_06  v1 algorithmic (sin curar)
-- Las v2/v3/v4 exploratorias de Drive NO se cargan: no generaron proyecciones.
CREATE TABLE control_map (
  id                TEXT PRIMARY KEY,
  sketch_id         TEXT NOT NULL REFERENCES sketch(id),
  version           INTEGER NOT NULL,
  provenance        map_provenance NOT NULL,
  derived_from_id   TEXT REFERENCES control_map(id),   -- la cadena
  extraction_method TEXT NOT NULL,   -- 'lineart de controlnet_aux 0.0.7,
                                     --  lado corto 512 → lienzo 704×512'
  curation_notes    TEXT,            -- QUÉ se corrigió y POR QUÉ
  curation_metrics  JSONB,           -- {"tinta_removida_pct": 14.35, ...}
  asset_id          TEXT NOT NULL REFERENCES asset(id),
  diff_asset_id     TEXT REFERENCES asset(id),
  created_at        TIMESTAMPTZ NOT NULL,
  UNIQUE (sketch_id, version),
  UNIQUE (id, sketch_id)             -- habilita la FK compuesta de lote
);


-- =====================================================================
--  CORPUS Y ADAPTACIÓN ESTILÍSTICA
--
--  Relación 1:N entre versión de corpus y obra: hay una sola versión y
--  las 39 obras pertenecen a ella. Si apareciera una segunda versión con
--  un subconjunto distinto, esto pasa a M:N con una tabla puente.
-- =====================================================================

CREATE TABLE corpus_version (
  id          TEXT PRIMARY KEY,      -- 'corpus_v1_E0'
  label       TEXT NOT NULL,
  description TEXT,
  source_file TEXT,                  -- 'corpus_v1_E0.xlsx'
  created_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE corpus_work (
  id                TEXT PRIMARY KEY,
  corpus_version_id TEXT NOT NULL REFERENCES corpus_version(id),
  filename          TEXT NOT NULL,
  title             TEXT NOT NULL,
  cluster           TEXT,
  cluster_validado  BOOLEAN,
  year              TEXT,            -- NULL → 'No documentado'
  technique         TEXT,            -- NULL → 'No documentado'
  dimensions_cm     TEXT,            -- NULL → 'No documentado'
  provenance        TEXT,            -- NULL → 'No documentado'
  asset_id          TEXT REFERENCES asset(id)
);

-- Una sola versión entrenada: quinquela_lora_v1.
-- Los 5 checkpoints (épocas 5/10/15/20/25) no se modelan como filas:
-- cuál se usó es un parámetro de generación, y vive en projection.
CREATE TABLE lora_version (
  id                TEXT PRIMARY KEY,        -- 'quinquela_lora_v1'
  label             TEXT NOT NULL,
  corpus_version_id TEXT NOT NULL REFERENCES corpus_version(id),
  trainer           TEXT,                    -- 'kohya sd-scripts v0.11.1'
  training_params   JSONB NOT NULL,          -- rank, alpha, lrs, epochs, ...
  trained_at        TIMESTAMPTZ,
  file_sha256       TEXT,                    -- NULL → 'No documentado'
  training_notes    TEXT
);


-- =====================================================================
--  CORRIDA DE GENERACIÓN
--
--  Entidad derivada del run log: gpu y versiones de librerías son
--  constantes dentro de una corrida y varían entre corridas (las
--  exploratorias usaron diffusers 0.27.2; la final, 0.39.0).
--  Registra el entorno de software exacto que produjo cada lote. RNF-09.
-- =====================================================================

CREATE TABLE generation_run (
  -- Nomenclatura VIGENTE del cap. 3 (la curaduría del mapa es E5).
  -- Los archivos de Drive conservan el prefijo histórico E3; la
  -- correspondencia se resuelve en pip_freeze_file, no en el id.
  id                   TEXT PRIMARY KEY,     -- 'RUN-E5-1582-CURADO-20260814-184521'
  run_at               TIMESTAMPTZ NOT NULL,
  gpu                  TEXT,
  base_model_name      TEXT NOT NULL,        -- 'runwayml/stable-diffusion-v1-5'
  base_model_sha256    TEXT,                 -- NULL → 'No documentado'
  controlnet_name      TEXT NOT NULL,        -- 'lllyasviel/control_v11p_sd15_lineart'
  controlnet_sha256    TEXT,                 -- NULL → 'No documentado'
  vae_name             TEXT,                 -- NULL → 'No documentado'
  library_versions     JSONB NOT NULL,       -- diffusers, torch, peft, ...
  pip_freeze_file      TEXT,                 -- nombre literal en Drive,
                                             -- p.ej. 'E3_mapa_curado_..._pipfreeze.txt'
  notes                TEXT
);


-- =====================================================================
--  LOTE — la unidad del sistema
-- =====================================================================

CREATE TABLE lote (
  id             TEXT PRIMARY KEY,           -- 'LOT-1582-01'
  sketch_id      TEXT NOT NULL REFERENCES sketch(id),
  sequence       INTEGER NOT NULL,           -- orden de disponibilidad (RF-04, RF-05)
  control_map_id TEXT NOT NULL,              -- qué VERSIÓN del mapa usó este lote
  run_id         TEXT NOT NULL REFERENCES generation_run(id),
  -- NOT NULL porque todo lote cargado pasó por LoRA. Si alguna vez se
  -- cargara un lote baseline (sin adaptación), se afloja con:
  --     ALTER TABLE lote ALTER COLUMN lora_version_id DROP NOT NULL;
  lora_version_id TEXT NOT NULL REFERENCES lora_version(id),
  generated_at   TIMESTAMPTZ NOT NULL,
  notes          TEXT,                       -- p.ej. el límite documentado de 1663
  UNIQUE (sketch_id, sequence),
  UNIQUE (id, sketch_id),
  -- El id no queda librado al importador: se deriva de sus propias columnas.
  CONSTRAINT lote_id_derivado CHECK (
    id = 'LOT-' || sketch_id || '-L' || lpad(sequence::text, 2, '0')),
  -- RNF-03 estructural: el mapa de control DEBE pertenecer al boceto del lote.
  -- La base no puede almacenar un cruce.
  FOREIGN KEY (control_map_id, sketch_id) REFERENCES control_map(id, sketch_id)
);

CREATE TABLE projection (
  id              TEXT PRIMARY KEY,
  lote_id         TEXT NOT NULL,
  sketch_id       TEXT NOT NULL,
  -- Posición dentro del lote, NO ranking. RF-08 exige igual jerarquía
  -- visual y prohíbe orden de preferencia.
  position        SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 4),
  source_filename TEXT NOT NULL UNIQUE,      -- clave natural del pipeline:
                                             -- '1582_curado_lora15_w08_s1890.png'
  title           TEXT,
  generated_at    TIMESTAMPTZ NOT NULL,

  -- Parámetros de generación. seed NOT NULL: el esquema impone que toda
  -- proyección quede re-ejecutable. (La verificación bit-a-bit no se hizo;
  -- la afirmación es "re-ejecutable bajo igual GPU y resolución".)
  seed                      BIGINT       NOT NULL,
  steps                     INTEGER      NOT NULL,
  cfg_scale                 NUMERIC(5,2) NOT NULL,
  scheduler                 TEXT         NOT NULL,   -- 'DPMSolverMultistep, Karras sigmas'
  width                     INTEGER      NOT NULL,   -- 704, de la spec congelada
  height                    INTEGER      NOT NULL,   -- 512, idem
  controlnet_weight         NUMERIC(5,3) NOT NULL,   -- columna cond_scale del log
  controlnet_guidance_start NUMERIC(5,3),            -- NULL → 'No documentado'
  controlnet_guidance_end   NUMERIC(5,3),            -- NULL → 'No documentado'
  lora_weight               NUMERIC(5,3) NOT NULL,
  lora_checkpoint_epoch     SMALLINT     NOT NULL,   -- 15
  clip_skip                 SMALLINT,                -- NULL → 'No documentado'
  prompt                    TEXT         NOT NULL,
  negative_prompt           TEXT         NOT NULL,
  extra_params              JSONB,

  -- RF-12. Regla de presentación:
  --   valor presente ................................ se muestra
  --   NULL y el campo figura acá .................... 'No aplica'
  --   NULL y el campo NO figura acá ................. 'No documentado'
  not_applicable TEXT[] NOT NULL DEFAULT '{}',
  -- En los datos actuales: '{postproceso}' en las 8 proyecciones.

  asset_id TEXT NOT NULL REFERENCES asset(id),

  UNIQUE (lote_id, position),
  UNIQUE (id, lote_id),
  -- Idem: PRJ-1582-L01-A01 se deriva de lote_id + position. El segmento
  -- L01 coincide por construcción con el del lote, no por convención.
  CONSTRAINT projection_id_derivado CHECK (
    id = 'PRJ-' || substring(lote_id from 5) || '-A' || lpad(position::text, 2, '0')),                      -- habilita la FK de lote_candidate
  FOREIGN KEY (lote_id, sketch_id) REFERENCES lote(id, sketch_id)
);


-- =====================================================================
--  OPERACIONES DEL USUARIO
-- =====================================================================

-- RF-04, RF-07. La disponibilidad de RF-05 no necesita columna de estado:
-- un lote está disponible si no tiene fila acá para esta cuenta.
-- Estado GLOBAL con atribución de autoría, en espejo con lote_candidate:
-- el lote queda obtenido para el sistema y se registra qué cuenta lo obtuvo.
-- Alternativa descartada: disponibilidad por cuenta (UNIQUE lote_id,user_id),
-- que haría que dos cuentas vieran distintos lotes disponibles — una
-- distinción que el AF no declara.
CREATE TABLE lote_obtencion (
  lote_id      TEXT PRIMARY KEY REFERENCES lote(id),
  user_id      INTEGER NOT NULL REFERENCES app_user(id),
  obtained_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Resultado REAL de las cinco verificaciones de RF-06. RNF-10 prohíbe
  -- simular procesos: los pasos que muestra la pantalla son estos.
  verification JSONB NOT NULL
);

-- RF-13. Tres garantías estructurales:
--   'una única candidata por lote' → lote_id es la clave primaria
--   'retirar la candidata'         → DELETE de la fila; el historial queda en audit_log
--   'sin cruces' (RNF-03)          → la FK compuesta impide señalar una
--                                     proyección de otro lote
CREATE TABLE lote_candidate (
  lote_id       TEXT PRIMARY KEY REFERENCES lote(id),
  projection_id TEXT NOT NULL,
  user_id       INTEGER NOT NULL REFERENCES app_user(id),
  set_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (projection_id, lote_id) REFERENCES projection(id, lote_id)
);


-- =====================================================================
--  VERIFICACIÓN DE INTEGRIDAD — RF-06
--  Consultable por el importador y por el comando de verificación.
-- =====================================================================

CREATE VIEW lote_integrity AS
SELECT l.id                AS lote_id,
       l.sketch_id,
       count(p.id)         AS projection_count,
       count(p.id) = 4     AS is_complete
FROM lote l
LEFT JOIN projection p ON p.lote_id = l.id
GROUP BY l.id, l.sketch_id;
