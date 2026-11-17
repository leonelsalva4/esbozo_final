-- La identidad de una referencia se acredita por documento y hash de imagen.
-- No implica pertenencia a una versión de corpus ni uso en entrenamiento.
CREATE TABLE reference_identity (
 resource_sha256 TEXT NOT NULL REFERENCES provenance_resource(sha256),
 source_sha256 TEXT NOT NULL REFERENCES provenance_resource(sha256),
 field_path TEXT NOT NULL,
 title_documented TEXT NOT NULL,
 inventory_documented TEXT NOT NULL,
 PRIMARY KEY(resource_sha256,source_sha256,field_path)
);
INSERT INTO system_metadata(key,value) VALUES('schema_version','7')
ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now();
