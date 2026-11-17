> Documento histórico de implementación. Para instalar la entrega vigente, consultar README.md y SETUP.md; el estado de validación actual se informa en VALIDACION_FINAL.md.

# Home · Revisión por componente

Referencia: `E02_Inicio_v02.png`. El login permanece idéntico a HEAD. La ficha del boceto y las pantallas siguientes no se rediseñaron en este bloque.

## Cambios

- `HomeScreen.tsx/css`: composición, tarjetas, imágenes completas, metadatos, badges, botones y pie. La pantalla usa medidas en píxeles y columnas flexibles; en ventanas cortas conserva desplazamiento vertical y a menos de 900 px pasa a una columna.
- `AppHeader.tsx/css`: props opcionales para la indicación inicial de navegación y el breadcrumb de Home. Las otras pantallas conservan su variante.
- `types.ts` y `GET /api/sketches`: campo adicional `lot_count`, calculado sobre los lotes registrados. Sin cambios de esquema ni escritura de datos.
- Carga y error se distinguen; un fallo al consultar bocetos ofrece Reintentar y un fallo de imagen muestra Imagen no disponible.

## Comprobado

- Builds de frontend y backend, lint y comprobación de whitespace correctos.
- A 1414×1027: tarjetas `(92,313,603,619)` y `(719,313,603,619)`; gap 24 px; visores 577×314 px; botones de 44 px; footer en y=989 con alto 38 px. Coinciden con las superficies medidas de E02.
- A 1366×768 no hay desbordamiento horizontal; no se achica toda la interfaz para evitar el scroll vertical.
- Las dos imágenes reales cargan completas. Ambos botones abren la ficha del inventario correcto.
- La copia de pruebas tiene 1 lote para 1582 y 0 para 1663. No se reproduce el badge ficticio de asignación del 1663; falta implementar ese dominio e importar su lote real.
- La API sigue rechazando consultas sin sesión con 401. Conteos contrastados por consultas de solo lectura.
- La base original conserva sus conteos, candidata y nueve imágenes con hashes correctos; auditoría original: 188 registros.

Capturas y medidas locales: `data/testing/home/`, ignoradas por Git. La coincidencia de superficies no certifica igualdad de cada glifo o píxel. El pie muestra el texto de la aplicación, sin identificadores ni avisos propios de una maqueta. No hubo commit ni push.

Para revisión humana: mirar alineación y separación de las tarjetas, comprobar imágenes y textos, abrir ambas fichas y volver a Inicio, y redimensionar la ventana. Continuar con otro componente después de esta revisión.
