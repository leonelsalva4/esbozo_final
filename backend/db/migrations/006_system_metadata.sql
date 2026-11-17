-- La administración usa el payload histórico de auditoría; no se mantiene
-- una segunda columna vacía para el mismo propósito.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM audit_log WHERE details <> '{}'::jsonb) THEN
  RAISE EXCEPTION 'Hay detalles de auditoría para preservar antes de consolidar el esquema';
 END IF;
END $$;
ALTER TABLE audit_log DROP COLUMN details;
INSERT INTO system_metadata(key,value) VALUES('schema_version','6')
ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now();
