> Documento histórico de implementación. Para instalar la entrega vigente, consultar README.md y SETUP.md; el estado de validación actual se informa en VALIDACION_FINAL.md.

# Índice de escenarios de referencia

Cada fila es un snapshot independiente. No registra acciones reales ni implica que la pantalla esté implementada. Las 61 recetas pueden resolverse con `npm run visual:scenario -- ID` o generarse juntas con `npm run visual:prepare`.

La columna de originales pendientes cuenta solo los recursos que necesita esa captura; el inventario completo contiene también insumos de procedencia para la importación. Las fuentes locales disponibles aún deben empaquetarse en P02.

| ID | Vista / rol | Estado específico | Captura | Originales faltantes para esa captura |
| --- | --- | --- | --- | --- |
| E01 | login / sin sesión | lotState=obtained; login=pristine | 1648 × 1030 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| E02 | home / institutional | lotState=obtained | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| E03 | home / institutional | lotState=obtained; dialog=guide | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| E04 | sketch / institutional | boceto 1582; lotState=available | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| E05 | obtain / institutional | boceto 1582; lotState=obtained; obtainResult=success | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| E06 | alternatives / institutional | boceto 1582; A01; lotState=obtained | 1414 × 1027 (viewport) | final-1582-2718, final-1582-1890, final-1582-1977, final-1582-314 |
| E07 | detail / institutional | boceto 1582; A01; lotState=obtained; candidata=PRJ-1582-L01-A01 | 1414 × 1027 (viewport) | final-1582-2718 |
| E08 | comparison / institutional | boceto 1582; A01; lotState=obtained; mode=side-by-side | 1414 × 1027 (viewport) | final-1582-2718 |
| E09 | comparison / institutional | boceto 1582; A01; lotState=obtained; mode=overlay | 1414 × 1027 (viewport) | final-1582-2718 |
| E10 | trace / institutional | boceto 1582; A01; lotState=obtained; traceState=available | 1414 × 2305 (full-page) | final-1582-2718, guide-common-1582 |
| E11 | history / institutional | boceto 1582; lotState=obtained | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| M01 | detail / institutional | boceto 1582; A02; lotState=obtained; candidata=PRJ-1582-L01-A01 | 1414 × 1027 (viewport) | final-1582-1890 |
| M02 | detail / institutional | boceto 1582; A04; lotState=obtained; candidata=PRJ-1582-L01-A01 | 1414 × 1027 (viewport) | final-1582-314 |
| M03 | detail / institutional | boceto 1582; A04; lotState=obtained; candidata=ninguna | 1414 × 1027 (viewport) | final-1582-314 |
| M04 | accounts / administrator | lotState=obtained; dialog=credential-reset | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| M05 | accounts / administrator | lotState=obtained; dialog=create-account | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| M07 | accounts / administrator | lotState=obtained; accountMenu=open | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N01 | obtain / institutional | boceto 1582; lotState=obtained; obtainResult=incomplete | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N02 | obtain / institutional | boceto 1582; lotState=obtained; obtainResult=integrity | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N03 | obtain / institutional | boceto 1582; lotState=obtained; obtainResult=operation | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N04 | obtain / institutional | boceto 1582; lotState=obtained; obtainResult=exhausted | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N07 | stages / institutional | boceto 1582; A01; lotState=obtained; stageView=finish | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N08 | stages / institutional | boceto 1582; A01; lotState=obtained; stageView=summary | 1414 × 1027 (viewport) | final-1582-2718 |
| N09 | stages / institutional | boceto 1582; A03; lotState=obtained; stageView=base; imagen de etapa ausente | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N10 | stages / institutional | boceto 1582; A01; lotState=obtained; stageView=summary; dialog=withdraw-review | 1414 × 1027 (viewport) | final-1582-2718 |
| N11 | stages / institutional | boceto 1582; A01; lotState=obtained; stageView=summary; dialog=mark-candidate | 1414 × 1027 (viewport) | final-1582-2718 |
| N12 | detail / institutional | boceto 1582; A04; lotState=obtained; dialog=replace-candidate; candidata=PRJ-1582-L01-A01 | 1414 × 1027 (viewport) | final-1582-314 |
| N13 | detail / institutional | boceto 1582; A01; lotState=obtained; dialog=remove-candidate; candidata=PRJ-1582-L01-A01 | 1414 × 1027 (viewport) | final-1582-2718 |
| N14 | trace / institutional | boceto 1582; A03; lotState=obtained; traceState=missing | 1414 × 1027 (viewport) | final-1582-1977 |
| N15 | alternatives / institutional | boceto 1582; A01; lotState=obtained; imagen final ausente | 1414 × 1027 (viewport) | final-1582-2718, final-1582-1890, final-1582-314 |
| N16 | accounts / administrator | lotState=obtained | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N17 | accounts / administrator | lotState=obtained; dialog=create-account | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N18 | accounts / administrator | lotState=obtained; dialog=create-account | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N19 | accounts / administrator | lotState=obtained; dialog=credential-created | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N20 | accounts / administrator | lotState=obtained; dialog=reset-credential | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N21 | accounts / administrator | lotState=obtained; dialog=deactivate-account | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N22 | accounts / administrator | lotState=obtained; dialog=reactivate-account | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N23 | accounts / administrator | lotState=obtained; dialog=delete-account | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N24 | accounts / administrator | lotState=obtained; rowMenuAccount=account-admin | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N25 | audit / institutional | lotState=obtained | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N26 | audit / institutional | lotState=obtained; operationDrawer=op-candidate | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N27 | audit / institutional | lotState=obtained; filtro 1663 sin resultados | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N28 | audit / institutional | lotState=obtained; error de consulta | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N29 | audit / administrator | lotState=obtained | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N30 | login / sin sesión | lotState=obtained; login=required | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N31 | login / sin sesión | lotState=obtained; login=invalid | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N32 | login / sin sesión | lotState=obtained; login=inactive | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N33 | login / sin sesión | lotState=obtained; login=loading | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N34 | header / administrator | lotState=obtained | 1414 × 94 (component) | Ninguno; verificar empaquetado de fuentes en P02 |
| N35 | alternatives / institutional | boceto 1582; A01; lotState=obtained; accountMenu=open | 1414 × 1027 (viewport) | final-1582-2718, final-1582-1890, final-1582-1977, final-1582-314 |
| N36 | detail / institutional | boceto 1582; A01; lotState=obtained; dialog=session-expired; candidata=PRJ-1582-L01-A01 | 1414 × 1027 (viewport) | final-1582-2718 |
| N37 | detail / institutional | boceto 1582; A01; lotState=obtained; dialog=session-inactive; candidata=PRJ-1582-L01-A01 | 1414 × 1027 (viewport) | final-1582-2718 |
| N38 | sketch / institutional | boceto 1582; lotState=obtained | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N39 | sketch / institutional | boceto 1663; lotState=assigned | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N40 | history / institutional | boceto 1663; lotState=assigned | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N41 | history / institutional | boceto 1582; lotState=obtained; reopenState=error | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N42 | comparison / institutional | boceto 1582; A01; lotState=obtained; mode=side-by-side; imagen final ausente | 1414 × 1027 (viewport) | Ninguno; verificar empaquetado de fuentes en P02 |
| N43 | alternatives / institutional | boceto 1582; A01; lotState=obtained; dialog=about | 1414 × 1027 (viewport) | final-1582-2718, final-1582-1890, final-1582-1977, final-1582-314 |
| N44 | detail / institutional | boceto 1582; A01; lotState=obtained; candidata=PRJ-1582-L01-A01 | 1366 × 768 (viewport) | final-1582-2718 |
| N45 | comparison / institutional | boceto 1582; A01; lotState=obtained; mode=side-by-side | 1366 × 768 (viewport) | final-1582-2718 |
| UIKIT-01 | reference-sheet / institutional | lámina de componentes, no ruta de producto | 1905 × 2220 (reference-sheet) | final-1582-2718 |

## Datos que se preservan en cada transición

Los efectos esperados por control están definidos en `interactions.json`. En particular, cancelar no altera la candidata o las conformidades; reabrir no cambia la obtención original; errores de recursos no sustituyen otra imagen; y cerrar registro/guía/Acerca de conserva el contexto. Las recetas no se encadenan sobre la misma base para obtener las capturas.

## Cobertura adicional inferida

Carga y error al guardar una mutación, operación por teclado, foco de controles, variantes normales de etapas y error de obtención del 1663 no tienen un PNG independiente para cada caso. Se implementarán con los componentes y contratos definidos, sin adjudicarles un ID inexistente del ZIP.
