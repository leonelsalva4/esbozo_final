# Informe de validación de Esbozo

Leonel Salva y Luciana Russo · Ingeniería en Informática · 17 de noviembre de 2026

Versión evaluada: **ESB-ENTREGA-20261117**. La etiqueta de entrega y el manifiesto `docs/ENTREGA_VERSION.json` identifican el código. Este informe sustituye las conclusiones de estado de la revisión R5 del 23/10; las ejecuciones y fallos anteriores se conservan en el archivo privado de evidencia.

## 1. Alcance y condiciones de ejecución

Se evaluó el código de la aplicación, la restauración de la instalación y el acceso a resultados reales ya producidos. No se ejecutó generación ni entrenamiento. Se usaron los bocetos 1582 y 1663, dos lotes, ocho finales, 91 recursos visuales y 24 etapas aplicables. Las dos alternativas 2718 incluyen ahora el acabado pictórico asociado a su final, según la asignación confirmada por el usuario; ya no se informa ese acabado como «No aplica».

El equipo medido fue un Apple M4 con 16 GB, macOS ARM64, Node.js 24.19.0, Electron 43.4.0 y PostgreSQL 17.10. Las repeticiones de desempeño utilizaron un área de contenido de 1366 × 768. El equipo supera los cuatro núcleos y 8 GB de referencia: los resultados no certifican el rendimiento en ese hardware objetivo. Windows se documenta y se comprueba por separado en la integración continua del repositorio; el recorrido gráfico de esta revisión corresponde a macOS.

Todas las escrituras de validación ocurrieron en bases, esquemas o instancias PostgreSQL descartables. Se conservaron las cuentas y decisiones de uso. El paquete de instalación fue exportado de sólo lectura, restaurado en una base vacía y contrastado con su inventario. La restauración repetida sobre una base con objetos fue rechazada.

## 2. Resultados principales

| Comprobación | Resultado observado |
| --- | --- |
| Backend | 71 aprobadas, 0 fallidas, 3 omitidas; 74 registradas |
| Escritorio | 23 pruebas aprobadas, ninguna fallida |
| Compilación | Backend y frontend aprobados; análisis de frontend sin errores |
| Instalación | Restauración real aprobada; 91 hashes coincidentes y protección de destino existente |
| Imágenes en Electron | 91 de 91 decodificadas, con SHA-256 y dimensiones coincidentes |
| Etapas | Ocho alternativas con tres etapas; 24 conformidades registradas sólo en la fixture |
| Recorrido completo PF-00 | Diez repeticiones aprobadas, con restauración y reinicio entre repeticiones |
| Teclado | Recorrido completo aprobado con Tab, escritura de texto y Enter; foco confinado en el diálogo |
| Recuperación PF-11 | Caída real de la instancia temporal durante obtención y candidatura; rollback y reintentos aprobados |
| Servicios externos | Recorridos completos sin solicitudes externas; el renderer rechazaba destinos ajenos a loopback |
| Conjunto activo | Sin registros ni columnas de la cadena retirada en el control de la base activa |

Las omisiones no se cuentan como aprobaciones. Corresponden a controles que necesitan archivos originales privados completos, no disponibles íntegramente en las carpetas históricas. La instalación vigente sí conserva sus 91 recursos y fue verificada tanto en la API como en el renderer.

## 3. Prueba 1: proyecciones y procedencia

Los ocho finales y las 24 imágenes de etapa se recuperaron desde la base, sin sustituir imágenes ausentes por recursos de otra etapa. Se comprobó la igualdad de SHA-256, tamaño y dimensiones para los recursos instalados. En el renderer se decodificaron las 91 imágenes con el mismo método de lectura que utiliza la aplicación.

| Inventario | Alternativas | Base | Figuras | Acabado |
| --- | --- | --- | --- | --- |
| 1582 | 2718, 1890, 1977, 314 | 4 disponibles | 4 disponibles | 4 disponibles |
| 1663 | 2718, 1890, 1977, 314 | 4 disponibles | 4 disponibles | 4 disponibles |

Para la Tabla 3.VI, T4 y la disponibilidad documental de A4 cuentan con evidencia técnica actual. T1–T3 conservan la revisión documental consignada en R5; no se realizó un nuevo cálculo independiente del procedimiento de composición. A1, A2, A3 y F1 no reciben una aprobación nueva en este informe: no se aportaron las revisiones pictóricas correspondientes. La disponibilidad de imágenes y la conformidad registrada en una prueba de interfaz no equivalen a una valoración artística ni institucional.

Las carpetas históricas de investigación presentan 19 rutas de archivo ausentes, tras recuperar tres copias exactas desde recursos ya instalados, verificadas por hash y tamaño. Esos faltantes no se regeneraron ni se eliminaron de los manifiestos. Se conserva la lista en `package-recovery.json`. La validación integral de esos archivos originales no se declara completada.

## 4. Prueba 2: casos funcionales

| Caso | Comprobación y evidencia | Resultado |
| --- | --- | --- |
| PF-00 | Login, ficha, lote, alternativa, zoom, dos modos de comparación, trazabilidad, tres conformidades, candidata, cambio de boceto, historial y salida; diez repeticiones | Cumple en el equipo evaluado |
| PF-01 | Accesos válidos, inválidos, incompletos e inactivos; expiración y revocación; hashes de contraseña; API loopback; secreto propio de configuración | Cumple controles ejecutados |
| PF-02 | Catálogo y fichas 1582/1663, identificación, técnica, dimensiones y fecha no documentada | Cumple |
| PF-03 | Cuatro proyecciones por lote; agotamiento, concurrencia e idempotencia; conservación del historial | Cumple |
| PF-04 | Lado a lado, superposición, zoom y restablecimiento; geometría y carga de imágenes | Cumple |
| PF-05 | Rótulo de proyección hipotética generada por IA en los visores y comparación | Cumple |
| PF-06 | Identidad, procedencia, registros originales, relaciones y consulta independiente de la imagen | Cumple |
| PF-07 | Orden de etapas, bloqueo por imagen inválida, tres conformidades y retiro en cascada | Cumple |
| PF-08 | Marcado, reemplazo y retiro de candidata; una candidata por lote; transacción con auditoría | Cumple |
| PF-09 | Historial, reapertura y cambio entre bocetos conservando lotes | Cumple |
| PF-10 | Hashes, bytes, dimensiones, importación, rollback, exportación y restauración; archivo histórico completo excluido de la aprobación actual | Cumple controles de la instalación; ver límite de archivos históricos |
| PF-11 | Se detuvo PostgreSQL temporal durante dos escrituras; API viva, sin guardado parcial; reintentos exitosos | Cumple |
| PF-12 | PF-00 por teclado; confinamiento de foco en diálogo; contraste probado | Cumple controles ejecutados; no es certificación WCAG |
| PF-13 | Diez recorridos, tiempos de presentación y RSS total; solicitudes externas bloqueadas | Cumple en el equipo evaluado y con el alcance de medición declarado |
| PF-14 | Altas, duplicados, restablecimiento, desactivación, reactivación, eliminación y última administración | Cumple |
| PF-15 | Auditoría, filtros, permisos, pertenencia y disociación de cuentas | Cumple |
| PF-16 | Sesiones con especialistas, sin ayuda ni conocimientos técnicos previos | No ejecutado: requiere participantes reales |
| PF-17 | Dimensiones y proporciones, visor, encuadre, zoom y paneo | Cumple controles ejecutados |
| PF-18 | Estados honestos de falta de datos, demo identificada y tratamiento de errores | Cumple |

La aceptación funcional manual informada por Leonel el 23/10 se conserva como antecedente. No se atribuye una nueva revisión humana a Luciana ni se presentan las ejecuciones automatizadas como observación de participantes.

## 5. Desempeño y consumo de memoria

Cada repetición restauró la misma exportación en una instancia exclusiva y reinició Electron y el servidor. Se alternaron las cuatro proyecciones de 1582 para las vistas. El tiempo se midió desde la activación hasta disponer de imágenes decodificadas y dos cuadros de presentación. Los videos conservan el recorrido; la frecuencia efectiva de captura estuvo entre 30.60 y 32.58 cuadros/s. Los registros incluyen las marcas de tiempo de cada captura y de cada acción. Es instrumentación automatizada con video complementario, no una lectura humana independiente cuadro por cuadro.

| Repetición | Lote (ms) | Detalle (ms) | Comparación (ms) | Trazabilidad (ms) | RSS máximo (MiB) |
| --- | --- | --- | --- | --- | --- |
| 1 | 4049 | 315 | 115 | 160 | 1889.50 |
| 2 | 4240 | 167 | 113 | 126 | 1612.05 |
| 3 | 4140 | 250 | 113 | 131 | 1471.19 |
| 4 | 4132 | 299 | 132 | 129 | 1694.77 |
| 5 | 4073 | 301 | 115 | 118 | 1813.56 |
| 6 | 4116 | 250 | 115 | 117 | 1774.55 |
| 7 | 4156 | 233 | 113 | 127 | 1938.88 |
| 8 | 4028 | 319 | 112 | 132 | 1792.62 |
| 9 | 4047 | 317 | 130 | 113 | 1657.42 |
| 10 | 4016 | 367 | 115 | 113 | 1675.84 |

Los máximos fueron 4.240 s para lote y 0.367, 0.132 y 0.160 s para detalle, comparación y trazabilidad. Las diez repeticiones de cada grupo quedaron debajo de 5 s y 2 s, respectivamente.

La memoria se muestreó cada segundo sumando RSS de Electron y sus procesos, el servidor y los procesos de la instancia PostgreSQL exclusiva; se excluyó el codificador de video. El máximo fue **1938.88 MiB**. Cumple frente a **2048 MiB (2 GiB)**. La cifra equivale a 2,033,057,792 bytes: no cumple si «2 GB» se interpreta como 2.000.000.000 bytes decimales. Se explicita la unidad para no cambiar el criterio después de medir.

El modo sin servicios externos se comprobó rechazando las solicitudes del renderer fuera de loopback. No se desactivó físicamente el adaptador de red del equipo. No hubo solicitudes externas en los recorridos registrados.

## 6. Prueba 3: automatización y cobertura

La suite vigente registra 74 casos de backend: 71 aprobados, ninguno fallido y 3 omitidos por precondiciones documentadas. El escritorio registra 23 aprobados. Las pruebas cubren permisos, sesiones, integridad, concurrencia, rollback, candidatas, conformidades, administración, auditoría, rutas de herramientas PostgreSQL y registro técnico sin credenciales.

La cobertura histórica R5 fue 98,09 % de líneas y sentencias, 100 % de funciones y 77,45 % de ramas. **No se recalculó cobertura para esta versión**, por lo que esos valores no se presentan como cobertura del código final. La aprobación de casos y la cobertura de líneas son medidas diferentes.

Los fallos encontrados se conservaron y las correcciones se repitieron. No se ajustaron resultados para convertir una prueba fallida u omitida en una aprobación. El validador tiene además una fixture acotada de cuatro finales reales para comprobar aceptación de archivos válidos y rechazo de bytes alterados, separada del control integral del archivo histórico.

## 7. Prueba 4: especialistas

No se aportaron consentimientos, registros de sesiones ni valoraciones de especialistas. El número de sesiones ejecutadas es cero. No corresponde afirmar cumplimiento de RNF-05, de una evaluación pictórica del panel ni de OE-7 con estas pruebas de software.

El protocolo requiere al menos tres especialistas, uno por perfil patrimonial/institucional, visual/artístico y educativo/mediación; recomienda invitar cinco. La elegibilidad, exposición previa y consentimiento deben documentarse. La sesión debe citar la versión congelada, conservar el orden ciego de las imágenes y usar la Tabla 3.VI para la valoración pictórica. La correspondencia entre códigos y ramas se mantiene separada de los materiales del participante.

Plantilla mínima de registro: código de participante; perfil y formación; fecha; versión; consentimiento; exposición previa; tarea; resultado observado; ayuda recibida; incidencia; decisión. No incluir contraseñas, nombres innecesarios ni datos de contacto en el repositorio público.

Las tareas son: ingresar y abrir 1582; obtener el lote y abrir una alternativa; comparar con el boceto; consultar trazabilidad; revisar etapas; marcar una candidata; consultar el historial y salir. Registrar lo que efectivamente hizo cada participante, sin sustituirlo por resultados de automatización. Las planillas individuales, el consentimiento y las láminas de sesión permanecen como materiales separados.

## 8. Trazabilidad de requerimientos

| Requerimiento | Caso | Estado actual |
| --- | --- | --- |
| RF-01 | PF-01 | Cumple controles ejecutados |
| RF-02 | PF-02 | Cumple controles ejecutados |
| RF-03 | PF-02 | Cumple controles ejecutados |
| RF-04 | PF-03 | Cumple controles ejecutados |
| RF-05 | PF-03 | Cumple controles ejecutados |
| RF-06 | PF-10 | Cumple controles ejecutados de la instalación vigente |
| RF-07 | PF-09 | Cumple controles ejecutados |
| RF-08 | PF-03 | Cumple controles ejecutados |
| RF-09 | PF-04 | Cumple controles ejecutados |
| RF-10 | PF-05 | Cumple controles ejecutados |
| RF-11 | PF-06 | Cumple controles ejecutados |
| RF-12 | PF-06 | Cumple controles ejecutados |
| RF-13 | PF-08 | Cumple controles ejecutados |
| RF-14 | PF-10 | Cumple controles ejecutados de la instalación vigente |
| RF-15 | PF-11 | Cumple controles ejecutados |
| RF-16 | PF-14 | Cumple controles ejecutados |
| RF-17 | PF-14 | Cumple controles ejecutados |
| RF-18 | PF-15 | Cumple controles ejecutados |
| RF-19 | PF-14 | Cumple controles ejecutados |
| RF-20 | PF-07 | Cumple controles ejecutados |
| RNF-01 | PF-01/PF-14 | Cumple controles de seguridad ejecutados |
| RNF-02 | PF-13 | Cumple sin servicios externos; red del renderer restringida |
| RNF-03 | PF-10 | Cumple integridad instalada; archivo histórico íntegro pendiente |
| RNF-04 | PF-05 | Cumple |
| RNF-05 | PF-16 | No ejecutado: especialistas |
| RNF-06 | PF-12 | Cumple teclado y contraste comprobados |
| RNF-07 | PF-17 | Cumple |
| RNF-08 | PF-11 | Cumple caída y recuperación reales |
| RNF-09 | PF-06/PF-15 | Cumple |
| RNF-10 | PF-18 | Cumple |
| RNF-11 | PF-13 | Cumple tiempos medidos en el equipo evaluado; desvío de método declarado |
| RNF-12 | PF-13 | Cumple frente a 2048 MiB en el equipo evaluado; unidad explicitada |

## 9. Incidencias y decisiones

| Incidencia | Corrección o decisión | Repetición |
| --- | --- | --- |
| Carga de imágenes grandes fallaba en Electron | Lectura mediante arrayBuffer y construcción de Blob; se preserva MIME | 91/91 imágenes decodificadas |
| Caída de PostgreSQL podía emitir error sin manejar en un cliente reservado | Manejo de errores en clientes e idle pool; registro técnico acotado | Dos interrupciones reales, rollback y recuperación aprobados |
| Herramientas de respaldo dependían de Homebrew ARM y rutas sin espacios | Detección de herramientas, PG_BIN_DIR y conversión de URL a ruta de archivos | Pruebas de rutas Windows/Mac; exportación/restauración reales |
| Acabados 2718 figuraban como No aplica en el informe viejo | Se registra el final como acabado, según asignación ya confirmada | 24 etapas aplicables disponibles |
| Se eligieron herramientas PostgreSQL 16 con un dump de 17 | Configuración explícita de PG_BIN_DIR con herramientas 17 | Restauración y recuperación aprobadas con la versión correcta |
| Archivo histórico privado incompleto | Recuperación exacta cuando la base conservaba los bytes; no se alteran manifiestos ni se inventan faltantes | Pruebas integrales afectadas omitidas y declaradas |
| Especialistas y revisiones pictóricas ausentes | Conservar como no ejecutadas; requieren evidencia humana | No corresponde repetición automatizada |

La nueva revisión conserva los criterios y hace explícitos los desvíos: hardware superior al de referencia, instrumentación automatizada de presentación, bloqueo de red del renderer en lugar de desconexión física y unidad de memoria. No se afirma una certificación externa de accesibilidad ni una aprobación artística del sistema.

## 10. Evidencia y entrega

La evidencia privada contiene los registros de cada suite, capturas de las vistas, diez videos, marcas de tiempo, muestras de memoria, recorrido por teclado, resultados de decodificación, prueba de recuperación y verificaciones de restauración. Los resultados consolidados sin material patrimonial están en `docs/validation-results.json`.

El repositorio público incluye código, migraciones, pruebas y documentación. No contiene la base de datos, imágenes del museo, archivos de importación, volcados, credenciales ni capturas patrimoniales. La exportación privada permite instalar los resultados actuales por separado, siguiendo SETUP.md.

La aplicación queda evaluada técnicamente en el alcance descrito. Continúan pendientes la evaluación real con especialistas, las revisiones pictóricas no aportadas y la verificación integral de los archivos históricos incompletos. Esos pendientes no se presentan como funcionalidades faltantes de la instalación ni como pruebas aprobadas.
