# Arquitectura de la aplicación

| Parte | Implementación |
|---|---|
| Escritorio | Electron, con aislamiento de contexto, sandbox y sin Node.js en el renderer |
| Interfaz | React y TypeScript; compilación con Vite |
| API local | Express y TypeScript sobre Node.js 24; escucha en loopback |
| Base | PostgreSQL, con imágenes como `bytea` y metadatos relacionados |
| Acceso a datos | Driver `pg`, consultas parametrizadas y transacciones |
| Autenticación | Contraseñas Argon2, JWT de duración limitada y revocación por versión de sesión |
| Administración | Gestión de cuentas y roles, auditoría y conservación de responsables históricos |
| Integridad | SHA-256 en importación, restauración y entrega de recursos |
| Distribución | Electron Packager; configuración y base privadas, externas al ejecutable |

La generación se realizó por separado en Colab con FLUX.2 [klein] Base 9B y una adaptación LoRA propia. Los scripts importan resultados precomputados y conservan registros originales. El botón de demostración recupera y verifica resultados existentes; no ejecuta un modelo.

El prototipo ejecuta la interfaz, la API y PostgreSQL en la misma computadora. Un despliegue con servidor del museo exige configurar transporte seguro, red y acceso a la API; no está activado por esta distribución local.

Las migraciones documentan la evolución desde el esquema histórico. La instalación en otro equipo se realiza restaurando una exportación actual verificada sobre una base vacía, según [SETUP.md](../SETUP.md).

Las decisiones de revisión pertenecen a los usuarios. La importación no crea conformidades ni convierte una candidata en aprobación institucional.
