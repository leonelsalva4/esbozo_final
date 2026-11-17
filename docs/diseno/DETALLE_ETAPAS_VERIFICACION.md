> Documento histórico de implementación. Para instalar la entrega vigente, consultar README.md y SETUP.md; el estado de validación actual se informa en VALIDACION_FINAL.md.

# Detalle y revisión por etapas · 23 de octubre de 2026

> Registro histórico del bloque anterior a la importación final. Sus conteos, candidatas y pendientes de datos describen aquella revisión, no la instalación actual. El estado vigente y las nuevas limitaciones están en [Integración de resultados](../INTEGRACION_RESULTADOS_2026-10-23.md) y [Cobertura de las 61 referencias](COBERTURA_61_PANTALLAS.md). Las capturas anteriores no certifican la interfaz posterior a la integración.

Bloque integrado en la aplicación: E07, M01–M03, N07–N15 y N44. La vista normal de trazabilidad conserva su diseño histórico; sólo se adaptó su retiro de candidata y se agregó el estado de ficha no disponible N14. No se implementó en este bloque el rediseño completo E10.

## Componentes y comportamiento

- `DetalleProyeccionScreen`: visor ampliado, identidad con posición y semilla histórica, rótulo permanente, controles inferiores y selector textual. Comparar, Revisar etapas y Ver trazabilidad conservan la alternativa activa. La franja de conformidad mantiene su espacio durante la carga, para que las acciones no cambien de posición al llegar una respuesta.
- `ProjectionViewer`: imagen completa, zoom 60–200 %, paneo limitado a la imagen realmente contenida, restablecimiento y cancelación de solicitudes al cambiar de recurso. Restablece el encuadre al cambiar de alternativa. Revoca las Blob URLs. Los errores no reutilizan la imagen anterior.
- `CandidatePanel`: estados de candidata actual, revisión incompleta, otra candidata y revisión completa sin candidata; confirmación de marcado, reemplazo y retiro. Cancelar, X o Escape no escriben. Los errores conservan el diálogo y ofrecen actualizar el estado antes de volver a confirmar.
- `EtapasScreen`: Escena base, Figuras y Acabado pictórico; aplicabilidad, descripción, procedencia, guías/referencias documentadas y responsable/fecha. Las etapas pendientes no habilitan su selector ni su conformidad. Una etapa no aplicable se puede consultar, no usa una imagen sustituta y queda fuera del denominador.
- El resumen completo titula el visor como **Proyección final**. La imagen final no se presenta como un archivo de una etapa sin documentar. Registrar conformidad requiere que la imagen también haya terminado de cargarse en el visor.
- `AlternativasScreen` y `ReviewCount` en Lotes: contadores consultados al volver a estas vistas, estados de carga/fallo separados y selección actual recuperada de la base. N15 conserva cuatro tarjetas y la identificación de la imagen ausente. Un recurso perdido de un lote obtenido no se trata como una primera obtención válida de un lote incompleto.
- `TrazabilidadScreen`: el retiro usa el mismo diálogo y contrato que el detalle; actualiza la selección y el registro tras guardar. `UnavailableDossier` implementa N14 con imagen final independiente de la ficha, identidad conservada, Reintentar y Volver. El reintento no sustituye datos de otra alternativa.
- `App`: ruta de etapas y regreso al mismo detalle. El header compartido continúa fijo.

## Datos, API y preservación

`backend/db/migrations/001_stage_review.sql` agrega `production_stage` y `stage_review`. El ejecutor `backend/scripts/migrate.mjs` mantiene una tabla de migraciones con SHA-256, bloqueo de ejecución y transacción. Rechaza cambios de contenido en una migración ya aplicada. No ejecuta `schema.sql`, no modifica imágenes ni completa etapas a partir de semillas o archivos finales.

La migración se aplicó y repitió sólo sobre `esbozo_test_p00_20261022_235945`. La base principal no fue migrada. Las tablas nuevas de la copia habitual quedaron vacías: no se incorporaron las fixtures visuales a sus tablas existentes.

Contratos nuevos:

- `GET /api/lotes/:loteId/projections/:projectionId/review`: estados, recursos comprobados, conformidades, candidata y revisión del estado.
- `GET /api/lotes/:loteId/reviews`: resúmenes para grilla e historial.
- `POST` y `DELETE /api/lotes/:loteId/projections/:projectionId/stages/:stageKey/review`: alta o retiro de conformidad.
- `PUT` y `DELETE /api/lotes/:loteId/candidate`: requieren alternativa y `expectedRevision`; las llamadas antiguas sin estado confirmado no escriben.

Las mutaciones bloquean el lote, vuelven a comprobar pertenencia, cuenta activa, orden y recursos, y guardan cambios y auditoría en una única transacción. Una confirmación desactualizada responde 409. Retirar conformidad elimina las activas de esa etapa y las siguientes y, cuando corresponde, la candidata, conservando los datos previos en auditoría. Una candidata histórica no se elimina por carecer de documentación nueva.

La conformidad guarda el SHA-256 de la imagen y una huella del registro de etapa. Cambiar la imagen o su documentación invalida la conformidad para nuevas candidaturas. El retiro de candidata conserva las conformidades.

El contenido de imágenes ahora comprueba SHA-256, tamaño y decodificación PNG/JPEG con dimensiones coincidentes antes de entregar bytes. Responde 404/422 ante ausencia/integridad fallida y usa `Cache-Control: no-store`. Esto evita que una imagen corrupta aparezca en una tarjeta por haber fallado sólo una comprobación separada. Los formatos y límites actuales de esta comprobación son PNG/JPEG hasta 32 megapíxeles; ampliar formatos corresponde al contrato del importador.

Se distinguen:

- No documentado: falta el registro de etapa o la identificación de su imagen.
- No disponible: el recurso identificado falta o falla su verificación.
- No aplica: declaración explícita del procedimiento; no se deduce de una ausencia.
- Pendiente: falta conformidad válida de una etapa anterior.

## Comprobaciones realizadas

- Build de frontend y backend; lint y whitespace.
- **16 pruebas nuevas** de integración, en un esquema propio descartable dentro de la copia: ausencia de documentación, orden, no aplicabilidad, recurso ausente, hash incorrecto, PNG truncado aun con hash recalculado, reemplazo, concurrencia, confirmación obsoleta, retiro en cascada, rollback al fallar auditoría, invalidación por documentación modificada, retiro de candidata, autenticación/cuenta activa, entrega de bytes verificados y ficha técnica fallida con imagen independiente.
- **10 pruebas anteriores** de lotes siguen pasando. Las pruebas no escriben en las tablas preexistentes. Se eliminan sus esquemas al finalizar.
- Navegación en navegador y Electron: Boceto → Alternativas → Detalle → Etapas → Detalle. Comparación y Trazabilidad mantienen la alternativa elegida. Diálogo de retiro desde Trazabilidad, cancelación y conservación de candidata.
- En un esquema visual descartable: M01 bloqueado, M02 reemplazo, M03 sin candidata, N11 marcado, N13 retiro, N07 no aplicable, N08 revisión completa, N10 cancelación y retiro conjunto, registro secuencial de ambas conformidades, N09 ausencia de etapa y selectores siguientes bloqueados, N15 pérdida de una imagen sin perder las cuatro tarjetas.
- N14 provocado sólo en ese esquema: ficha fallida devuelve 503, la imagen conserva su identidad y se muestra; Reintentar mantiene el contexto mientras persiste el fallo y recupera la vista normal cuando vuelve la ficha.
- E07 a 1414×1027: visor `(62,167,813,714)`, imagen con área de 514 px de alto, toolbar y selector textual. N44 a 1366×768: visor de 828×536 px, selector y=614, footer y=739; altura del documento 768 px, sin desplazamiento ni recorte. N14: visor `(62,309,813,547)`, imagen de 444 px de alto y footer y=989.
- Tras descartar las fixtures, se restauró el backend habitual de pruebas. La copia conserva obtención y candidata con sus fechas anteriores. La base original conserva sus 188 registros de auditoría y las nueve imágenes verificadas. Login sin diferencias con HEAD; Home y Boceto no se editaron en este bloque.

Las capturas están en la ruta ignorada `data/testing/detalle-etapas/`. Los archivos `fixture-*.png` son evidencia de pruebas y no registros de producción. El servidor visual `backend/tests/review-visual.mjs` recorta imágenes de los mockups exclusivamente para un esquema `test_reviews_visual_*`; no usa esos recortes para completar la instalación real. Requiere los PNG originales extraídos, la configuración de copia y el puerto 4000 libre. `--missing-dossier` provoca la ficha ausente únicamente allí. Al finalizar con Ctrl+C elimina su esquema; no detiene otros servidores por su cuenta.

Las medidas anteriores verifican la composición principal; no certifican igualdad de todos los glifos/iconos. Los rótulos, fechas, cuentas y semillas de los datos existentes se conservan aunque difieran de los ejemplos del ZIP.

## Qué probar en la aplicación habitual

1. **Detalle**: abrir la segunda alternativa, cambiar entre las cuatro, acercar/panear/restablecer, volver a grilla, Comparar y volver. En 1366×768 deben verse los controles y las acciones completas. Abrir Retirar candidata y cancelar o cerrar con Escape: la candidata debe seguir siendo A02/1977.
2. **Etapas**: Revisar etapas y recorrer sus tres registros. En los datos históricos actuales se muestra **No documentado** y Registrar conformidad está bloqueado. Volver al detalle debe conservar la alternativa.
3. **Grilla e historial**: volver y abrir Lotes. La candidata histórica y su fecha deben conservarse; no deben aparecer los contadores de las fixtures.
4. **Trazabilidad**: abrir desde la candidata, abrir su retiro y cancelar. La ficha normal mantiene su composición anterior; N14 se verifica con la prueba aislada, sin dañar datos para provocarlo.

Comandos de comprobación:

```bash
npm --prefix backend run db:migrate -- --test
npm --prefix backend run test:reviews
npm --prefix backend run test:lots
npm --prefix desktop run build
npm --prefix desktop run lint
```

## Límites y siguiente revisión humana

Faltan el manifiesto y los archivos de las etapas reales del material final, sus guías/referencias y la identificación definitiva de ramas. No se crearon a partir del lote histórico SD/ControlNet ni se renombró ese material como FLUX.2/P4/+180. Por eso el flujo completo con producción final está pendiente de importación, aunque las reglas y estados ya se probaron en aislamiento.

La migración no agrega operaciones técnicas, linaje de guías, corpus nuevo, adaptación FLUX ni administración de cuentas. Son partes pendientes del plan general. Los vínculos de guías/referencias de etapa admiten información documental, sin sustituir el dominio completo de importación y trazabilidad pendiente.

No se cambió el login, no se entrenó ni generó material, no se ejecutó el esquema destructivo, ni se hizo commit o push. El bloque queda para revisión antes de continuar con otro componente.
