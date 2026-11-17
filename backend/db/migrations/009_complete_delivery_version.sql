-- Publicar la versión de esquema que incorpora los hitos documentados.
INSERT INTO system_metadata(key,value) VALUES('schema_version','9')
ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now();
