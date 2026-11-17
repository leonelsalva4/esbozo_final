-- Separar presencia en el paquete de incorporación al conjunto activo.
ALTER TABLE provenance_link RENAME COLUMN delivered TO available_in_app;
ALTER TABLE provenance_link ADD COLUMN package_status TEXT;
CREATE TABLE operation_resource (
 operation_id TEXT NOT NULL REFERENCES production_operation(id),
 field_path TEXT NOT NULL,
 role_documented TEXT NOT NULL,
 sha256 TEXT NOT NULL,
 resource_sha256 TEXT REFERENCES provenance_resource(sha256),
 PRIMARY KEY(operation_id,field_path,sha256)
);
CREATE INDEX operation_resource_sha_idx ON operation_resource(sha256);
