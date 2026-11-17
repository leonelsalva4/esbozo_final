> Documento histórico de implementación. Para instalar la entrega vigente, consultar README.md y SETUP.md; el estado de validación actual se informa en VALIDACION_FINAL.md.

# Lotes y grilla de alternativas · Revisión por componentes

> Registro histórico del bloque anterior a la importación final. Sus conteos, candidatas y pendientes de datos describen aquella revisión, no la instalación actual. El estado vigente y las nuevas limitaciones están en [Integración de resultados](../INTEGRACION_RESULTADOS_2026-10-23.md) y [Cobertura de las 61 referencias](COBERTURA_61_PANTALLAS.md). Las capturas anteriores no certifican la interfaz posterior a la integración.

Referencias principales: E05, E06 y E11. El detalle individual no se rediseñó en este bloque.

## Implementado

- `LoteObtenidoScreen`: cuatro comprobaciones reales, sin intervalo de revelado ni pausa obligatoria en el mapa. Una verificación guardada no se presenta como una comprobación actual: se vuelve a consultar el recurso mediante una operación de sólo lectura. Los registros históricos originales siguen guardados.
- `AlternativasScreen`: grilla 2×2, imágenes completas con fondo oscuro, rótulo permanente de IA, candidata real y botones ocres uniformes. Se conservan las posiciones y semillas del lote histórico: 1890, 1977, 314 y 2718; la candidata sigue siendo A02/1977.
- `LotesScreen`: historial por boceto con responsable/fecha, candidata, estado, paginación, obtención de un lote disponible y reapertura por ID. Un error de reapertura permanece en la fila y no reemplaza el lote activo.
- `LotsNavigation`, `App` y `AppHeader`: navegación Lotes habilitada cuando existe un boceto activo; protección ante respuestas tardías que intenten reemplazar un lote elegido explícitamente.
- `BocetoScreen`: conserva su diseño aprobado; Ver lotes abre el historial común y la obtención envía el ID concreto y reconoce los nuevos resultados de cuatro pasos.

## API y preservación

- `services/lot-verification.ts`: localización, recuperación de archivos/metadatos, verificación SHA-256/tamaño/MIME/posiciones/pertenencia y preparación del conjunto de cuatro.
- La obtención serializa solicitudes por boceto y guarda obtención y auditoría en una transacción. Repetir el mismo ID devuelve su registro existente sin modificarlo. El próximo disponible excluye los lotes ya obtenidos.
- `GET /api/lotes/:id/open` verifica recursos sin modificar fecha, candidata o auditoría. La lista de proyecciones incluye la semilla real. No hubo migraciones, inferencia ni importación de nuevas imágenes.
- El flujo del mapa histórico y sus archivos se conservan en el repositorio y en la trazabilidad, pero no interrumpen la nueva obtención.

## Comprobado

- Build de frontend y backend, lint y whitespace correctos.
- Diez pruebas de integración en un esquema temporal propio dentro de la copia de pruebas: reapertura, idempotencia, recursos ausentes, SHA-256 incorrecto, concurrencia, agotamiento, rollback al fallar auditoría, asociaciones incorrectas, múltiples lotes y autenticación. El esquema usa tablas copiadas, servidor y secuencia propios; se elimina al finalizar. Las tablas preexistentes no se usan para mutaciones de prueba.
- Ejecutar con `npm --prefix backend run test:lots`; requiere la configuración de pruebas validada de P00 y rechaza una base cuyo nombre no comience con `esbozo_test_`.
- Navegación real en navegador y Electron: Boceto → Lotes → Reabrir lote → Alternativas → Detalle; breadcrumb a comprobación; Ver los registros y cierre con Escape.
- E05 a 1414×1027: checklist `(92,313,669,385)` y panel oscuro `(787,313,535,533)`; estadísticas desde y=517. E06: tarjetas 603×343 px, posiciones `(92,276)`, `(719,276)`, `(92,637)` y `(719,637)`; footer y=989.
- A 1366×768 no hay desbordamiento horizontal en historial o grilla; la cabecera continúa fija al bajar.
- La copia conserva obtención y candidata con sus fechas anteriores; la base original conserva sus conteos, candidata y nueve imágenes con hashes correctos. Auditoría original: 188 registros.
- Capturas locales ignoradas: `data/testing/lotes-alternativas/`. Los archivos del login permanecen idénticos a HEAD. Home no se editó en este bloque.

## Pendientes explícitos

No existe todavía el dominio de revisión de etapas: los contadores muestran Conformidades no documentadas. No se fabricaron los 2/2 o 3/3 de los ejemplos ni se modificó la candidata histórica. La adaptación completa del detalle y sus reglas de candidatura pertenece al siguiente bloque.

1663 sigue sin lote real ni asignación persistida. La preparación/importación del material final sigue pendiente. El agotamiento ya devuelve un estado distinto en API y se comunica sin borrar el lote activo; la pantalla específica de agotamiento N04 y la variante de asignación N40 no se dan por terminadas aquí. Los fallos de recursos e integridad fueron provocados en las pruebas aisladas; no se dañaron imágenes del conjunto usado para la revisión visual.

La coincidencia de superficies principales no certifica igualdad de todos los glifos o iconos. No hubo commit ni push.
