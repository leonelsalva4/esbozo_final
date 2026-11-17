> Documento histórico de implementación. Para instalar la entrega vigente, consultar README.md y SETUP.md; el estado de validación actual se informa en VALIDACION_FINAL.md.

# Especificación visual y escenarios de referencia

P01, preparado el 22 de octubre de 2026. Referencia: los 61 PNG de `01_PNG.zip`. Este paquete especifica la implementación futura; no afirma que las pantallas nuevas ya estén implementadas o comparadas contra la app.

## Uso

Desde la raíz del repositorio:

```sh
npm run visual:check
npm run visual:scenario -- E07
npm run visual:prepare
```

- `visual:check` valida el catálogo y los hashes/dimensiones de los patrones locales; también los recursos disponibles. No consulta PostgreSQL ni ejecuta la aplicación.
- `visual:scenario -- ID` resuelve un escenario independiente con sus datos ficticios, textos, geometría, contratos de interacción y originales faltantes.
- `visual:prepare` escribe los 61 escenarios resueltos en `data/testing/p01/scenarios/`, ignorados por Git. Es la entrada para el montaje y las capturas que se incorporarán desde P02 y las fases de cada pantalla.

Los PNG se conservan en `data/references/mockups-v1/`, fuera de Git. En una máquina nueva, recuperarlos desde el ZIP original, manteniendo sus nombres:

```sh
mkdir -p data/references/mockups-v1
unzip -jn "/ruta/01_PNG.zip" '01_PNG/*.png' -d data/references/mockups-v1
npm run visual:check
```

No agregar estos PNG al repositorio: contienen imágenes patrimoniales. Los JSON de este directorio contienen especificación, hashes y datos de ejemplo, sin bytes de las obras, contraseñas reales ni tokens.

## Archivos y jerarquía de evidencia

| Archivo | Contenido |
| --- | --- |
| `references.json` | 61 nombres, resoluciones, versiones, SHA-256 y modalidad de captura; también hash del ZIP fuente |
| `measurements.json` | 685 regiones de color plano y paletas dominantes medidas sobre los PNG originales |
| `landmarks.json` | 246 áreas semánticas: header, breadcrumb, acceso, visores, diálogos, menú y drawer; márgenes y pies |
| `text-measurements.json` | 2333 cajas de glifos asociadas a textos revisados; ubicaciones aproximadas obtenidas mediante reconocimiento local |
| `copy.json` | Textos canónicos por componente/función, corregidos contra las referencias |
| `screen-texts.json` | Composición textual de los 61 escenarios, incluidos valores ficticios y origen debajo de overlays |
| `fixtures.json` | Cuentas, fechas, bocetos, lote provisional, ramas, etapas, conformidades y operaciones de ejemplo |
| `scenarios.json` | Una receta independiente por PNG: vista, rol, estado, recursos requeridos y condiciones esperadas |
| `interactions.json` | Controles y efectos esperados por escenario; distingue lo dibujado de las decisiones derivadas |
| `resources.json` | Inventario de 43 recursos: 15 disponibles y 28 originales o registros pendientes |
| `ESCENARIOS.md` | Índice legible de las 61 recetas y de sus dependencias visuales |

El PNG original prevalece para el aspecto. Los textos canónicos y el estado del escenario definen el contenido que debe renderizarse. Las regiones automáticas y las cajas de texto son instrumentos de medición, no un reemplazo de la comparación visual. Las reglas del producto se contrastan con el PDF, el plan y el modelo de datos.

El OCR bruto se conserva en `data/testing/p01/ocr-raw.json`, fuera de Git. No se usa como fuente de textos de interfaz: interpreta iconos como caracteres, omite tildes y confunde identificadores. Sus 78 regiones de texto no asociadas se excluyen de las cajas canónicas; el catálogo de textos se compone a partir de la lectura de las referencias. Los números de pasos y códigos de pie se registran explícitamente aunque el OCR los omita.

## Medidas compartidas

Todas las coordenadas se expresan en píxeles del PNG, origen superior izquierdo. Los rectángulos semánticos son `[x, y, ancho, alto]`.

| Componente | Referencia habitual | Referencia compacta |
| --- | --- | --- |
| Área de contenido | 1414 × 1027 | 1366 × 768 |
| Franja de identidad | y=0, alto 6 | y=0, alto 6 |
| Cabecera | y=6, hasta y=94 | y=6, hasta y=71 |
| Breadcrumb | `[0,94,1414,43]` | `[0,71,1366,32]` |
| Inicio de contenido de detalle | y=167 | y=121 |
| Margen horizontal de detalle/comparación | 62 | 35 |
| Margen de Inicio/grilla/obtención | 92 | No hay PNG compacto independiente |
| Separación entre columnas de detalle | 26 | 20 |
| Visor de detalle E07/N44 | `[62,167,813,714]` | `[35,121,828,536]` |
| Visores de comparación E08/N45 | `[62,391,635,518]` y `[717,391,635,518]` | `[35,273,638,411]` y `[693,273,638,411]` |
| Toolbar de comparación, relleno | `[63,310,1288,60]` | `[36,205,1294,54]` |
| Pie | y=989, alto 38 | y=740, alto 28 |

Excepciones importantes:

- E01 se captura a 1648 × 1030. La tarjeta de acceso tiene contorno aproximado `[556,158,536,531]`. Las variantes N30–N33 usan ancho 1414, x=439 y el mismo ancho de tarjeta; cambia su altura por validaciones/avisos/carga. No escalar todo el acceso proporcionalmente al ancho de pantalla.
- E10 es una captura de página completa de 1414 × 2305. El viewport de trabajo es 1414 × 1027, con scroll; no crear una ventana de 2305 px ni comprimir la ficha para que entre.
- N34 es solo la cabecera de administrador, 1414 × 94. No tiene breadcrumb ni footer dentro del recorte de referencia.
- El UI Kit es una lámina de 1905 × 2220, no una nueva pantalla de producto.
- E03 y N10 usan un diálogo de 680 px de ancho; las demás confirmaciones habituales, 578 px. Sus alturas no son intercambiables: están registradas por escenario en `landmarks.json`.
- Los diálogos mantienen cabecera y breadcrumb sin atenuar. El fondo atenuado comienza en y=137. No usar un overlay global que oscurezca también el header. Su color resultante está medido; opacidad y radio de desenfoque no se pueden recuperar de forma única de un raster y se calibrarán contra el PNG en P02.
- N26 es un drawer: `[930,137,484,890]`, pegado al borde derecho y debajo del breadcrumb. No reemplazarlo por una confirmación centrada.
- Los menús de cuenta están anclados a la derecha, con x≈1073 e y≈84: ancho 287, alto 178 para administrador y 266 para institucional; el menú no atenúa toda la página.
- En E06 la tarjeta candidata tiene un borde adicional: sus áreas internas difieren 1–2 px respecto de las demás. No igualar a mano los rellenos ignorando ese borde.

Las regiones de `measurements.json` describen relleno de color exacto, no siempre el borde exterior del componente. Texto, sombra, antialiasing y esquinas pueden fragmentar un área. El algoritmo descarta recorridos de menos de 3 px; `landmarks.json` etiqueta los contornos principales y separa esa evidencia de los rellenos. No convertir automáticamente todas las regiones en elementos HTML.

## Paleta, tipografía e iconos

Familias declaradas en el UI Kit: Liberation Serif para titulares, Inter para interfaz y DejaVu Sans Mono para identificadores. Inter está empaquetada; se localizaron las otras dos familias en el entorno local, con hashes registrados y ubicación de esta máquina en un archivo ignorado. No se cambiaron todavía las fuentes de la app ni se incorporaron esos archivos al paquete.

| Rol | Color |
| --- | --- |
| Ocre | `#EEB838` |
| Terracota | `#B15C52` |
| Celeste | `#75ADBF` |
| Salvia | `#91B29E` |
| Marrón | `#653E3D` |
| Papel de identidad | `#EEE1C3` |
| Fondo general | `#FBF7EE` |
| Visor | `#2F343A` |
| Tarjeta, observado | `#FFFDF8` |
| Campo/panel claro, observado | `#FFFDF9` |
| Cabecera, observado | `#FDFAF4` |
| Breadcrumb, observado | `#F2EAD9` |
| Rótulo del visor, observado | `#252E34` |
| Control de visor, observado | `#384148` |
| Selección de alternativa, observado | `#474538` |
| Fondo de conformidad, observado | `#EDF3E9` |
| Fondo informativo, observado | `#EAF1F0` |

Los nombres de los últimos colores describen dónde se observaron, no implican que todas sus variantes compartan un único tono. Las paletas por PNG conservan los valores medidos.

El PNG no contiene tamaños CSS, pesos de fuente ni radios como datos editables. `text-measurements.json` registra la caja visible de cada glifo o fragmento reconocido; su alto no equivale a `font-size`. En P02 se ajustarán tamaño, peso, interlineado y espaciado usando las fuentes locales y el resultado de Chromium. No se presenta como medida exacta un tamaño CSS supuesto.

Los iconos deben ser formas, no caracteres del OCR ni emojis: casa/Inicio, documento/Boceto, grilla/Alternativas, historial/Lotes, cuentas, capas/Etapas, comparación, flechas, zoom, restablecer, información, alerta, error, conformidad, candado, credencial, copiar y papelera. Reutilizar los SVG y la biblioteca de iconos existentes solo después de cotejar silueta, tamaño, trazo, separación y alineación; no dar por idéntico un icono de la misma categoría.

## Contenido y valores de prueba

Las recetas son independientes y tienen reloj fijo del 18 de octubre de 2026, zona `America/Argentina/Buenos_Aires`. Los datos de ejemplo no describen acciones reales de esta instalación.

| Alternativa en el ZIP | Etiqueta | Etapas aplicables | Conformidades del escenario principal |
| --- | --- | ---: | ---: |
| A01 | 2718 | 2 | 2 |
| A02 | 1890 | 3 | 1 |
| A03 | 1977 | 3 | 0 |
| A04 | 314 | 3 | 3 |

La candidata principal de los mockups es A01/2718. M03 y N08/N11 tienen el lote sin candidata. M02/N12 seleccionan A04/314 para reemplazar A01. Estos estados no se ejecutan consecutivamente contra una base compartida: cada receta restablece su propio snapshot.

E02 muestra 1582 disponible; E03 muestra «1 lote asignado» en el Inicio que queda detrás de la guía. Ese detalle se conserva con snapshots distintos. Los estados no deben forzarse a coincidir solo por compartir pantalla.

Las cuentas son `curaduria.mbqm`, `consulta.mbqm`, `investigacion.mbqm` y `educacion.mbqm`; la última está desactivada. La credencial visible `Ejemplo-0000-XXXX` está marcada como ficticia y no puede usarse para autenticar ni importarse a la base.

Los literales «No documentado», «No aplica» y «No disponible» tienen significados distintos. El estado de una imagen fallida no debe reutilizar el texto de un dato no aplicable. Los datos reales de versión, hash, cuenta y fecha reemplazan a los ejemplos en operación normal, conservando el diseño.

`screen-texts.json` incluye el contenido semántico del origen debajo de diálogos y drawer. No exige leer fragmentos que el propio overlay tapa o desenfoca. Los saltos visuales de línea, los recortes y la posición se verifican con la captura, no pegando manualmente un salto dentro de un dato para una sola resolución.

## Reglas de interacción cerradas para implementación

- Diálogo: foco inicial coherente con el control, tabulación contenida, fondo sin interacción, Escape/X/Cancelar sin mutación y retorno del foco al disparador. Confirmaciones de escritura bloquean doble envío; si fallan, conservan el estado válido y ofrecen reintento. Los avisos de sesión inválida regresan al acceso aun al cerrarse mediante X/Escape.
- Menú: botón accesible, `aria-expanded`, cierre por Escape o fuera del menú. Usar solo opciones del rol activo; el servidor valida el permiso.
- Formularios: errores inline y asociados al campo, valores conservados tras error y sin globos nativos que sustituyan el diseño. La creación de cuenta y el login no se envían incompletos.
- Credenciales: exhibición única tras la operación; Copiar informa éxito o fallo sin revelar el valor en logs. Cerrar descarta el valor. En N19 la tabla de origen se refresca al cerrar el resultado para conservar su snapshot de fondo.
- Obtención: cuatro operaciones locales; los pasos pendientes no se ejecutaron. Sin temporizadores para representar una generación. Una verificación fallida no habilita la grilla.
- Etapas: consultar imágenes ya producidas; conformidad en orden, con cuenta/fecha. Acabado del piloto no cuenta ni requiere revisión. Retiro de una etapa invalida sus revisiones posteriores aplicables y, tras confirmación, la candidata afectada.
- Comparación: alternativa y encuadre normalizado se conservan al cambiar modo. La selección de otra alternativa conserva el contexto de comparación; Reset devuelve zoom 100%, paneo cero y slider 50%. El slider funciona con teclado. Estas decisiones complementan el comportamiento descrito y se contrastarán con las pruebas de P08.
- Ausencias: mantener identificador, rótulo y recursos válidos; no arrastrar la imagen anterior ni sustituir ficha/etapa. Un fallo posterior de un recurso de un lote ya obtenido mantiene su casillero; un lote incompleto en la obtención no se presenta como conjunto válido.
- Registro: Aplicar filtros inicia consulta y vuelve a página 1; cambiar de boceto limpia un lote incompatible. Limpiar filtros retira restricciones de boceto, lote y fecha. Cerrar drawer conserva filtros/página/posición. Paginación inhabilitada cuando solo existe una página. Las decisiones no dibujadas están identificadas como derivadas en `interactions.json`.
- Vista compacta: N44 y N45 tienen composición propia por altura; no se obtiene reduciendo toda la página a una escala. El rótulo de IA, las acciones y la selección deben permanecer visibles.

## Recursos pendientes y decisiones antes de importar

El inventario contiene 43 entradas. Las 15 disponibles son dos recursos de marca, Inter y tres archivos de fuentes locales, dos bocetos y siete imágenes históricas. Las 28 pendientes comprenden:

- Cuatro proyecciones finales del 1582 como originales separados.
- Once imágenes adoptadas de etapas: base/figuras para el piloto y base/figuras/acabado para las otras tres ramas.
- Guía común y tres guías sectoriales del 1582.
- Seis recursos de referencia: fragmentos de obras, referencia de acabado y par de ejemplo; su identificación exacta debe provenir del registro.
- Manifiesto de procedencia y operaciones del lote final.
- Identificación y metadatos verificables de P4/+180.
- Paquete del 1663, que aún no tiene lote en la base original.

La lista no implica que una etapa deba inventarse si los registros finales definen otra estructura. La importación deberá cotejar qué imagen fue adoptada, qué operación la produjo y su aplicabilidad. No se requieren los pesos de FLUX para ejecutar esta aplicación.

Conflictos registrados para resolver antes de la carga real:

1. **Colisión de ID y orden histórico.** `LOT-1582-L01` ya existe con A01/1890, A02/1977, A03/314, A04/2718. Los mockups usan el mismo ID provisional y A01/2718, A02/1890, A03/1977, A04/314. Propuesta: conservar el lote histórico y asignar al final una identidad nueva, por ejemplo secuencia 2 si sigue disponible. Confirmar la identidad documental al recibir el paquete; no renombrar ni sobrescribir filas antiguas. El fixture conserva el ID literal del PNG para comparar el aspecto.
2. **Pies y avisos de maqueta.** Se mantienen en el catálogo literal para la comparación. Antes de la entrega operativa, decidir expresamente qué marcas de artefacto se conservan; no quitarlas ni presentar datos reales como ficticios por iniciativa propia.
3. **Conformidades sin archivos entregados.** Pueden montarse como ejemplo visual. La aplicación real no deberá registrar conformidades sobre imágenes ausentes o no verificadas.
4. **Asignación 1663.** Su ID documental es nulo, no una cadena fabricada. El botón puede intentar resolver la asignación, pero sin paquete debe informar ausencia; no devolver cuatro alternativas inventadas. No hay PNG independiente del error de ese intento: reutilizar el patrón de error con datos reales y revisar su texto en esa fase.
5. **Normalidad de etapas.** El ZIP incluye acabado no aplicable, revisión completa y recurso ausente, pero no todos los estados normales de cada etapa. Se componen con el UI Kit y los requisitos; siguen identificados como derivados para no afirmar que existen referencias adicionales.

## Estado de cierre de P01

El catálogo, los textos por escenario, las medidas, los recursos y los snapshots están preparados y validados. El generador solo produce datos de referencia; no hay montaje de pantallas nuevas ni comparación de capturas de la app todavía. Cada escenario conserva `applicationMount: pending` y `pixelComparisonExecuted: false`.

P02 puede comenzar con paleta, fuentes, header, formularios, badges y diálogos, usando estos contratos. La igualdad visual de pantallas que requieren proyecciones/etapas originales queda pendiente de los archivos correctos. No usar una captura como fondo de interfaz ni una imagen antigua como recurso sustituto para aparentar ese cierre.


Los JSON auxiliares de medición, OCR y escenarios se conservan localmente en `data/references/mockups-v1/catalog/`, fuera de Git. `scripts/visual/catalog.mjs` utiliza esa ubicación. Los originales del ZIP y las capturas también permanecen fuera de Git.
