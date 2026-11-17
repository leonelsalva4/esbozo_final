> Documento histórico de implementación. Para instalar la entrega vigente, consultar README.md y SETUP.md; el estado de validación actual se informa en VALIDACION_FINAL.md.

# Integración de resultados precomputados

Autores: Leonel Salva y Luciana Russo.

## Estado comprobado

El paquete real contiene ocho finales: cuatro por inventario 1582 y 1663. Se verificaron tamaño y SHA-256 de 8782 entradas, correspondientes a 5335 archivos únicos. Se decodificaron las imágenes finales y las etapas explícitamente asociadas por el índice. La copia de pruebas contiene los dos lotes y sus ocho proyecciones. La base principal también fue actualizada, después del ensayo sobre la copia y de un nuevo respaldo verificado. Contiene 76 recursos visuales reales, incluyendo las entradas vinculadas por registros de operación.

Las cuatro posiciones son 2718, 1890, 1977 y 314. La etiqueta de rama se conserva separada de la semilla global; el piloto no tiene una semilla global documentada. Las semillas, entradas y parámetros de intervenciones localizadas se consultan en los registros originales.

No se importan candidatas ni conformidades. La elección externa de una imagen de cierre se registra por separado, con la precisión de fecha entregada. Los valores de ejemplo de los mockups no se convierten en decisiones reales.

## Extensiones del diagrama

- `source_package`, `provenance_resource`, `provenance_origin` y `provenance_link` identifican el paquete, bytes originales, múltiples rutas y relaciones mediante hash. La presencia en el paquete y la disponibilidad en la aplicación son estados diferentes.
- `production_operation` y `operation_resource` conservan operaciones y roles de entrada explícitos. Una relación por nombre de archivo no acredita adopción. Se identifican registros que documentan el hash de una composición utilizada; la continuidad se sigue sólo por el padre o la base declarados. Se conserva la relación documental sin afirmar una ejecución homogénea de todo el lote.
- `external_selection` distingue la selección durante la producción de la candidata del lote en Esbozo.
- `interpretive_guide`, `stage_guide` y `stage_reference` representan recursos de las etapas. No se asignan inventarios, títulos, sectores, versiones ni linajes a partir de nombres. Un fragmento con inventario desconocido se mantiene como tal; no crea una obra ni una versión de corpus ficticias.
- El intermedio FA de 1663 se conserva como operación técnica. La revisión mantiene las tres etapas de interfaz: escena base, figuras y acabado.
- Se permite ausencia documentada de fecha exacta y de una versión de corpus del adaptador. No se completa esa información con la fecha de importación.

En 1582/2718 la base fue identificada pero no entregada; GL10 es la composición de figuras anterior a B4 y no se sustituye por el final. En 1663/2718 no se documentaron base y figuras. En ambos pilotos el acabado separado no aplica. Los archivos finales siguen siendo consultables aunque una etapa no pueda revisarse.

## Retirada del conjunto anterior

Los respaldos completos, inventarios y hashes se conservan bajo `data/backups/`, fuera de Git. El paquete original también se conserva íntegro fuera de Git. Los documentos que mencionan el procedimiento anterior se excluyen del conjunto activo, sin modificar sus bytes históricos.

La migración 004 exige que el paquete real esté instalado y que no queden modelos, mapas ni imágenes de control del conjunto anterior. Sólo entonces retira sus estructuras específicas. Los importadores anteriores y la pantalla obsoleta se conservan en `data/archive/pre-flux-code/`; no forman parte del producto. Las migraciones anteriores son historia de evolución del esquema y no se reescriben.

Secuencia para un destino existente respaldado:

1. Ejecutar migraciones hasta 003 (desde backend, con --apply --through=003).
2. Validar paquete y respaldo; ejecutar import-results.mjs --apply.
3. Aplicar las migraciones restantes: el esquema actual llega a 007.
4. Incorporar relaciones verificables con enrich-results.mjs --apply y comprobar el conjunto activo.

Primero se ensaya todo con `--test`. Nunca ejecutar `schema.sql` sobre una base existente. El importador conserva las cuentas y los eventos de sesión. Los datos ficticios de pruebas se limitan a esquemas descartables.

## Verificación y límites

Las pruebas de lotes (10), revisión de etapas (17), procedencia (5) y cuentas, registro y recuperación de errores (13) pasaron sobre esquemas aislados. Los 76 recursos visuales se recuperaron por API y sus bytes coinciden con el SHA-256 registrado, incluidos ambos bocetos originales. La búsqueda del procedimiento anterior no encontró coincidencias en 98517 filas de la base principal ni columnas específicas antiguas después de la migración 004.

La compilación de servidor y frontend y el lint del frontend pasan. La revisión visual de la nueva trazabilidad está pendiente: el navegador rechazó el acceso a localhost por permisos. Esto no certifica igualdad visual con E10 ni el cierre de todas las pantallas del ZIP.

El catálogo auxiliar de OCR, mediciones y escenarios se movió a `data/references/mockups-v1/catalog/`. Se comprobó que el script de catálogo sigue encontrando sus 61 referencias. Los datos del catálogo no equivalen a pruebas visuales de la aplicación.

## Administración y sesión

La migración 005 agrega el rol administrador, revocación de sesión y eliminación con disociación de identidad. La cuenta institucional anterior conserva su acceso y su rol. El usuario autorizó resolver el nombre de la administración inicial: se aprovisionó `administracion` / `Administración institucional`, conservando la cuenta institucional. La credencial aleatoria se guardó con permisos 0600 en una ruta ignorada por Git; su validez se comprobó sin exponerla en los informes. La API administrativa se comprobó sobre la base separada de pruebas. El script local `backend/scripts/provision-admin.mjs` recibe esos dos valores, crea una credencial aleatoria y se niega a actuar si ya existe una administradora activa. Las cuentas posteriores se administran desde la aplicación.

Se integraron pantallas de cuentas y registro, diálogos de alta/estado/eliminación/credencial, filtros y detalle de operaciones. Las cuentas institucionales ven las acciones compartidas de los lotes y sus propias sesiones; la administración puede consultar además la actividad de cuentas. Los accesos fallidos no exponen el identificador escrito. La eliminación conserva las operaciones bajo “Cuenta eliminada”.

El servidor consulta el estado y la versión de sesión actuales en cada solicitud. Desactivar, eliminar o restablecer una credencial invalida sesiones previas. El cliente muestra el aviso al recibir una respuesta autenticada de sesión vencida o cuenta desactivada; además comprueba la sesión cada minuto y al recuperar foco. Un error temporal de base no cierra la sesión local. El archivo de la pantalla de login no se modificó.

Estos componentes están integrados, pero requieren revisión visual e interacción en navegador autorizado. La guía y Acerca de incluyen los textos y campos de las referencias; Acerca de consulta versiones reales. Su detalle visual todavía no está certificado contra los mockups.

## Insumos e identidad documental

La ficha permite desplegar las operaciones y abrir sus insumos como imágenes y sus registros originales como documentos. El rol de cada entrada se conserva literalmente; una máscara, una base o un par de ejemplos no se convierte automáticamente en una guía interpretativa. Los intermedios técnicos conservan su pertenencia a la proyección sin imponerles una etapa de revisión no acreditada.

La migración 007 agrega identidades de referencias por documento y hash. Se acreditó “Día de trabajo”, inventario 582, mediante el campo pipeline_input_sha256 de un registro original. Las restantes referencias mantienen su identidad como no documentada cuando falta una relación explícita suficiente. Esta identidad no acredita pertenencia a una versión del corpus ni uso en adaptación. No se infieren títulos o inventarios del nombre de archivo.

El importador de transición reutiliza el paquete ya instalado y rechaza reemplazar resultados reales anteriores por otro paquete. Los siguientes lotes deben incorporarse conservando los existentes. El enriquecimiento bloquea las filas de los lotes afectados para no intercalarse con una revisión humana.

## Corrección de recursos de alta resolución

El escaneo 1582 tiene 7019×5100 px. El límite inicial de 32 MP de integridad lo rechazaba. Se amplió a 64 MP, con decodificación JPEG limitada y una caché acotada de verificaciones. En cada lectura se vuelven a comprobar los bytes, el tamaño, el hash y los metadatos. Se reutiliza sólo la decodificación de contenido idéntico; los fallos no se cachean. El material original no se redujo ni recodificó.

## Distribución y restauración

El paquete local incluye Electron, el frontend y el servidor. No incluye imágenes patrimoniales, base ni configuración privada. La compilación limpia sus salidas generadas para retirar módulos obsoletos. La comprobación del paquete usa Electron en modo Node y no abre una ventana; no certifica la GUI.

Se preparó una exportación de instalación separada y privada. Se restauró en una base temporal de Esbozo y se comprobaron sus 76 imágenes. Se verificó que la herramienta rechace restaurar sobre una base con objetos existentes. No se alteró la base principal durante esa prueba. Las imágenes y los ejemplos de los mockups siguen fuera de Git.

Ver la [matriz de las 61 referencias](diseno/COBERTURA_61_PANTALLAS.md). La comparación visual e interacción en navegador autorizado siguen pendientes.

## Navegación al registro y revisión pendiente

Desde obtención, Ver los registros abre el registro común filtrado por boceto y lote. Desde trazabilidad se agrega el filtro de alternativa. Volver conserva la pantalla de origen; Ver todo el lote retira sólo el filtro de alternativa. La API combina esos filtros con los permisos de la cuenta y comprueba la pertenencia al lote. La prueba de filtros cruzados pasó en un esquema descartable.

Los pies que identifican datos de demostración se mantienen en las vistas de desarrollo. En el conjunto real el pie identifica el uso institucional, para no presentar imágenes y decisiones reales como datos ficticios. Las fechas, identidades, disponibilidad de etapas y versiones informan el estado real en lugar de copiar los ejemplos de los PNG.

La comprobación final debe medir también los tiempos de presentación y la memoria de Electron. Las comprobaciones HTTP no acreditan los umbrales de RNF-11/RNF-12 de la interfaz. No se han obtenido capturas nuevas por el rechazo de permiso del navegador; faltan la comparación de las 61 referencias, sus transiciones y el recorrido interactivo completo sin Internet.

## Medición preliminar del servidor y recuperación de errores

`node backend/scripts/benchmark-readonly.mjs` ejecuta diez repeticiones por lote con PostgreSQL en solo lectura. Comprueba detalle, transferencia de los dos recursos de comparación, reapertura y ficha. En esta máquina el máximo fue 1.210,36 ms; el RSS observado del servidor llegó a 1.016 MiB. El informe conserva todas las muestras en `data/testing/performance/api-readonly.json`. Es una medición de API local: no certifica el tiempo hasta presentar la imagen ni la memoria total de Electron. No hubo escrituras ni se detuvo el servidor de desarrollo.

Los visores de proyección y comparación admiten paneo con flechas cuando están ampliados, Shift para un desplazamiento mayor e Inicio para centrar. El foco tiene un contorno visible que no altera sus dimensiones. La interacción en la interfaz queda pendiente de la habilitación efectiva del navegador.

Las rutas asincrónicas heredadas de Express 4 ahora derivan sus errores a una respuesta controlada. Una consulta fallida, un fallo de auditoría al cerrar sesión o un JSON inválido no deben terminar el proceso ni exponer SQL. La prueba aislada comprueba además una consulta válida posterior al error. La interfaz de acceso conserva sus archivos originales.

## Complemento consolidado del 23/10/2026

`import-complete-results.mjs` incorpora el ZIP consolidado como un paquete adicional; no vuelve a ejecutar el importador inicial ni reemplaza lotes o finales. Antes de escribir verifica los hashes del índice y del manifiesto de etapas; exige respaldo del destino y bloquea los lotes durante la transacción. Las cuentas, revisiones, candidaturas e identidades de proyecciones se comparan antes y después. Se conservan los paquetes y datos históricos previos.

La migración aditiva 008 agrega `production_stage.documented_images`: una colección de hitos reales complementarios con imagen, título, hash y procedencia. Es una ampliación de EtapaDeProducción del diagrama: los hitos no son nuevas etapas de revisión, no cambian su orden y no acreditan conformidad. La API de revisión devuelve esa colección; la pantalla de etapas permite abrir sus originales con el visor existente. Las vistas de demostración no se modifican.

Se asocian las bases A/314 del piloto 1582 y B1977 del piloto 1663. GL10 permanece como Figuras del 1582. El piloto 1663 conserva Figuras sin cierre único documentado, con AMB8, BO4v2 y BO5 accesibles como hitos; no se usa BO4v2 para fabricar un cierre. Las nuevas trayectorias conservan B0 → BP → FA → AG. Los dos acabados separados de los pilotos permanecen No aplica.

El complemento incorpora guías PNG y referencias con su relación explícita de operación; los documentos del corpus de adaptación y del complemento se vinculan a los finales en trazabilidad. Los SVG se conservan en el paquete local y no se ejecutan como contenido activo. No se solicitan coordenadas de recortes ni se inventan conformidades. Los materiales patrimoniales, respaldos y comprobaciones quedan ignorados por Git.

La migración 009 publica la versión de esquema 9 en la información de instalación. La verificación del paquete compara esa versión con la base efectiva, en lugar de fijar el número histórico 7. El control HTTP posterior recuperó las 91 imágenes activas con SHA correcto; en la copia obtenida verificó ocho respuestas de revisión y 50 imágenes de sus etapas/guías/referencias/hitos. En la principal los lotes aún no obtenidos conservan su compuerta: la importación no crea obtenciones, revisiones ni candidatas. La comprobación fue por API real, sin certificar una captura de GUI que la herramienta no pudo obtener.

Cierre de regresión del complemento: 61 pruebas backend y 13 de escritorio aprobadas; cobertura de líneas/sentencias 98,09 %, funciones 100 %, ramas 77,24 %. Paquete local reconstruido y verificado con Electron en modo Node, sin ventana, incluyendo recuperación de las 91 imágenes y versión de esquema 9.

## Asignación explícita de Figuras y cierre de contraste

El 23/10/2026 Leonel Salva identificó mediante un adjunto la imagen que debe mostrarse en Figuras de PRJ-1663-L01-A01. El adjunto es idéntico en píxeles RGB a `guias_no_generadas/piloto_2718/guia_BO4v2.png`; se conserva el original del paquete (SHA 8bfe374ce8d7fae0f713bcfbb80d3e28777043b693ff916f9d184e09f9495c83). La asociación posterior al paquete usa `source_status=user_confirmed_guide`, rol de guía interpretativa y evidencia de procedencia. Se probaron la recuperación de imagen y el orden de revisión en un esquema descartable; no se creó una conformidad en las bases de uso. Las futuras importaciones preservan esta asignación explícita frente al faltante histórico del índice.

Los tres pares que no alcanzaban 4,5:1 se corrigieron sin alterar la geometría: pie 5,294:1; etapa 5,243:1; No aplica 5,304:1. Una prueba automatizada lee los colores reales del CSS y comprueba el umbral. Esto cierra el hallazgo de contraste de RNF-06, separado de una auditoría integral de accesibilidad. RF-06 se vincula a PF-10 (integridad), que ya estaba aprobado.

## Corrección de fases confirmada el 27/10/2026

Por indicación explícita de Leonel Salva, el acabado pictórico de las alternativas 2718 de 1582 y 1663 se representa con su imagen final. Esto reemplaza, para la interfaz vigente, la clasificación histórica No aplica que describía la ausencia de una pasada separada. No afirma que existió otra ejecución generativa: asocia el final original a la tercera fase de revisión.

`assign-final-finish.mjs` aplica esa correspondencia de forma transaccional y respaldada, primero con `--test` y luego `--apply`. Registra evidencia documental y origen, reutiliza los assets existentes y verifica que las ocho alternativas tengan tres fases aplicables con imagen (24 en total). Conserva cuentas, proyecciones, conformidades y candidatas. El importador consolidado respeta esta decisión humana posterior (`user_confirmed_finish`). El acabado debe recibir su propia conformidad: no se genera una aprobación automática. Una candidata previa se conserva con aviso de revisión pendiente hasta completar las tres fases.
