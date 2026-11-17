> Documento histórico de implementación. Para instalar la entrega vigente, consultar README.md y SETUP.md; el estado de validación actual se informa en VALIDACION_FINAL.md.

# Estado inicial verificado y respaldo

Fecha de trabajo: 22 de octubre de 2026, hora de Argentina. Corresponde al paso P00 del plan de implementación.

## Repositorio y autoría

- Ruta: `/Users/leonel/Desktop/UADE/tesis/Esbozo`.
- Rama: `dev`, HEAD inicial `0f76505`.
- Al comenzar este paso, el único archivo local pendiente era el plan de implementación de mockups. Se conserva.
- Autores del PFI: Leonel Salva y Luciana Russo.
- Trailer confirmado en el historial: `Co-authored-by: lucianacrusso <lurusso@uade.edu.ar>`.
- La regla de coautoría para commits nuevos incluidos en cada push queda registrada en `AGENTS.md`. No se realizó commit ni push en este paso.

## Base original comprobada

Conexión local a PostgreSQL 17.10; base `esbozo`, rol de aplicación `esbozo_app`.

| Entidad | Cantidad |
| --- | ---: |
| Bocetos | 2 |
| Lotes | 1 |
| Proyecciones | 4 |
| Assets / blobs | 9 / 9 |
| Mapas de control | 2 |
| Corridas | 1 |
| Versiones de corpus | 1 |
| Obras individuales de corpus | 0 |
| Versiones de LoRA | 1 |
| Cuentas | 1 |
| Obtenciones | 1 |
| Candidatas activas | 1 |
| Operaciones de auditoría | 188 |

Los bocetos 1582 y 1663 tienen sus metadatos y su imagen. El 1663 no tiene lote.

El único lote es `LOT-1582-L01`, de la corrida `RUN-E5-1582-CURADO-20260814-184521`, con `quinquela_lora_v1`, Stable Diffusion 1.5 y ControlNet lineart. Es un conjunto histórico anterior a FLUX. La correspondencia actual es A01/1890, A02/1977, A03/314 y A04/2718; no coincide con el orden propuesto por los mockups finales y debe conservarse como historia propia.

La candidata original es `PRJ-1582-L01-A02`, registrada el 29 de agosto de 2026 a las 00:22:02 UTC, equivalente al 28 de agosto a las 21:22:02 en Argentina. Hay una cuenta institucional activa y ningún rol administrador implementado.

Los nueve blobs coinciden con el tamaño y SHA-256 registrados. En disco hay nueve archivos de material, además de archivos de sistema: dos bocetos, tres imágenes de mapas/diff y cuatro proyecciones antiguas.

## Respaldo y prueba de restauración

Carpeta local, ignorada por Git:

`data/backups/p00-2026-10-22T23-59-45Z/`

El nombre usa UTC; su creación corresponde al 22 de octubre a las 20:59:45 en Argentina.

Contenido:

- `database.dump`: respaldo PostgreSQL en formato custom con las 15 tablas y los bytes de imágenes.
- `schema.sql`: exportación del esquema efectivo de la instalación.
- `local-data.tar.gz`: copia de los archivos locales de `data/`, excluyendo respaldos y entorno de pruebas para evitar copias recursivas.
- `backend.env`: copia de la configuración original, con permisos de lectura/escritura del propietario.
- `plan.md`: copia del plan que estaba pendiente al iniciar el respaldo.
- `inventory.json`: inventario de Git, esquema, conteos, asociaciones y hashes, sin contraseñas ni tokens.
- `restore-list.txt`: tabla de contenidos legible del archivo PostgreSQL.
- `restore-verification.json`: resultado de restauración en la base separada.
- `final-verification.json`: comprobación de preservación de la base original y hashes de los archivos de respaldo.

La carpeta tiene permisos `0700` y los archivos iniciales `0600`. El respaldo se conserva localmente: no debe incluirse en Git, porque contiene imágenes, datos de cuentas y configuración.

Se creó una base nueva `esbozo_test_p00_20261022_235945`, propiedad de `esbozo_app`, y se restauró allí con `pg_restore --exit-on-error --no-owner --no-privileges`. Se verificó:

- Coincidencia de los conteos de las 15 tablas.
- Coincidencia de tamaño y SHA-256 de las nueve imágenes.
- Coincidencia de la candidata restaurada con la original.

La creación de esta copia no cambió roles ni permisos de la base original.

### Cómo volver a comprobar una restauración

Usar una base nueva y vacía. Los comandos siguientes son una referencia de recuperación y no se ejecutan automáticamente:

```sh
createdb -h localhost -U leonel -O esbozo_app esbozo_test_restore_nueva
pg_restore -h localhost -U esbozo_app \
  --exit-on-error --no-owner --no-privileges \
  -d esbozo_test_restore_nueva \
  data/backups/p00-2026-10-22T23-59-45Z/database.dump
```

Estos roles corresponden a esta instalación. PostgreSQL puede solicitar la contraseña del rol; no incorporarla al comando ni a documentación versionada. Antes de usar una copia restaurada, comparar tablas, candidata y hashes con `inventory.json`, como se hizo en este paso.

Para inspeccionar los archivos locales, extraer el TAR dentro de una carpeta nueva, sin sobrescribir `data/`. No reemplazar la configuración operativa con `backend.env` durante una inspección.

No restaurar sobre `esbozo` ni ejecutar el esquema destructivo para aplicar cambios. Las futuras migraciones deben probarse en la copia y contar con su respaldo correspondiente.

## Arranque comprobado

Desde la raíz:

```sh
npm run dev
```

Levanta el backend en el puerto 4000, Vite en el 5173 y la ventana de Electron. Los scripts `scripts/start-mac.command` y `scripts/start.sh` apuntan a ese mismo recorrido. PostgreSQL debe estar en ejecución antes.

Para trabajar sobre la copia preparada:

```sh
npm run dev:test
```

Este comando utiliza `scripts/start-test.mjs` y la configuración local ignorada `data/testing/p00/backend.env`. Requiere una base cuyo nombre comience con `esbozo_test_`, un secreto de sesión separado y puerto 4000. No modifica `backend/.env`.

No ejecutar ambos comandos simultáneamente: usan los mismos puertos. El secreto del entorno de pruebas es distinto del original. Cerrar el proceso con Ctrl+C antes de cambiar de entorno.

La configuración y la base de pruebas son locales a esta máquina; una clonación nueva del repositorio debe preparar su propia copia antes de ejecutar `dev:test`.

### Verificaciones realizadas

Se ejecutaron 30 comprobaciones de API sobre la copia, con resultado correcto:

- Health con consulta real a PostgreSQL y rechazo de consulta protegida sin sesión.
- Login, cuenta actual y logout.
- Listado de los dos bocetos, disponibilidad del 1582 y ausencia de lote del 1663.
- Obtención del lote del 1582 con sus cinco verificaciones actuales.
- Consultas de proyecciones, detalle, mapa, corrida, obtención guardada y auditoría.
- Descarga autenticada de las nueve imágenes y comprobación de sus bytes y hashes.
- Marcado, retiro y nueva selección de la candidata en la copia.
- Respuesta del frontend de Vite.

También se verificó el recorrido en la ventana Electron: login, Inicio con ambos bocetos, ficha del 1582, grilla de cuatro alternativas, detalle, comparación lado a lado, superposición y trazabilidad. Se cerró DevTools para inspeccionar el área de la app.

Las operaciones de prueba generaron auditoría y nuevas fechas exclusivamente en la copia. La verificación final de `esbozo` mantuvo las 188 operaciones, los conteos iniciales, la candidata, la obtención y las cuentas sin cambios; los nueve assets siguieron siendo íntegros.

La comprobación visual de este paso demuestra el arranque y navegación de la implementación actual. No certifica todavía fidelidad a los nuevos mockups, todos los gestos de zoom/paneo, desempeño ni funcionamiento de las pantallas futuras.

## Diagrama de datos nuevo

La referencia recibida se conserva localmente en `data/references/modelo-datos-2026-10-22.png`, fuera de Git. Se tomará como modelo conceptual para las migraciones siguientes.

Correspondencias y agregados principales:

- Boceto, corrida, versión de corpus, versión de LoRA, lote, proyección y selección ya tienen equivalentes, aunque sus campos necesitan adaptación.
- Agregar guías interpretativas versionadas y su linaje; conservar los mapas de control históricos como otra clase de recurso.
- Agregar etapas de producción por proyección y relaciones muchos-a-muchos de etapas con guías y obras de referencia.
- Agregar revisión de etapa con usuario/fecha y una única conformidad activa por etapa.
- Extender Usuario con rol administrador y las operaciones de mantenimiento de cuentas; conservar los datos de autenticación que el esquema físico requiere.
- Mantener las tablas técnicas de bytes, metadatos de assets, obtenciones, auditoría y versiones aunque no estén dibujadas.
- Traducir las cuatro proyecciones por lote y la candidata única a restricciones y validaciones; un diagrama conceptual no reemplaza la comprobación de integridad del importador.

El diagrama no determina por sí solo cómo registrar operaciones, máscaras, archivos, aplicabilidad o retiro secuencial de conformidades. Esos detalles se resolverán conforme a los requisitos y datos reales en P03/P09, sin perder información histórica.

No se aplicaron migraciones ni se agregó todavía el rol administrador en este paso.
