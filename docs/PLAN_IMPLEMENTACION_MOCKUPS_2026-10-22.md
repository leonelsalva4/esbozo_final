> Documento histórico de implementación. Para instalar la entrega vigente, consultar README.md y SETUP.md; el estado de validación actual se informa en VALIDACION_FINAL.md.

# Plan de implementación de los mockups de Esbozo

> Estado al 23/10: este documento conserva el plan y sus decisiones originales. La ejecución posterior integró resultados reales, etapas, comparación, trazabilidad, cuentas y registro; incorporó migraciones 001–007 y un paquete local. La revisión visual final sigue pendiente de acceso autorizado y la primera administración ya está aprovisionada con el nombre institucional autorizado. Consultar [estado vigente](INTEGRACION_RESULTADOS_2026-10-23.md) y [matriz de cobertura](diseno/COBERTURA_61_PANTALLAS.md); las casillas históricas no acreditan una aceptación visual actual.

Fecha: 22 de octubre de 2026. Autores del PFI: Leonel Salva y Luciana Russo.

Estado: P00 y P01 completados el 22 de octubre de 2026. Evidencia de P00 en `ESTADO_INICIAL_2026-10-22.md`; especificación y escenarios P01 en `diseno/mockups-v1/README.md`. P02 y las siguientes fases permanecen pendientes.

## 1. Objetivo y fuentes

Reproducir las pantallas y estados del paquete `01_PNG.zip` en la aplicación existente, incluyendo sus detalles pequeños, y hacer que las acciones funcionen con persistencia, integridad y trazabilidad reales. La referencia visual principal de este trabajo es el ZIP más reciente; el PDF aporta los requisitos y el contexto del procedimiento. Ante una contradicción que afecte el producto o la veracidad de la información, registrar la diferencia y resolverla expresamente, sin elegir silenciosamente una versión.

Fuentes locales examinadas:

- `/Users/leonel/Downloads/01_PNG.zip`: 61 PNG, distribuidos en 11 E, 6 M, 43 N y 1 UI Kit. No hay documentos explicativos, archivos de diseño editables, fuentes ni imágenes de producción separadas dentro del ZIP.
- `/Users/leonel/Downloads/main.pdf`: secciones 4.2–4.4, Anexo I, componente generativo y arquitectura relevados en la conversación.
- Repositorio `/Users/leonel/Desktop/UADE/tesis/Esbozo`: interfaz, servidor, esquema, seeds y lanzadores.

La numeración del paquete salta M06, N05 y N06. No hay que inventar esas pantallas ni considerarlas examinadas. Si llegan en otro paquete, incorporarlas a la matriz.

La fidelidad comprende geometría, tipografía, colores, imágenes, textos, iconos, estados, navegación, diálogos y comportamiento. Una pantalla terminada visualmente con botones sin acción no cuenta como implementada. Tampoco cuenta como terminada una pantalla funcional cuyo aspecto difiere de la referencia.

## 2. Estado observado y diferencias comprobadas

| Área | Implementación observada | Trabajo necesario |
| --- | --- | --- |
| Plataforma | Electron + React + TypeScript, Express y PostgreSQL; imágenes en `bytea` | Conservar el stack y la separación entre procesos |
| Git | Rama `dev`, limpia al iniciar este relevamiento | Preservar cualquier cambio que aparezca antes de implementar |
| Acceso | Diseño de dos paneles; JWT en memoria; un rol institucional | Sustituir composición por acceso centrado; añadir estados exactos, permisos y avisos globales |
| Navegación | Rutas en `App.tsx`; cabecera repetida por pantalla; Lotes deshabilitado | Activar historial, etapas, registro y navegación de administrador |
| Inicio y boceto | Tarjetas con acentos distintos por boceto; ficha con serie y sello combinados | Rehacer distribución, contenido y estados según E02/E04/N38/N39 |
| Obtención | Cinco verificaciones, incluido mapa; revelado con intervalo de 550 ms y pausa en mapa | Cuatro operaciones locales reales; sin pausa de mapa ni avance artificial |
| Disponibilidad | Selecciona siempre el primer lote por secuencia y permite reobtenerlo | Distinguir obtener, reabrir y agotar disponibles; conservar todos los lotes |
| Alternativas | Cuatro tarjetas, colores de botón por posición y fecha en cada tarjeta | Botones ocre uniformes, cabeceras con etiqueta de rama, contadores de conformidad y errores explícitos |
| Detalle | Zoom/paneo, miniaturas, candidata directa sin diálogo | Nueva composición y selector textual; estados de revisión; confirmaciones y bloqueo por conformidades |
| Comparación | Lado a lado y superposición implementados; controles duplicados y opción de desincronización | Reutilizar lógica útil, adaptar toolbar, rótulos, encuadre sincronizado y selector; falta de recurso |
| Etapas | No hay dominio ni pantalla de conformidades | Incorporar etapas, operaciones de procedencia y revisión secuencial |
| Trazabilidad | Cadena con mapa y configuración; textos fijos como «Sin edición posterior» | Cadena de guías/etapas, cinco secciones y valores derivados de los registros |
| Cuentas | Solo seed técnico; enum con un rol | Administración con dos roles, credenciales nuevas y eliminación disociada |
| Auditoría | Se escriben accesos, obtención y candidata; endpoint por lote | Consulta global filtrable, detalle lateral y operaciones de administración/conformidad |
| Integridad | Se calcula SHA-256 en seeds y se usa como ETag; no se recalcula al servir bytes | Verificación real de recursos y transacciones para cambios ligados a auditoría |
| Importación | Seeds específicos con valores del procedimiento anterior escritos en código | Importación de manifiestos finales FLUX, etapas, guías, referencias y operaciones |
| Datos locales | Dos bocetos, tres imágenes de mapa/diff y cuatro proyecciones antiguas del 1582 en `data/` | Obtener y verificar los archivos finales; no confundirlos con los actuales por compartir semillas |
| Calidad | Compilaciones y lint aprobados en el relevamiento previo; no se encontraron pruebas automatizadas | Pruebas de reglas críticas, integración y comparación de los 61 escenarios |

En el relevamiento inicial no se había podido inspeccionar la base por una conexión bloqueada. Esa comprobación se completó en P00: dos bocetos, un lote histórico del 1582 con cuatro proyecciones, nueve assets íntegros y 188 operaciones; respaldo restaurado y comprobado en una base separada. El detalle consta en `ESTADO_INICIAL_2026-10-22.md`.

## 3. Qué significa «idéntico» y cómo comprobarlo

### Referencias y resoluciones

- E01: 1648 × 1030.
- Pantallas habituales: 1414 × 1027.
- E10: captura de página completa de 1414 × 2305; no es una ventana de escritorio de esa altura.
- N44 y N45: 1366 × 768, con distribución específica para esa altura.
- N34: componente de cabecera, 1414 × 94; verificarlo como componente.
- UI Kit: lámina de referencia de 1905 × 2220; verificar sus componentes, no crear una sección nueva de producto para mostrarla.

Usar tamaños del área de contenido, no dimensiones exteriores de la ventana de Electron. Fijar escala de renderizado y versión de Chromium para las comparaciones. Probar también el tamaño inicial actual, 1200 × 800, y evaluar su ajuste al mínimo documentado sin impedir el uso en equipos reales.

### Método de aceptación visual

1. Registrar por PNG la ruta, resolución, datos del escenario, selección activa, posición de scroll y componentes presentes.
2. Medir posiciones, anchos, alturas, márgenes, gaps, tipografías, interlineado, radios, bordes, sombras, fondos, iconos y saltos de línea. La medición se hará sobre el PNG original, sin usar la miniatura de revisión como patrón.
3. Preparar escenarios reproducibles con reloj, nombres y estados de prueba fijos. Sus datos ficticios viven en la infraestructura de pruebas, separados de las cuentas y decisiones reales.
4. Capturar la aplicación en la resolución exacta del patrón, esperando fuentes e imágenes decodificadas.
5. Comparar mediante superposición y mapa de diferencias; corregir cada discrepancia de geometría, contenido y estilo. No dar por cerrada una pantalla por parecido general ni aceptar un porcentaje global que oculte un botón o rótulo incorrecto.
6. Documentar cualquier diferencia residual de rasterizado de letras entre plataformas. No declarar igualdad absoluta entre sistemas operativos sin comprobarla.
7. Repetir tras cambios en componentes compartidos: una corrección del header o una fuente puede modificar las 61 referencias.

Con los mismos recursos y entorno, el objetivo es igualdad visual de cada referencia. Con datos reales, los nombres, fechas, identificadores, hashes, contadores y versiones deben corresponder a la base: la fidelidad visual no autoriza inventar esos valores.

## 4. Decisiones y recursos que deben quedar resueltos

Estas diferencias no impiden comenzar la base visual ni preparar las migraciones, pero sí impiden declarar completa la reproducción de los escenarios reales.

| Tema | Evidencia | Propuesta concreta |
| --- | --- | --- |
| Fuentes | El UI Kit declara Liberation Serif, Inter y DejaVu Sans Mono, y advierte que no certifica las familias del Figma original. El repo tiene Source Serif 4, Source Sans 3 e Inter | Para estos PNG, usar las tres familias declaradas, en archivos locales y pesos adecuados. Verificar archivos/licencias y métricas; no sustituir Liberation Serif por Source Serif suponiendo equivalencia |
| Material final | Los PNG contienen las imágenes incrustadas, no los originales separados. E10 menciona una proyección extraída del PDF | Solicitar al preparar la importación las cuatro salidas finales y sus registros. No recortar capturas y convertirlas silenciosamente en originales de producción |
| Etapas y guías | E10/N09 señalan que faltan archivos adoptados de etapas, guías sectoriales y fragmentos de referencia | Preparar interfaz y esquema; representar ausencia hasta recibir archivos reales. La guía común no reemplaza una guía sectorial ni la proyección final una imagen intermedia |
| Conformidades de ejemplo | E06/E07/N08 muestran revisiones con cuenta y fecha ficticias pese a recursos pendientes | Usar esos estados en pruebas visuales; en la base real, registrar conformidad solo sobre etapas disponibles e íntegras. No crear revisiones previas copiando la maqueta |
| Boceto 1663 | N39/N40 muestran «1 lote asignado», ID no documentado y botón habilitado, pero advierten que faltan las cuatro proyecciones y su ficha | Modelar una asignación pendiente separada del lote importado. El intento de obtener informa la falta y conserva el estado; no fabrica un lote ni cuatro imágenes. Cuando lleguen los archivos, completar la asociación |
| Pies de maqueta | Los PNG incluyen «Maqueta de interfaz · Datos de demostración · Identificadores provisionales» y códigos E/N/M | Incluirlos en el inventario de fidelidad y las capturas de referencia. Resolver expresamente si son parte de la app de entrega o marcas del artefacto de diseño; no omitirlos por cuenta propia ni presentar datos reales como ficticios |
| Credenciales y cuentas ficticias | M04/N16/N19 y el registro tienen avisos de demostración y una credencial «Ejemplo-0000-XXXX» | Reproducirlos en escenarios de prueba. En operación real generar credenciales aleatorias y datos reales; mantener estructura visual y no mostrar una clave fija |
| Acerca de | N43 presenta versiones «No documentado»; el sistema puede disponer de ellas | Consultar metadatos reales. Reservar «No documentado» para información realmente ausente |
| Etapas normales | Hay UI Kit y variantes N07–N10, pero no PNG completo independiente de cada etapa normal con todos sus recursos | Derivar la pantalla normal de esos componentes y del PDF. Identificar qué parte es diseño explícito y qué parte es composición inferida, para revisión antes del cierre visual |
| Funciones nuevas | PDF y PNG incorporan roles, administración y conformidades que el código no tiene | Tratarlas como ampliación concreta del producto y exponer su impacto a Master mediante el usuario; no simularlas como cambios cosméticos |

No hay en este ZIP un documento adicional con el «por qué» de cada cambio. El plan usa las pantallas, el UI Kit y los requisitos disponibles; se podrá ajustar si llega ese material.

## 5. Orden de ejecución y entregables

### P00. Preparar y proteger el estado existente

- [x] Volver a leer el estado de Git y las instrucciones locales antes de tocar código.
- [x] Completar la consulta de solo lectura a PostgreSQL: versión, esquema efectivo, usuarios/roles, bocetos, lotes, proyecciones, imágenes, candidata, obtenciones, auditoría y hashes.
- [x] Probar el arranque y registrar la situación inicial. No ejecutar seeds ni `schema.sql`: ese archivo elimina el esquema.
- [x] Antes de migrar, realizar y comprobar un respaldo con imágenes y decisiones existentes, en una ruta local fuera de Git.
- [x] Establecer un entorno/base separado para las pruebas; ningún caso de recurso roto debe borrar o corromper datos reales.
- [x] Mantener ZIP, PDF, imágenes patrimoniales, referencias visuales y capturas de prueba fuera de Git; el código y el plan sí pueden versionarse.

Entregable: inventario real y procedimiento de restauración. Dependencia para migraciones sobre la base de trabajo.

### P01. Cerrar especificación visual y preparar escenarios

- [x] Usar la matriz completa del apartado 8 como checklist obligatorio.
- [x] Transcribir todos los textos de los originales, incluidos mensajes de campo, leyendas, explicaciones de acciones deshabilitadas, títulos, tooltips si se especifican, tablas y pies.
- [x] Medir una ficha por componente y pantalla: coordenadas y tamaños del header, breadcrumb, contenido, tarjetas, imágenes, diálogos, drawer y pie.
- [x] Registrar correspondencia entre A01/2718, A02/1890, A03/1977 y A04/314 del lote de referencia. La etiqueta de rama no es un ranking ni una semilla única de todo el procedimiento.
- [x] Inventariar recursos disponibles y pendientes con su procedencia, dimensiones y SHA-256.
- [x] Preparar datos de prueba de todos los estados, incluidos errores, cuentas, registros, etapa no aplicable, conformidades parciales y ausencia de recursos.
- [x] Mantener escenarios independientes: E02 puede mostrar disponible y E07 candidata sin que eso implique que deben coexistir en una misma fotografía temporal de la base.
- [x] Definir los comportamientos no dibujados usando el PDF y componentes existentes: carga, foco, teclado, respuesta tras cancelar y fallo de una mutación. No introducir nuevas pantallas por iniciativa propia.

Entregable: referencias y escenarios reproducibles; se puede avanzar sin disponer todavía de todos los archivos finales.

### P02. Implementar el sistema visual compartido

Archivos principales: `desktop/src/index.css`, `desktop/src/assets/fonts/fonts.css`, `desktop/src/components/AppHeader.tsx`, `desktop/src/components/AppHeader.css` y componentes compartidos nuevos.

- [x] Crear variables de color siguiendo el UI Kit: ocre `#EEB838`, terracota `#B15C52`, celeste `#75ADBF`, salvia `#91B29E`, marrón `#653E3D`, papel `#EEE1C3`, papel claro `#FBF7EE`, visor `#2F343A`. Medir también tonos derivados, bordes, texto, fondos de aviso y opacidades.
- [x] Incorporar fuentes locales y fijar tamaños, pesos, interlineado, espaciado entre letras y métricas monoespaciadas para identificadores.
- [x] Ajustar logo sin deformación ni espacios transparentes que alteren la posición; revisar el asset existente antes de sustituirlo.
- [x] Rehacer la franja superior de cuatro segmentos, header, navegación activa, avatar, nombre del rol y segunda línea de la cuenta.
- [x] Definir dos cabeceras: institucional con Inicio/Boceto/Alternativas/Lotes; administrador con Cuentas/Registro de operaciones. No mostrar navegación de material al administrador.
- [x] Replicar el breadcrumb y la indicación de navegación no habilitada de E02; usar botones/enlaces accesibles y estado real del contexto.
- [x] Crear botones primario, secundario, destructivo, deshabilitado y con foco; respetar icono, texto, tamaño, alineación y espaciado.
- [x] Crear badges con texto e icono: candidata, conforme, por revisar, pendiente, no aplica, no documentado, activa, desactivada, coincide/no coincide, disponible/asignado/obtenido/abierto.
- [x] Crear avisos informativo, neutro, advertencia, error y éxito con la misma composición que los PNG.
- [x] Crear contenedores de visor oscuro, rótulo permanente de IA, créditos del boceto, controles de zoom y selector textual de alternativas.
- [x] Crear campos, selectores, tabla, paginación, separadores y estados vacíos.
- [x] Crear diálogo con overlay y desenfoque medidos, botón X, icono de cabecera, ancho por variante, área de texto y footer de acciones. Controlar foco, Escape, retorno al disparador y bloqueo de interacción del fondo.
- [x] Crear drawer de detalle del registro, con su overlay y cierre, sin reemplazarlo por un modal centrado.
- [x] Resolver footer y altura mínima de página: al fondo en vistas cortas, después del contenido en E10; nunca cubrir controles con un pie fijo.
- [ ] Sustituir el escalado global en `vw` por tamaños y distribución controlados que reproduzcan ambos tamaños de referencia. No reducir toda la app como una imagen para que entre.

Entregable: componentes comparados con las diez secciones del UI Kit y cabecera N34. Se conserva la estructura React existente; no requiere una nueva biblioteca de componentes ni reescribir la app completa.

Estado de implementación: base compartida implementada; el login fue restaurado a su versión anterior por indicación del usuario y queda excluido del rediseño; ver `docs/diseno/P02_VERIFICACION.md`. El reemplazo de las medidas `vw` de las pantallas históricas sigue pendiente y se completará al adaptar cada pantalla. La galería permite revisar componentes; no certifica igualdad píxel a píxel con el UI Kit completo.

### P03. Adaptar el dominio, las migraciones, la importación y los contratos

Archivos existentes a intervenir: `backend/db/schema.sql` para instalaciones nuevas, `backend/src/seed-*.ts`, `backend/src/routes/sketches.ts`, `backend/src/routes/lotes.ts`, `backend/src/routes/assets.ts`, `backend/src/server.ts`, y `desktop/src/types.ts`. Agregar migraciones y servicios puntuales; no ejecutar el esquema destructivo para actualizar.

Datos y procedencia:

- [x] Versionar el esquema y registrar migraciones aplicadas; mantener registros históricos SD/ControlNet con su identificación original.
- [ ] Permitir un lote FLUX sin mapa de ControlNet; no renombrar automáticamente los mapas viejos como guías interpretativas.
- [ ] Incorporar etiqueta de rama separada de las semillas por operación; conservar posición y restricciones de pertenencia a boceto/lote.
- [x] Representar las tres etapas de revisión: escena base, figuras y acabado pictórico; orden, aplicabilidad, imagen adoptada, descripción y procedencia.
- [ ] Representar las operaciones técnicas que integran cada etapa: entrada, salida, preparación, máscara, alfa, modalidad, intensidad, semilla, prompt y parámetros documentados. La etapa Figuras agrupa varias operaciones; no perder ese detalle.
- [ ] Representar guías versionadas y su linaje, obras de referencia y sus fragmentos; relaciones por etapa/operación sin duplicar los bytes innecesariamente.
- [ ] Asociar corpus/adaptador/modelo y sus versiones o resúmenes, usando campos compatibles con FLUX. No imponer época, negative prompt o peso de ControlNet cuando no correspondan.
- [ ] Identificar la adaptación vigente P4/+180 mediante su archivo y registro real; no confundirla con `quinquela_lora_v1` de los seeds anteriores ni renombrar ese registro histórico para reutilizarlo.
- [ ] Separar valor registrado, no aplicable y no documentado de forma coherente en datos y API. Un fallo de lectura no equivale a «No aplica».
- [x] Crear la conformidad activa por etapa, con cuenta y fecha, y el historial de altas/retiros. Aplicar pertenencia y orden en el servidor, no solo en botones.
- [ ] Representar la asignación pendiente del 1663 sin inventar un `lote` completo ni un ID documental inexistente.
- [ ] Separar obtención persistida de lote activo en navegación; reabrir no modifica la fecha original ni genera otra obtención.

Importación y lectura:

- [ ] Definir un manifiesto local versionado para lotes, proyecciones, etapas, operaciones, guías y referencias, con rutas relativas y hashes esperados cuando existan.
- [ ] Validar exactamente cuatro proyecciones, posiciones, pertenencias, imágenes decodificables, MIME, dimensiones y correspondencia de hashes antes de incorporar el conjunto.
- [ ] Guardar todo un lote en una transacción; un error no deja medio lote importado. Diferenciar prevalidación, importación nueva y reimportación de un contenido idéntico.
- [ ] Rechazar conflictos que sobrescriban silenciosamente imágenes finales, historia, conformidades o candidata. Registrar origen del paquete y resultado de la importación.
- [ ] Registrar hashes calculados sin presentarlos como hashes previamente certificados por un manifiesto que no llegó. Indicar la procedencia de cada verificación.
- [ ] Recalcular y comparar integridad al recuperar recursos según el contrato del producto; no confundir ETag con comprobación del contenido.
- [ ] Revisar `Cache-Control: private, max-age=31536000, immutable` y las Blob URLs para que una caché no oculte fallos de integridad o permita reutilizar una imagen de otra sesión/alternativa. Alinear la política con los puntos de verificación definidos y con el presupuesto de memoria.
- [ ] Ante ausencia/corrupción, devolver error tipificado con identificador del recurso; no buscar una imagen parecida ni la de otra alternativa.
- [ ] Definir respuestas tipadas para datos, fallos de recurso, conflicto de estado, ausencia de lote, autenticación y permisos.
- [ ] Agregar manejo central de errores asíncronos y registro técnico local sin contraseñas, tokens ni bytes. El fallo de la base no debe terminar como una carga infinita.
- [ ] Mover escrituras ligadas y su auditoría a transacciones: obtención, candidatura, conformidad, creación, estado, restablecimiento y eliminación de cuentas.

Contratos a agregar o ampliar, conservando rutas actuales cuando sea práctico:

| Dominio | Capacidades de API necesarias |
| --- | --- |
| Bocetos | Ficha, sello separado, créditos, resumen real de lotes disponibles/obtenidos/asignados |
| Lotes | Listado paginado por boceto, siguiente obtenible, obtener, reabrir y estado verificado |
| Proyecciones | Etiqueta de rama, recurso final, conformidades aplicables/registradas y candidata vigente |
| Etapas | Listado/detalle, recursos, guías, referencias y operaciones; registrar/retirar conformidad |
| Trazabilidad | Ficha documental/técnica agregada, con ausencia explícita y enlace al registro |
| Sesión/cuentas | Cuenta actual validada, roles, administración, restablecimiento y eliminación disociada |
| Operaciones | Listado paginado/filtrado y detalle, con respuestas adecuadas a cada rol |
| Sistema | Versiones reales de aplicación, esquema y ficha para Acerca de |

Entregable: dominio que soporta los diseños y preserva datos viejos; importador verificable. No se agrega inferencia, entrenamiento ni un motor genérico de generación dentro de la app.

### P04. Acceso, sesión y navegación por rol

Referencias: E01, N30–N37, M07, N35, E03 y N43.

- [ ] Reemplazar el acceso dividido por fondo papel, logo superior centrado, tarjeta de formulario, separador y pie institucional de E01. El isotipo grande y la fachada de barras dejan de integrar esta pantalla.
- [ ] Respetar «Acceso», «Nombre de usuario», textos de ayuda, iconos de campo, botón y espaciados del PNG.
- [ ] Reemplazar validación nativa no controlada por errores debajo de cada campo: N30. No enviar formulario incompleto.
- [ ] Mostrar credenciales inválidas con aviso rojo: N31; cuenta desactivada con aviso amarillo: N32; envío con botón deshabilitado, icono y texto «Iniciando sesión…»: N33. Permitir ocultar/mostrar contraseña.
- [ ] Ingresar en Inicio para institucional y en Cuentas para administrador. Mantener sesión en memoria.
- [ ] Consultar estado y rol actuales de la cuenta en peticiones protegidas; hoy solo se verifica la firma del JWT. Hacer efectivos desactivación, eliminación y cambios de credencial sobre sesiones existentes.
- [ ] Diferenciar sesión vencida y cuenta desactivada durante la sesión para N36/N37; bloquear acciones, conservar datos persistidos y volver al acceso. Cerrar el aviso mediante X no debe reactivar una sesión inválida.
- [ ] Centralizar cliente HTTP y manejo de sesión para evitar que una pantalla trate un 401 como una lista vacía o una imagen faltante.
- [ ] Implementar menú institucional N35: registro, guía, Acerca de y cerrar sesión; menú administrador M07: Acerca de y cerrar sesión, con identidad de cuenta correspondiente.
- [ ] Implementar guía E03 de cinco pasos, X y «Empezar», accesible desde el menú. No asumir apertura automática en cada sesión sin una especificación que lo indique.
- [ ] Implementar Acerca de N43 con metadatos reales, propósito y créditos; no inventar números de versión.
- [ ] Conservar contexto de boceto/lote/alternativa al consultar guía, Acerca de y registro; cambiar de boceto no arrastra el lote del anterior.
- [ ] Aplicar permisos en backend: ocultar botones por rol no es suficiente.

Entregable: acceso y navegación completos para ambos actores, incluidos los avisos durante una sesión.

### P05. Inicio y ficha del boceto

Referencias: E02, E04, N38, N39.

- [x] Cambiar título a «Bocetos disponibles», descripción y composición de E02; retirar la caja de «Sesión identificada» que no está en el nuevo diseño.
- [x] Dar a ambas tarjetas el mismo tratamiento: etiqueta «Boceto 1582/1663», badge de lote, visor oscuro, título, serie/sello, autor, colección, técnica, dimensiones, fecha y botón ocre «Ver detalle».
- [x] Conservar imagen completa y proporción original. Revisar el `object-fit: cover` y relaciones fijas actuales para que no recorten el documento.
- [ ] Mostrar disponibilidad calculada, no los literales «1 lote» cuando haya otra cantidad. La variante asignada del 1663 necesita los datos del dominio propuesto.
- [x] Rehacer la ficha con columna de imagen amplia y panel derecho: crédito bajo la imagen, controles inferiores con porcentaje y botón Restablecer.
- [x] Separar sello y serie y respetar el orden Inventario, Autor, Título, Serie, Sello, Fecha, Técnica, Dimensiones, Colección. Preservar metadatos históricos si cambia su presentación.
- [ ] Estado E04: lote disponible, ID, explicación, obtener y ver lotes.
- [x] Estado N38: lote obtenido, responsable y fecha reales, ver alternativas y ver lotes; no ofrecer reobtener el mismo lote como nuevo.
- [ ] Estado N39: asignación pendiente del 1663, ID documental no disponible y respuesta honesta a su acción; no presentar imágenes inventadas.
- [ ] Mantener carga, error y reintento diferenciados. Una imagen fallida no queda eternamente en «Cargando…».

Entregable: las dos fichas y todos sus estados de lote, con metadatos correctos.

Revisión por componentes: Home implementado y verificado contra E02; pendiente revisión del usuario. Ver `docs/diseno/HOME_VERIFICACION.md`. Las tareas de ficha y asignación de lotes siguen pendientes.

Ficha de Boceto implementada y comprobada para los estados reales actuales: 1582 obtenido y 1663 sin lote. Ver `docs/diseno/BOCETO_VERIFICACION.md`. Pendiente revisión del usuario y preparación de asignación/múltiples lotes en el bloque correspondiente.

### P06. Obtención real e historial de lotes

Referencias: E05, E11, N01–N04, N40, N41.

- [x] Reemplazar los cinco pasos actuales por: localizar lote; recuperar imágenes y metadatos; verificar SHA-256 y asociaciones; preparar grilla.
- [x] Retirar del recorrido nuevo la pausa y aceptación del mapa. Conservar el material histórico accesible donde corresponda, sin exigirlo para FLUX.
- [x] Retirar el intervalo que revela resultados como si se estuvieran procesando. Mostrar carga mientras existe trabajo real; cada estado completado/fallido/pendiente deriva de lo efectivamente ejecutado. Si toda la respuesta llega resuelta, presentarla resuelta.
- [x] E05: título, checklist, badges, panel oscuro sin miniatura de boceto, icono de éxito, ID, «4» alternativas y «4 / 4», explicación, «Ver cuatro proyecciones» y «Ver los registros» con acción real.
- [x] N01: incompleto, recurso ausente concreto, detención en recuperación, pasos posteriores pendientes y grilla bloqueada.
- [x] N02: integridad fallida, archivo identificado, detención en verificación y sin presentar el conjunto.
- [ ] N03: fallo operativo, estado anterior conservado y sesión activa, reintento sin reiniciar aplicación.
- [ ] N04: no hay más lotes; explicación, lote conservado y acceso al historial. No confundir fallo de consulta con disponibilidad agotada.
- [ ] Implementar historial E11 con columnas Lote/Obtención/Candidata/Estado/Acción, resumen de cuatro alternativas y conformidades, total y paginación.
- [x] Abrir/reabrir explícitamente por ID del lote. Reabrir conserva imágenes, trazabilidad, revisiones y candidata, sin cambiar su fecha de obtención.
- [ ] Reproducir N40 para la asignación pendiente, con aviso de recursos pendientes y sin falsa obtención.
- [x] N41: si reabrir falla, mantener activo el lote anterior, aviso inline y botón de reintento en la fila.
- [x] Soportar más de un lote, aunque las maquetas muestren uno. Obtener el siguiente disponible una sola vez, incluyendo solicitudes simultáneas o repetidas.
- [x] Activar «Lotes» en cabecera y todos los accesos «Ver lotes».

Entregable: consulta de conjuntos sucesivos sin sobrescritura, con errores recuperables.

Estado del bloque: obtención/verificación real, historial y navegación implementados; pendientes la revisión visual del usuario y las variantes específicas N04/N40. Los contadores de conformidad esperan el dominio de etapas. Ver `docs/diseno/LOTES_ALTERNATIVAS_VERIFICACION.md`.

### P07. Grilla y detalle de alternativas

Referencias: E06, E07, M01–M03, N11–N15, N44.

- [ ] Rehacer la grilla 2 × 2: título de tarjeta «Alternativa n · etiqueta», visor oscuro con imagen completa, rótulo de IA, badge de candidata, borde correspondiente, contador de conformidad y botón ocre uniforme.
- [x] Cambiar el acceso superior «Obtener otro lote» por «Ver lotes» según E06; la obtención de otros conjuntos sigue accesible desde su contexto de lotes/boceto.
- [ ] Mostrar 2 de 2 para el piloto con acabado no aplicable y 3 de 3 para las ramas con acabado; calcular numerador y denominador.
- [x] N15: conservar la tercera tarjeta, etiqueta y acciones ante imagen ausente; panel oscuro con icono y mensaje, sin sustituirla ni alterar el orden.
- [x] Detalle: ampliar visor y ajustar columna derecha; cabecera de alternativa dentro del visor, rótulo debajo de la imagen, toolbar inferior y selector textual de cuatro alternativas. Retirar miniaturas/flechas que ya no forman parte de esa composición.
- [x] Columna derecha: volver a alternativas, encabezado de revisión individual, título con rama, lote, badge de conformidad, comparar, revisar etapas, trazabilidad, bloque de candidatura y nota sobre su carácter no aprobatorio.
- [x] E07: candidata activa, responsable/fecha y retirar; M01: faltan conformidades, enumerar las etapas pendientes y deshabilitar marcado con explicación; M02: otra candidata existe y puede reemplazarse; M03: revisión completa y lote sin candidata.
- [x] N11: diálogo de marcado con identificación de alternativa/lote y cantidad de etapas aplicables conformes.
- [x] N12: diálogo de reemplazo con candidata actual/nueva, conformidad, explicación de candidata única y conservación de imágenes/revisiones.
- [x] N13: diálogo de retiro que conserva las conformidades y deja lote sin candidata.
- [x] Cancelar/X no cambian datos. Deshabilitar doble envío mientras se guarda; errores mantienen el estado anterior y permiten reintento.
- [x] Revalidar en el servidor pertenencia, recursos y conformidades al confirmar. Aplicar candidata y auditoría en una transacción; resolver cambios concurrentes sin sobreescritura silenciosa.
- [ ] Propagar cambios confirmados a grilla, detalle, etapas, historial, trazabilidad y registro sin exigir reiniciar la sesión.
- [x] N44: distribución específica a 1366 × 768, imagen centrada más pequeña, controles y selector visibles, columna de acciones completa y sin recortes ni scroll horizontal.

Entregable: todos los estados de candidata y navegación de alternativas con un aspecto uniforme.

Estado del bloque de detalle y etapas: implementación integrada y reglas probadas en esquemas descartables; la producción final todavía no está importada. Ver `diseno/DETALLE_ETAPAS_VERIFICACION.md`. Las referencias visuales usan datos de ejemplo y no se trasladan como decisiones reales de revisión.

### P08. Comparación fiel al diseño

Referencias: E08, E09, N42, N45.

- [ ] Reutilizar la lógica útil de zoom/paneo/slider, pero sustituir la composición de la pantalla por las referencias nuevas.
- [ ] Título según modo, descripción, botón volver, toolbar clara única con Lado a lado/Superposición, menos/porcentaje/más, Restablecer encuadre y badge de sincronización.
- [ ] Lado a lado: paneles oscuros equivalentes, títulos dentro, crédito de museo bajo el boceto y rótulo permanente de IA bajo la proyección.
- [ ] Retirar controles duplicados, iconos de expandir sin implementación y navegación anterior/siguiente de la presentación cuando no figuran en el nuevo diseño; usar selector textual inferior.
- [ ] Superposición: un visor, títulos en extremos, división inicial central, línea y tirador, mismo encuadre y rótulo permanente fuera de la región recortada por el slider.
- [ ] Mantener zoom y paneo sincronizados; normalizar coordenadas respecto de la imagen contenida, no solo copiar desplazamientos entre cajas de distinto tamaño.
- [ ] Conservar alternativa y encuadre al cambiar modo. Restablecer vuelve al estado inicial medido y vuelve a centrar el slider cuando corresponda.
- [ ] No estirar boceto o proyección para forzar alineación. Preservar proporciones y usar los recursos de comparación documentados, sin eliminar márgenes del original silenciosamente.
- [ ] N42: boceto válido permanece visible, proyección ausente tiene mensaje y reintento, badge «Imagen no disponible», rótulo y selector conservados. No superponer una imagen anterior que quedó en memoria.
- [ ] Operar slider mediante teclado además de arrastre; proporcionar nombres accesibles de controles e imágenes.
- [ ] N45: toolbar y dos paneles completos en 1366 × 768, selector inferior visible; revisar altura, no solo ancho.

Entregable: ambos modos comparados visualmente y sin pérdida de contexto.

### P09. Revisión secuencial por etapas

Referencias: N07–N10 y sección 05 del UI Kit; comportamiento del PDF CU-11.

- [x] Crear pantalla con título/ramas/lote, volver al detalle, tres selectores de etapa y estados con icono y texto.
- [ ] Etapa normal: visor con imagen adoptada, rótulo de IA, zoom/restablecer; panel derecho con descripción, guías, obras/fragmentos de referencia, conformidad y autor/fecha.
- [x] Escena base habilita Figuras tras conformidad; Figuras habilita Acabado si aplica. Habilitación comprobada por servidor y persistida, no solo por navegación visitada.
- [x] N07: Acabado «No aplica» seleccionado del piloto; panel oscuro explicativo sin imagen final usada como sustituto; no cuenta en el denominador ni requiere conformidad.
- [x] N08: revisión completa del piloto, resumen de las tres etapas, imagen final correctamente titulada como final, responsable/fecha y acción de candidatura según estado actual.
- [x] N09: imagen de etapa ausente o corrupta, mantener identidad, explicar ausencia, bloquear conformidad de esa etapa y siguientes y no usar otra imagen.
- [x] Recursos pendientes como guías o referencias se identifican por su condición real; no afirmar que el paquete los contiene.
- [x] Registrar y retirar conformidad con cuenta y fecha; el retiro invalida la conformidad de esa etapa y las siguientes aplicables, preservando el historial.
- [x] N10: si la alternativa es candidata, explicar y confirmar el retiro conjunto; borrar conformidades afectadas y candidata en una única transacción. Cancelar conserva todo.
- [x] Para una alternativa que no es candidata, aplicar el mismo retiro secuencial sin afirmar que se retiró una candidatura inexistente.
- [x] Manejar reintentos y concurrencia con las acciones de candidata y administración; una petición directa no puede saltar etapas ni revisar una imagen inválida.
- [x] Sin animaciones de generación ni progreso ficticio: se consultan imágenes producidas antes.

Entregable: nueva función de supervisión humana que determina la disponibilidad de candidatura.

Estado de revisión: los registros históricos continúan sin etapas documentadas. Los contadores y la candidatura se calculan con información real cuando existe; no se dan por incorporadas las imágenes finales ni las operaciones/guías del procedimiento FLUX. N14 ya tiene aviso de ficha no disponible y recuperación independiente de la imagen; E10 sigue pendiente.

### P10. Trazabilidad de FLUX y estados de ausencia

Referencias: E10 y N14.

- [ ] Rehacer la página completa siguiendo orden y geometría de E10, incluido el scroll y el footer final.
- [ ] Resumen superior con cuatro columnas: alternativa, lote, selección y conformidad.
- [ ] Sección 1, Cadena de procedencia: Boceto → Guías interpretativas → Etapas → Lote → Proyección; flechas, tarjetas, descripciones y estados derivados del registro.
- [ ] Sección 2, Material de origen y proyección final: visores oscuros lado a lado, créditos correctos e identificación permanente de resultado IA.
- [ ] Sección 3, Guías y etapas: guía común, aclaración de autoría del equipo, estado de cada etapa y advertencia de recursos pendientes donde corresponda. Una guía no es obra del corpus.
- [ ] Sección 4, Detalle técnico de solo lectura: filas de modelo, adaptación, entorno, revisión exacta, archivo, dimensiones, etiqueta de rama, semillas por operación, acabado, corrida, fecha, SHA y versiones.
- [ ] Mostrar en el piloto que 2718 identifica la rama y que su escena base/grupo superior/otras operaciones pueden usar semillas distintas; no extrapolar esa combinación a las otras proyecciones.
- [ ] Sección 5, Revisión y registro: ausencia de valoración experta cuando no exista, candidata con cuenta/fecha y vínculo al registro filtrado.
- [ ] No copiar como información real «según la tesis», «extraído del PDF», conformidades de ejemplo ni «No documentado» si existen datos importados verificables. Conservar esas frases en el escenario visual que las requiere.
- [ ] Mantener datos de recursos históricos SD en fichas históricas, sin atribuirles modelo FLUX o conformidades del lote final.
- [ ] N14: falla de ficha con imagen válida, conservar imagen/etiqueta/lote, panel de aviso, reintento y volver al detalle; nunca mostrar la ficha de otra alternativa.
- [ ] Revisar requisito RF-11 de resumen y expansión técnica: E10 muestra el contenido desplegado. Permitir la consulta expandida con esa apariencia y conservar el resumen; no omitir el comportamiento por no estar dibujado cerrado.

Entregable: procedencia consultable y consistente con las mismas asociaciones usadas para servir las imágenes.

### P11. Administración de cuentas

Referencias: N16–N24, M04, M05, M07 y N34.

- [ ] Crear vista con encabezado de administrador, título, descripción, botón Nueva cuenta, aviso de demostración solo en su escenario, tabla y paginación.
- [ ] Columnas exactas: Nombre visible/Nombre de usuario/Rol/Estado/Último acceso/Acciones; badges y totales de activas/desactivadas.
- [ ] Menú por fila con usuario afectado y acciones según estado; no simular botones que no tienen endpoint.
- [ ] N17: Nueva cuenta, usuario/nombre visible/rol, nota de cuenta activa y credencial al finalizar, Cancelar/Crear cuenta.
- [ ] M05: errores obligatorios junto a ambos campos; N18: usuario duplicado con campo marcado y mensaje, conservando el resto de lo ingresado. Validar duplicación también en base, sin distinguir mayúsculas si se conserva CITEXT.
- [ ] N19: Cuenta creada con usuario/nombre/rol, credencial nueva, Copiar, advertencia de exhibición única y «Ya guardé la credencial».
- [ ] N20 + M04: confirmar restablecimiento y mostrar resultado con la misma composición de entrega de credencial; nunca recuperar la contraseña anterior.
- [ ] N21/N22: confirmar desactivar/reactivar, preservar operaciones y actualizar tabla/contadores; hacer efectiva la desactivación durante sesiones abiertas.
- [ ] N23: confirmar eliminación con escritura del usuario exacto; botón bloqueado hasta coincidencia, advertencia de irreversibilidad y conservación disociada de operaciones.
- [ ] Eliminar identificación y hash, conservar clave técnica y presentar «Cuenta eliminada» en candidatas/revisiones/operaciones. Revisar también payloads y textos históricos para no conservar nombres personales por otra vía.
- [ ] N24: impedir desactivar/eliminar la última cuenta administradora activa, con acciones deshabilitadas y explicación. Validar en transacción con protección ante operaciones simultáneas.
- [ ] No guardar ni auditar credenciales en texto; entregar la nueva una sola vez y retirarla del estado del cliente al cerrar. Gestionar Copiar con una capacidad acotada y comprobar éxito/fallo.
- [ ] Si una creación/restablecimiento se confirmó en servidor pero se perdió la respuesta, no duplicar cuentas ni prometer recuperar una clave ya descartada; ofrecer el restablecimiento explícito correspondiente.
- [ ] No permitir al institucional ejecutar endpoints administrativos. Revalidar permisos de las cuentas afectadas y las sesiones revocadas.

Entregable: administración operativa completa, con protección del último administrador y trazabilidad sin datos de cuentas eliminadas.

### P12. Registro de operaciones

Referencias: N25–N29; accesos desde E05, E10 y N35.

- [ ] Crear vista compartida de solo lectura, con cabecera según rol, título, descripción, badge y avisos del escenario.
- [ ] Filtros Boceto/Lote/Período, Aplicar filtros, dependencia del selector de lotes, opción Todos y Limpiar filtros.
- [ ] Tabla Fecha/Acción/Cuenta responsable/Recurso afectado/Detalle, orden descendente, formato local de fecha, contador y paginación.
- [ ] Distinguir filtros vacíos, error de consulta y carga; no convertir un fallo de API en «sin resultados».
- [ ] N26: drawer lateral con operación, fecha, cuenta, boceto, lote, alternativa e identificador; conservar filtros y posición de la lista al cerrar.
- [ ] N27: vacío con explicación y Limpiar filtros; N28: error con sesión activa y Reintentar sin modificar operaciones.
- [ ] N29: vista de administrador que incluye acciones de cuenta y accesos fallidos sin exponer la contraseña ni el identificador ingresado cuando no corresponde. N25: vista institucional conforme al alcance de consulta definido.
- [ ] Mantener en los dos roles consulta de decisiones sobre material. Definir expresamente la visibilidad de los detalles administrativos sensibles: el PNG institucional no basta para inferir todos los permisos de datos.
- [ ] Abrir desde trazabilidad con contexto de alternativa/lote; desde obtención con contexto del lote. No llevar siempre a una lista sin filtrar.
- [ ] Auditar además altas/retiros de conformidad, reemplazos y retiros de candidatas y administración, identificando acción real y cuenta responsable.
- [ ] Mantener «Cuenta eliminada» y datos no aplicables sin joins internos que borren las filas del historial.
- [ ] Asegurar que nombres o credenciales anteriores no aparezcan en el drawer, payloads, registro técnico ni exportaciones de pruebas.

Entregable: consulta trazable y recuperable para ambos actores.

### P13. Integración, fidelidad final y entrega

- [ ] Ejecutar los 61 controles de referencia de la matriz; revisar tanto cada imagen como transiciones entre estados.
- [ ] Revisar textos completos, puntuación, tildes, mayúsculas, punto medio, n.º, porcentajes, formato de fecha/hora y monoespaciado.
- [ ] Revisar colores exactos, grosor de líneas, bordes y radios, sombras, transparencias, blur, altura de toolbar, diálogos, iconos y alineación con texto.
- [ ] Verificar foco visible, orden de tabulación, etiquetas, teclado de menú/dialog/slider, anuncios de error y estados que no dependan solo del color.
- [ ] Confirmar imagen completa a encuadre inicial, ausencia de deformación, créditos y rótulo en todos los visores; mantenerlos al hacer zoom, pan o mover el slider.
- [ ] Validar 1366 × 768 y 1414 × 1027, acceso 1648 × 1030 y E10 de página completa. Revisar otros tamaños de ventana sin superposición ni scroll horizontal accidental.
- [ ] Probar el recorrido institucional completo y el administrativo con cuentas de prueba y sin Internet; fuentes, iconos e imágenes locales.
- [ ] Probar corrupción/ausencia exclusivamente en la base o recursos de prueba; fallos de base, API y escritura; recuperar sin cambios sobre información válida.
- [ ] Comprobar migración en una copia de la base, importación íntegra, fallo con rollback y conservación de las imágenes/decisiones históricas.
- [ ] Pruebas significativas de permisos, pertenencias, secuencia de etapas, retiro en cascada, candidata única, último administrador, eliminación disociada y concurrencia.
- [ ] Build de backend/frontend y lint; agregar y ejecutar pruebas de integración de los contratos anteriores y capturas de regresión.
- [ ] Medir RNF-11/RNF-12 en entorno documentado: lote ≤5 s, detalle/comparación/trazabilidad ≤2 s, memoria ≤2 GB. Diez repeticiones por medición, todas dentro del límite; no contar solo tiempo de respuesta HTTP si falta decodificar o presentar la imagen.
- [ ] Controlar ciclo de vida de imágenes/Blob URLs, cancelación de respuestas al cambiar de alternativa y consumo tras recorrer varios lotes. No precargar todos los originales de alta resolución sin límite.
- [ ] Registrar diferencias residuales y bloqueos de material; no marcar verde una referencia cuya imagen o fuente no es la correcta.
- [ ] Actualizar README/SETUP, esquema para instalaciones nuevas y guía de importación/migración, con comandos reales, requisitos y limitaciones.
- [ ] Probar en Electron la misma área de contenido usada en las capturas; impedir que DevTools reduzca inadvertidamente el espacio de revisión.
- [ ] Tratar el instalador y el arranque automático del backend como cierre técnico de distribución descrito por el PDF. No son una pantalla del ZIP: planificarlos expresamente, validar respaldo/configuración/puerto local y no mezclarlos con la aceptación visual.

Entregable: lista de referencias aprobadas, evidencia de comparación visual, pruebas ejecutadas, datos faltantes y procedimiento de arranque/actualización.

## 6. Archivos y organización propuesta

Se conservan las pantallas existentes que tienen una correspondencia directa y se agregan las faltantes. Nombres de archivos nuevos orientativos; no se justifica cambiar de framework ni introducir un router o gestor de estado pesado para este alcance.

| Ubicación | Intervención |
| --- | --- |
| `desktop/src/App.tsx` | Navegación por rol; contexto activo de boceto/lote/alternativa; rutas nuevas y avisos globales |
| `desktop/src/types.ts` | Contratos comunes, estados de recursos/revisión y tipos discriminados de disponibilidad/errores |
| `desktop/src/api/` | Cliente autenticado, errores tipificados, consulta de recursos y cancelación |
| `desktop/src/components/` | Header, layout, pie, diálogos, campos, badges, avisos, visor, toolbar, selector, tabla y paginación |
| `desktop/src/assets/fonts/` | Fuentes de los PNG empaquetadas localmente; conservar las anteriores si aún se necesitan |
| `desktop/src/screens/Login`, `Home`, `Boceto`, `LoteObtenido`, `Alternativas`, `Detalle`, `Comparacion`, `Trazabilidad` | Adaptar implementaciones y CSS según fases |
| `desktop/src/screens/Etapas/` | Pantalla nueva de revisión secuencial |
| `desktop/src/screens/Lotes/` | Historial por boceto y asignaciones pendientes |
| `desktop/src/screens/Cuentas/` | Tabla y flujos administrativos |
| `desktop/src/screens/Registro/` | Consulta filtrada y drawer |
| `desktop/src/screens/MapaControl/` | Retirar dependencia del flujo FLUX; decidir acceso histórico sin borrar recursos |
| `backend/db/migrations/` | Migraciones no destructivas con control de versión |
| `backend/src/auth.ts`, `backend/src/routes/auth.ts` | Estado actual de cuenta, roles y revocación efectiva |
| `backend/src/routes/` | Extender bocetos/lotes/assets y agregar cuentas/etapas/operaciones/sistema |
| `backend/src/services/` | Transacciones de dominio y verificaciones compartidas, sin duplicarlas en cada endpoint |
| `backend/src/import/` | Validación e incorporación de paquetes locales con manifiesto |
| `backend/src/server.ts` | Errores centralizados, rutas nuevas, configuración local y arranque verificable |
| `desktop/electron/`, `scripts/`, manifiestos | Ajustes de ventana, portapapeles si hace falta, distribución y arranque al cerrar la integración |
| `data/` y ubicación local de pruebas visuales | Recursos y patrones fuera de Git; no incluir imágenes del museo en `src/assets` |

## 7. Hitos verificables y criterio de cierre

| Hito | Incluye | Condición de cierre |
| --- | --- | --- |
| H0 | P00–P01 | Estado real protegido; inventario de 61 referencias y faltantes |
| H1 | P02 + interfaz de P04 | UI Kit, header por rol, acceso y diálogos base comparados |
| H2 | P03 + lógica de P04 | Migraciones probadas en copia, contratos e importador; roles y sesión efectivos |
| H3 | P05–P08 | Bocetos/lotes/grilla/detalle/comparación funcionales con sus errores y tamaños |
| H4 | P09–P10 | Etapas/candidatura/trazabilidad enlazadas con datos y reglas reales |
| H5 | P11–P12 | Cuentas y operaciones completas, sin accesos indebidos ni identificación residual |
| H6 | P13 | 61 referencias revisadas, pruebas y métricas, documentación y pendientes explícitos |

El orden interno permite construir el sistema visual y sus escenarios mientras llegan recursos finales. No permite declarar terminado un hito real de conformidades si faltan las imágenes sobre las que se debe registrar esa conformidad.

El alcance estimado es una adaptación amplia del producto existente: varias vistas se rediseñan y otras se agregan, pero se conservan Electron, React, Express, PostgreSQL, imágenes binarias, autenticación y lógica de comparación aprovechable. El costo principal está en el dominio de etapas, la administración, la importación y la comprobación visual, además del CSS. No corresponde prometer una duración exacta sin completar P00 y conocer los recursos de producción pendientes.

Cada referencia tiene dos comprobaciones separadas: visual y funcional. Para cerrar el conjunto, ambas deben estar aprobadas o debe constar un bloqueo concreto de material/decisión. No habrá pantallas descartadas por ser secundarias, mensajes omitidos por ser pequeños ni botones decorativos.

## 8. Matriz completa de referencias

Inventario extraído del ZIP. Las dimensiones corresponden a los PNG originales. Cada fila debe registrar, durante la ejecución, evidencia de captura, resultado visual, prueba funcional y pendientes.

| ID | Fase | PNG original | Tamaño | Cobertura obligatoria |
| --- | --- | --- | --- | --- |
| E01 | P04 | `E01_Acceso_v02.png` | 1648 × 1030 | Acceso centrado: logo, tarjeta, campos, botón, ayuda, separador y pie; sustituye el diseño dividido. |
| E02 | P05 | `E02_Inicio_v02.png` | 1414 × 1027 | Inicio: dos tarjetas equivalentes, imagen completa, ficha resumida, badges, navegación inhabilitada y botón Ver detalle. |
| E03 | P04 | `E03_Guia_Como_recorrer_Esbozo_dialogo_sobre_Inicio_v01.png` | 1414 × 1027 | Guía modal de cinco pasos sobre Inicio; overlay/blur, icono, X y Empezar; conservar contexto al cerrar. |
| E04 | P05 | `E04_Detalle_del_boceto_1582_lote_disponible_v02.png` | 1414 × 1027 | Ficha 1582 disponible: crédito, zoom inferior, identificación documental con sello separado, obtener y ver lotes. |
| E05 | P06 | `E05_Obtencion_del_lote_completada_v02.png` | 1414 × 1027 | Obtención completa: cuatro pasos reales, badges, panel oscuro, métricas 4 y 4/4, alternativas y registros. |
| E06 | P07 | `E06_Alternativas_del_lote_LOT_1582_L01_v02.png` | 1414 × 1027 | Grilla 2×2 con rama, conformidades, candidata, rótulo permanente, botones ocre iguales y Ver lotes. |
| E07 | P07 | `E07_Detalle_Alternativa_1_2718_es_la_candidata_v02.png` | 1414 × 1027 | Detalle 2718 candidata: visor, selector textual, tres accesos, 2/2 conformes, responsable/fecha y retirar. |
| E08 | P08 | `E08_Comparacion_Lado_a_lado_v02.png` | 1414 × 1027 | Comparación lado a lado: toolbar única, encuadre sincronizado, créditos/rótulo y selector textual. |
| E09 | P08 | `E09_Comparacion_Superposicion_v02.png` | 1414 × 1027 | Superposición: panel único, tirador central, rótulos permanentes, encuadre común y selector. |
| E10 | P10 | `E10_Trazabilidad_Alternativa_1_2718_v02.png` | 1414 × 2305 | Trazabilidad completa: resumen y cinco secciones; guías/etapas, datos técnicos, revisión y vínculo al registro. |
| E11 | P06 | `E11_Lotes_Boceto_1582_v01.png` | 1414 × 1027 | Historial 1582: columnas, candidata/conformidades, lote abierto, reabrir, paginación y conservación. |
| M01 | P07 | `M01_Detalle_Alternativa_2_1890_faltan_conformidades_v01.png` | 1414 × 1027 | Detalle 1890 con 1/3 conformidades: aviso, enumeración de etapas faltantes y marcado bloqueado. |
| M02 | P07 | `M02_Detalle_Alternativa_4_314_otra_alternativa_es_candidata_v01.png` | 1414 × 1027 | Detalle 314 conforme con otra candidata: aviso de candidata actual y acción Reemplazar candidata. |
| M03 | P07 | `M03_Detalle_Alternativa_4_314_lista_sin_candidata_v01.png` | 1414 × 1027 | Detalle 314 conforme sin candidata: aviso de revisión completa y acción Marcar como candidata. |
| M04 | P11 | `M04_Dialogo_Credencial_restablecida_v01.png` | 1414 × 1027 | Resultado de restablecimiento: identidad de cuenta, credencial nueva de una sola exhibición, Copiar y confirmación. |
| M05 | P11 | `M05_Dialogo_Nueva_cuenta_campos_obligatorios_vacios_v01.png` | 1414 × 1027 | Nueva cuenta vacía: mensajes por campo, bordes de error, rol y conservación del formulario. |
| M07 | P04 | `M07_Menu_de_cuenta_abierto_Administrador_v01.png` | 1414 × 1027 | Menú administrador: nombre visible, detalle de cuenta, Acerca de y Cerrar sesión; anclaje y cierre. |
| N01 | P06 | `N01_Obtencion_lote_incompleto_v01.png` | 1414 × 1027 | Lote incompleto: 3 de 4, falta A03, segundo paso fallido, siguientes pendientes, sin grilla y reintento. |
| N02 | P06 | `N02_Obtencion_integridad_fallida_v01.png` | 1414 × 1027 | SHA-256 no coincide: tercer paso fallido con recurso identificado, cuarto pendiente, sin alternativas y reintento. |
| N03 | P06 | `N03_Obtencion_falla_de_la_operacion_v01.png` | 1414 × 1027 | Error operativo: recuperación fallida, datos guardados y sesión conservados; reintentar o volver. |
| N04 | P06 | `N04_Obtencion_sin_mas_lotes_1582_v01.png` | 1414 × 1027 | Sin más lotes: estado vacío específico, lote conservado, explicación y acceso a historial. |
| N07 | P09 | `N07_Etapas_Alternativa_1_2718_acabado_No_aplica_seleccionado_v01.png` | 1414 × 1027 | Acabado del piloto no aplicable seleccionado: panel explicativo sin imagen sustituta y contador 2/2. |
| N08 | P09 | `N08_Etapas_Alternativa_1_2718_todas_conformes_v01.png` | 1414 × 1027 | Revisión completa del piloto: resumen de etapas, imagen final titulada como tal, retiro y candidatura según estado. |
| N09 | P09 | `N09_Etapas_Alternativa_3_1977_imagen_ausente_v01.png` | 1414 × 1027 | Escena base 1977 ausente: visor vacío identificado, siguientes pendientes/bloqueadas y conformidad inhabilitada. |
| N10 | P09 | `N10_Dialogo_Retirar_conformidad_2718_candidata_v01.png` | 1414 × 1027 | Retirar conformidad de piloto candidato: advertencia de cascada, confirmación conjunta y cancelación sin cambios. |
| N11 | P07 | `N11_Dialogo_Marcar_como_candidata_2718_v01.png` | 1414 × 1027 | Confirmar marcado: alternativa/lote, 2/2 aplicables conformes y aviso de selección no aprobatoria. |
| N12 | P07 | `N12_Dialogo_Reemplazar_candidata_314_reemplaza_a_2718_v01.png` | 1414 × 1027 | Confirmar reemplazo: candidata actual/nueva, 3/3 conformidades y única candidata con preservación de revisiones. |
| N13 | P07 | `N13_Dialogo_Retirar_candidata_2718_v01.png` | 1414 × 1027 | Confirmar retiro: lote sin candidata, revisiones e imágenes conservadas; botón destructivo y Cancelar. |
| N14 | P10 | `N14_Trazabilidad_ficha_no_disponible_A03_v01.png` | 1414 × 1027 | Ficha no disponible: imagen final válida, identidad conservada, aviso, reintento y vuelta al detalle. |
| N15 | P07 | `N15_Alternativas_imagen_ausente_A03_v01.png` | 1414 × 1027 | A03 sin imagen en grilla: tarjeta y contador conservados, mensaje específico y resto de alternativas intactas. |
| N16 | P11 | `N16_Cuentas_institucionales_v02.png` | 1414 × 1027 | Cuentas: header administrador, tabla, roles/estados/último acceso, nueva cuenta, acciones y paginación. |
| N17 | P11 | `N17_Dialogo_Nueva_cuenta_v01.png` | 1414 × 1027 | Diálogo de alta normal: usuario, nombre visible, rol, nota sobre activación/credencial y acciones. |
| N18 | P11 | `N18_Dialogo_Nueva_cuenta_usuario_repetido_v01.png` | 1414 × 1027 | Usuario duplicado: error junto al campo, valores conservados y sin crear una segunda cuenta. |
| N19 | P11 | `N19_Dialogo_Credencial_generada_v01.png` | 1414 × 1027 | Alta confirmada: Cuenta creada, identidad, credencial nueva, Copiar, aviso de una sola vez y cierre. |
| N20 | P11 | `N20_Dialogo_Restablecer_credencial_v01.png` | 1414 × 1027 | Confirmar restablecimiento: nueva credencial invalida anterior; aviso y acción destructiva. |
| N21 | P11 | `N21_Dialogo_Desactivar_cuenta_v01.png` | 1414 × 1027 | Confirmar desactivación: suspensión de acceso, preservación de operaciones y posible reactivación. |
| N22 | P11 | `N22_Dialogo_Reactivar_cuenta_v01.png` | 1414 × 1027 | Confirmar reactivación: cuenta vuelve a operar, conserva identidad e historial. |
| N23 | P11 | `N23_Dialogo_Eliminar_cuenta_v01.png` | 1414 × 1027 | Eliminar cuenta: aviso irreversible, datos suprimidos, operaciones disociadas y escritura del usuario para habilitar. |
| N24 | P11 | `N24_Cuentas_ultima_cuenta_administradora_v01.png` | 1414 × 1027 | Menú de última administradora: Restablecer habilitado; Desactivar/Eliminar bloqueados con explicación. |
| N25 | P12 | `N25_Registro_de_operaciones_usuario_institucional_v01.png` | 1414 × 1027 | Registro institucional: tabla, filtros boceto/lote/período, fecha descendente, detalle y cuenta eliminada. |
| N26 | P12 | `N26_Registro_detalle_de_una_operacion_v01.png` | 1414 × 1027 | Detalle en drawer derecho, fondo atenuado, solo lectura y campos de identificación de operación/material. |
| N27 | P12 | `N27_Registro_sin_resultados_v01.png` | 1414 × 1027 | Registro sin resultados: filtros preservados, vacío específico y Limpiar filtros. |
| N28 | P12 | `N28_Registro_error_v01.png` | 1414 × 1027 | Registro con error: conservar sesión y filtros; aviso, Reintentar y ninguna modificación de operaciones. |
| N29 | P12 | `N29_Registro_de_operaciones_administrador_v01.png` | 1414 × 1027 | Registro administrador: cabecera propia, acciones de cuentas y acceso fallido sin exponer identificador ingresado. |
| N30 | P04 | `N30_Acceso_datos_incompletos_v01.png` | 1414 × 1027 | Acceso incompleto: validación inline de ambos campos y tarjeta con altura correspondiente. |
| N31 | P04 | `N31_Acceso_credenciales_invalidas_v01.png` | 1414 × 1027 | Acceso inválido: aviso rojo superior, campos conservados y mensaje genérico. |
| N32 | P04 | `N32_Acceso_cuenta_desactivada_v01.png` | 1414 × 1027 | Cuenta desactivada al ingresar: aviso amarillo y contacto con administrador. |
| N33 | P04 | `N33_Acceso_iniciando_sesion_v01.png` | 1414 × 1027 | Solicitud de acceso en curso: botón deshabilitado, icono/texto de carga y explicación. |
| N34 | P02 | `N34_Encabezado_administrador_componente_v01.png` | 1414 × 94 | Cabecera administradora aislada: logo, Cuentas/Registro, cuenta, avatar, franja y altura 94 px. |
| N35 | P04 | `N35_Menu_de_cuenta_abierto_UI_v01.png` | 1414 × 1027 | Menú institucional abierto: Registro, Cómo recorrer, Acerca de, Cerrar sesión y datos de cuenta. |
| N36 | P04 | `N36_Aviso_sesion_vencida_v01.png` | 1414 × 1027 | Sesión vencida sobre detalle: modal bloqueante, preservación del material y retorno al acceso. |
| N37 | P04 | `N37_Aviso_cuenta_desactivada_durante_la_sesion_v01.png` | 1414 × 1027 | Cuenta desactivada durante sesión: modal, contacto, bloqueo efectivo y retorno al acceso. |
| N38 | P05 | `N38_Detalle_del_boceto_1582_lote_obtenido_v01.png` | 1414 × 1027 | Ficha 1582 obtenida: responsable/fecha, badge, Ver alternativas y Ver lotes. |
| N39 | P05 | `N39_Detalle_boceto_1663_lote_asignado_v01.png` | 1414 × 1027 | Ficha 1663 asignada: crédito/metadatos propios, badge, ID no documentado y acción sin inventar recursos. |
| N40 | P06 | `N40_Lotes_boceto_1663_lote_asignado_v01.png` | 1414 × 1027 | Historial 1663: asignación no obtenida, sin candidata, aviso de recursos pendientes y acción de obtención. |
| N41 | P06 | `N41_Lotes_error_al_reabrir_v01.png` | 1414 × 1027 | Error al reabrir lote: aviso inline, lote abierto preservado y Reintentar en fila. |
| N42 | P08 | `N42_Comparacion_imagen_ausente_v01.png` | 1414 × 1027 | Comparación con proyección ausente: boceto válido, panel de error/reintento, rótulo y selector conservados. |
| N43 | P04 | `N43_Dialogo_Acerca_de_Esbozo_v01.png` | 1414 × 1027 | Acerca de Esbozo: diálogo, propósito, versiones, condiciones/créditos, X y Cerrar. |
| N44 | P07 | `N44_Detalle_1366_768_v01.png` | 1366 × 768 | Detalle a 1366×768: visor centrado por altura, acciones/selección visibles, footer y sin recorte. |
| N45 | P08 | `N45_Comparacion_1366_768_v01.png` | 1366 × 768 | Comparación a 1366×768: toolbar, paneles, créditos/rótulo y selector completos. |
| UIKIT-01 | P02 | `UIKIT-01_UI_Kit_Esbozo_actualizado_v01.png` | 1905 × 2220 | Diez grupos: paleta, tipografía, acciones/foco, estados, revisión, avisos, visores, diálogos, tablas y roles. |

## 9. Casos transversales que no deben confundirse

- Un lote incompleto o corrupto durante su primera obtención no habilita la grilla (N01/N02). Si un lote ya obtenido pierde después un recurso en una consulta, se conserva su identidad y se representa la ausencia en el lugar correcto (N15/N42), sin fabricar un conjunto nuevo.
- «No aplica» describe el procedimiento, «No documentado» describe información esperada ausente y «No disponible» describe un recurso que no pudo recuperarse o validarse. No usar una misma condición nula para los tres estados.
- «Conforme» registra una revisión humana dentro de la app. «Candidata» es una selección reversible por lote. Ninguna de las dos equivale a valoración experta ni a aprobación institucional.
- La guía común, la preparación, una salida generada no adoptada, la composición de una etapa y la proyección final son recursos distintos. Compartir aspecto no los vuelve intercambiables.
- Las etiquetas 2718/1890/1977/314 reaparecen en archivos antiguos y finales. Comparar hashes y procedencia, no importar por coincidencia de nombre o semilla.
- Las cuentas y fechas visibles en el ZIP permiten reproducir una captura; no son autorización para registrar esas acciones como si hubieran ocurrido en la instalación real.
- Las pantallas de error, avisos de sesión y diálogos deben ser alcanzables por condiciones reales, además de poderse montar en escenarios visuales de prueba.

## 10. Registro de alcance de este relevamiento

Se inspeccionó el inventario completo del ZIP, se revisaron visualmente las 61 imágenes mediante láminas y ampliaciones de los diseños densos, y se contrastaron los flujos con los archivos del repositorio. Este documento define el trabajo pendiente: no certifica todavía la coincidencia de píxeles ni el cumplimiento funcional de las pantallas nuevas.

Durante la elaboración original del plan no se modificaron código, configuración ni datos; se añadió únicamente este documento. Posteriormente se completó P00, con respaldo, base de pruebas, reglas de autoría y lanzador de pruebas documentados en `ESTADO_INICIAL_2026-10-22.md`. Las funcionalidades y la base operativa se conservan.


## Actualización del 23 de octubre

El alcance vigente conserva el login original por instrucción expresa. Home, Boceto, header fijo, lotes, alternativas, detalle y etapas se implementaron en bloques anteriores. Se integraron trazabilidad, comparación, cuentas y registro; estos últimos siguen pendientes de revisión visual. El conjunto real 1582/1663 ya reemplazó al anterior en ambas bases, con respaldo y pruebas sobre copia. Ver `INTEGRACION_RESULTADOS_2026-10-23.md`. Las casillas iniciales de este plan describen su estado al redactarlo y no constituyen certificación de cierre actual. No se importan ejemplos de candidata ni conformidad del ZIP.
