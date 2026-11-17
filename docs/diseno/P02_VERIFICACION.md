> Documento histórico de implementación. Para instalar la entrega vigente, consultar README.md y SETUP.md; el estado de validación actual se informa en VALIDACION_FINAL.md.

# P02 · Estado vigente después de restaurar el login

Por indicación del usuario se restauraron `LoginScreen.tsx` y `LoginScreen.css` exactamente a su versión previa, tomada de HEAD. Se retiraron las variantes de acceso de la galería y el comparador específico de ese rediseño. Las capturas de acceso anteriores en `data/testing/p02/` son evidencia histórica de un cambio descartado; no describen la implementación vigente.

## Cambios que permanecen

- `AppHeader.tsx` y `AppHeader.css`: cabecera, navegación, breadcrumb y menú de cuenta, integrados en las pantallas existentes.
- `components/ui/`: componentes nuevos (identidad, controles, avisos, badges, campos, etapas, visor, selector, tabla por estilos, paginación, diálogo, drawer y footer). Se muestran en la galería; su presencia no implica que ya reemplacen cada control de las pantallas existentes.
- `assets/fonts/fonts.css`, fuentes locales y licencias: soporte tipográfico de los componentes nuevos. Se conservaron las declaraciones anteriores utilizadas por el login.
- `main.tsx` y `dev/VisualWorkbench`: carga del sistema visual y galería sólo en desarrollo (`?visual=UIKIT01` y `?visual=N34`). No escribe en la base.
- `index.html`: idioma español de Argentina.

## Verificación posterior a la restauración

- Los dos archivos del login no tienen diferencias con HEAD.
- Build y lint correctos.
- No hubo cambios de esquema, importaciones, commits ni push.

## Qué probar

| Componente | Comprobación manual |
| --- | --- |
| Login restaurado | Diseño anterior con panel de identidad, ingreso, mostrar/ocultar contraseña y error con credenciales incorrectas. |
| Cabecera integrada | Inicio → Boceto → Alternativas; estado activo y botones deshabilitados según contexto; breadcrumb; menú y cierre de sesión. |
| Menú de cuenta | Abrir con teclado, recorrer con flechas y cerrar con Escape. |
| Componentes de galería | En `?visual=UIKIT01`, revisar botones, campos, avisos, badges y controles. Abrir diálogo/drawer, recorrer con Tab y cerrar con Escape. Son ejemplos de desarrollo. |
| Cabecera de administrador | En `?visual=N34`, revisar la variante visual. Las rutas reales y permisos todavía no están implementados. |

La base visual aún requiere ajuste e integración por pantalla. Las pantallas históricas conservan sus estilos; la conversión de sus medidas `vw` sigue pendiente. Antes de nuevas ediciones se informarán los componentes afectados. El login queda excluido salvo pedido explícito del usuario.
