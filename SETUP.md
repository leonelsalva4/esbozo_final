# Instalación y desarrollo

## 1. Instalar herramientas

Instalar Node.js 24 y PostgreSQL 17. En Windows, incluir las herramientas de línea de comandos del instalador de PostgreSQL. En macOS se puede usar Homebrew o Postgres.app. Mantener el servicio PostgreSQL iniciado.

Desde la raíz del repositorio, ejecutar en Terminal o PowerShell:

```sh
npm ci
npm ci --prefix backend
npm ci --prefix desktop
```

Los scripts de respaldo y restauración buscan las herramientas en `PG_BIN_DIR`, luego en `PATH` y finalmente en las rutas habituales de instalación. Si hace falta indicar la carpeta:

macOS (ajustar versión y ruta a la instalación):

```sh
export PG_BIN_DIR="/opt/homebrew/opt/postgresql@17/bin"
```

Windows PowerShell:

```powershell
$env:PG_BIN_DIR = "C:\Program Files\PostgreSQL\17\bin"
```

## 2. Preparar la conexión

Crear desde pgAdmin un rol con contraseña propia y una base **nueva y vacía**, propiedad de ese rol. No es necesario otorgarle privilegios de superusuario. Por ejemplo, usar `esbozo_app` y `esbozo` como nombres; elegir la contraseña en esa instalación.

Copiar el archivo de ejemplo:

macOS:

```sh
cp backend/.env.example backend/.env
```

Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

Editar `backend/.env`:

```dotenv
DATABASE_URL=postgresql://esbozo_app:CONTRASENA_LOCAL@127.0.0.1:5432/esbozo
PORT=4000
JWT_SECRET=SECRETO_ALEATORIO_PROPIO
```

Reemplazar los valores de ejemplo. Si la contraseña contiene caracteres reservados de una URL, codificarlos en `DATABASE_URL`. Para generar un secreto, ejecutar lo siguiente y copiar su resultado en `JWT_SECRET`:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

El secreto debe tener al menos 32 caracteres y mantenerse privado. La aplicación rechaza una configuración incompleta. No compartir `.env` ni agregarlo a Git.

## 3. Instalar los datos

Pedir a los autores la exportación privada de instalación. Se necesitan **ambos archivos de la misma exportación**, juntos en una carpeta: `esbozo.dump` y `VERIFICACION.json`.

```sh
node backend/scripts/restore-installation.mjs --apply --dump "/ruta/installation-fecha/esbozo.dump"
```

En PowerShell se usa el mismo comando con una ruta de Windows, por ejemplo `"C:\Esbozo-datos\installation-fecha\esbozo.dump"`.

El script comprueba el hash y rechaza una base que ya contenga objetos. Restaura en una transacción y conserva las cuentas incluidas en la exportación. Las credenciales de acceso se comunican por separado; no hay una contraseña pública de administración.

**No ejecutar `backend/db/schema.sql` sobre una base existente.** Es el esquema histórico y elimina el esquema público. Tampoco intentar sustituir esta instalación ejecutando las nueve migraciones sobre una base histórica vacía: la migración 004 exige los resultados reales de la transición. La exportación vigente ya incluye el esquema y los datos correspondientes.

## 4. Abrir la aplicación

```sh
npm run dev
```

El comando inicia Express y Electron con Vite. La API escucha en la interfaz local, puerto 4000; Vite usa 5173. No abrir dos instancias de desarrollo al mismo tiempo. Si el puerto está ocupado, cerrar la instancia anterior de Esbozo antes de volver a iniciar.

La generación se realizó fuera de esta aplicación. Las imágenes se recuperan de PostgreSQL y su integridad se verifica antes de servirlas. No se necesitan servicios de inferencia ni Internet durante la consulta.

## 5. Pruebas

Pruebas sin base ni material patrimonial:

```sh
npm run test:unit
npm run build --prefix backend
npm run build --prefix desktop
npm run lint --prefix desktop
```

Para la integración, crear otra base vacía cuyo nombre comience con `esbozo_test_`, restaurar allí la misma exportación y preparar el archivo privado `data/testing/p00/backend.env` con su conexión y un secreto de prueba. Las pruebas habituales crean y eliminan esquemas propios dentro de esa copia.

```sh
npm test
npm run dev:test
```

Los ensayos de importación necesitan además los paquetes privados originales bajo `data/imports/` y los registros de validación correspondientes. La prueba `database-recovery.test.mjs` crea una instancia PostgreSQL exclusiva y temporal: requiere `initdb`, `pg_ctl` y una exportación vigente bajo `data/delivery/`. Detiene solamente esa instancia, nunca el servicio de uso.

La medición de sólo lectura se ejecuta con `node backend/scripts/benchmark-readonly.mjs`. Sus tiempos corresponden a la API y su memoria al servidor; no equivalen a los tiempos de presentación ni a la memoria total de Electron y PostgreSQL.

## 6. Respaldo y actualización

Conservar una copia verificada antes de cambiar el esquema:

```sh
node backend/scripts/export-installation.mjs --apply
npm run db:migrate --prefix backend -- --test
npm run db:migrate --prefix backend -- --apply
```

La exportación se guarda en `data/delivery/`, fuera de Git. Contiene datos y hashes de contraseña; tratarla como información privada. `schema_migration` registra las migraciones aplicadas y sus hashes. Las migraciones no reemplazan los paquetes de imágenes.

## 7. Distribución de escritorio

Compilar en el sistema operativo de destino:

```sh
npm run package:local
node scripts/configure-desktop.mjs --apply
```

En macOS se genera `Esbozo.app`; en Windows, `Esbozo.exe` dentro de la carpeta de distribución. Entregar la carpeta completa. Los resultados quedan bajo `release/` y no incluyen `.env`, imágenes ni la base.

El configurador toma la conexión de `backend/.env`, genera un secreto independiente y conserva cualquier configuración ya existente. La configuración privada de la distribución queda en:

- macOS: `~/Library/Application Support/Esbozo/backend.env`.
- Windows: `%APPDATA%\Esbozo\backend.env`.

Cerrar el servidor de desarrollo antes de abrir el ejecutable: ambos usan el puerto 4000. Al abrirse, Electron inicia su servidor local; al cerrarse, lo detiene. La base PostgreSQL continúa como servicio independiente.

`npm run package:verify` verifica el paquete de macOS con la copia de pruebas. Windows requiere además comprobar el ejecutable en ese sistema. Los paquetes locales no tienen firma institucional ni notarización.

## Problemas frecuentes

- **Login con error de consulta:** comprobar conexión y esquema. Una base creada sólo con el esquema histórico no sirve para esta versión; restaurar la exportación en una base nueva.
- **Falta un módulo:** ejecutar nuevamente los tres `npm ci` en raíz, backend y desktop. No compartir `node_modules` entre sistemas operativos.
- **No se encuentra `pg_restore` o `pg_dump`:** revisar `PG_BIN_DIR` y la versión del programa. Para restaurar un dump de PostgreSQL 17, usar herramientas 17 o posteriores.
- **Imagen no disponible:** revisar el registro técnico y la integridad de la instalación; no sustituirla por otra imagen. Los errores de conexión se pueden reintentar después de restablecer PostgreSQL.
- **Registro técnico:** `Esbozo/logs/backend.log` dentro de la carpeta de datos del usuario. Registra fecha, operación y código de error, sin credenciales ni consultas SQL.

Las pruebas que exigen el archivo histórico íntegro se informan como omitidas si faltan recursos privados del manifiesto. Esa condición no se cuenta como una aprobación del archivo. La validación del paquete de instalación actual y la de los archivos de investigación originales son comprobaciones distintas.
