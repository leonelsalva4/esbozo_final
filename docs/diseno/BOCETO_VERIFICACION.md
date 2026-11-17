> Documento histórico de implementación. Para instalar la entrega vigente, consultar README.md y SETUP.md; el estado de validación actual se informa en VALIDACION_FINAL.md.

# Boceto · Revisión por componente

> Registro histórico del bloque anterior a la importación final. Sus conteos, candidatas y pendientes de datos describen aquella revisión, no la instalación actual. El estado vigente y las nuevas limitaciones están en [Integración de resultados](../INTEGRACION_RESULTADOS_2026-10-23.md) y [Cobertura de las 61 referencias](COBERTURA_61_PANTALLAS.md). Las capturas anteriores no certifican la interfaz posterior a la integración.

Referencias: E04 y N38 (1582), N39 (1663). Home y login se conservan.

## Cambios

- `BocetoScreen.tsx/css`: visor oscuro, imagen completa, crédito permanente, controles inferiores con porcentaje, ficha documental y panel del lote. Serie y sello se separan para presentación; no se reescribieron metadatos de origen.
- `GET /api/sketches/:id/lote-obtenido`: incluye el nombre real de la cuenta responsable.
- `GET /api/sketches/:id/lotes`: consulta autenticada del historial registrado, con fecha, responsable y cantidad de proyecciones. Sin migración ni escritura.
- Ver lotes abre una lista de sólo lectura; conserva acceso a la comprobación de obtención existente. No sustituye la futura pantalla completa de gestión de lotes.
- Un lote obtenido ofrece Ver alternativas y no vuelve a obtenerse desde esta ficha. Un boceto sin lote no muestra recursos ni asignaciones ficticias.

## Comprobado

- Builds de frontend y backend, lint y whitespace correctos. Los archivos de login siguen idénticos a HEAD.
- A 1414×1027: visor `(62,309,813,605)`, ficha `(901,309,451,351)`, lote obtenido `(901,672,451,262)`, controles en y=864 con alto 36 px y footer en y=989 con alto 38 px. Coinciden con las superficies medidas de N38/E04.
- Imagen completa; zoom 100→140 %, paneo real y acotado; Restablecer devuelve escala 1 y desplazamientos cero.
- Ver alternativas abre el lote guardado; Ver lotes lista LOT-1582-L01 con 4 proyecciones y permite consultar la comprobación anterior.
- Cambio a 1663: inventario y sello correctos, zoom 100 %, imagen propia y estado Sin lotes registrados. A 1366×768 no hay desbordamiento horizontal.
- API: historial y responsable contrastados con la copia; 1663 devuelve historial vacío; endpoints nuevos requieren sesión (401 sin credencial).
- Después de recorrer las pantallas, la obtención y candidata de la copia conservan exactamente sus valores y fechas. La base original mantiene conteos, candidata y hashes de sus nueve imágenes; auditoría original: 188 registros.

## Límites

La copia contiene 1582 ya obtenido y 1663 sin lote. Por eso E04 disponible no se ejercitó con una nueva obtención en esta revisión, y N39 no se presenta como una asignación real. El flujo existente de obtención se conserva para un lote disponible; la gestión de varios lotes y asignaciones corresponde al bloque de Lotes. El historial agregado es documental, sin edición ni nueva selección de lote activo.

Las medidas principales coincidentes no certifican igualdad de cada glifo o icono. Evidencia local ignorada: `data/testing/boceto/`. No hubo importaciones, commits ni push.

Revisión manual: comprobar ficha de ambos bocetos; zoom, paneo y Restablecer; Ver alternativas; Ver lotes y cierre con Escape; Cambiar de boceto y regreso desde Inicio.
