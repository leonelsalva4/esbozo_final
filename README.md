# Esbozo

Proyecto Final Integrador de Ingeniería en Informática de **Leonel Salva y Luciana Russo**.

Aplicación de escritorio para consultar, comparar y revisar proyecciones hipotéticas de bocetos de Benito Quinquela Martín. Las imágenes se producen previamente fuera de la aplicación con FLUX.2 [klein] Base 9B y una adaptación LoRA propia. Son imágenes generadas por inteligencia artificial, no obras auténticas ni restauraciones.

Cada boceto tiene lotes de cuatro proyecciones. La aplicación permite comparar imágenes con zoom sincronizado y superposición, consultar la procedencia, revisar las etapas y conservar una candidata por lote. Las conformidades, candidaturas y acciones sobre cuentas quedan auditadas.

## Requisitos

- Windows o macOS con Node.js 24 y npm.
- PostgreSQL local. La validación de la entrega se realiza con PostgreSQL 17.
- Exportación privada de instalación: `esbozo.dump` y su `VERIFICACION.json`, provistos por los autores.

El repositorio público contiene el código, las migraciones y las pruebas. **No incluye imágenes del museo, datos de investigación, cuentas, contraseñas ni una base de datos.** Clonar el repositorio e instalar dependencias no carga los resultados. El paquete privado se entrega por separado según las condiciones de uso del material.

## Inicio rápido

Desde la carpeta del proyecto, en Terminal (macOS) o PowerShell (Windows):

```sh
npm ci
npm ci --prefix backend
npm ci --prefix desktop
```

Preparar `backend/.env`, crear una base nueva y restaurar el paquete privado siguiendo [SETUP.md](SETUP.md). Después:

```sh
npm run dev
```

Se abren la API local en el puerto 4000 y la ventana de Electron. PostgreSQL usa habitualmente el puerto 5432; es un servicio independiente. Durante el uso normal no se necesita Internet ni una GPU. La instalación de dependencias sí requiere conexión.

## Verificación y distribución

```sh
npm run build --prefix backend
npm run build --prefix desktop
npm run lint --prefix desktop
npm run test:unit
npm test
npm run package:local
```

`test:unit` no necesita los datos privados. `npm test` incluye pruebas de integración que requieren una copia separada de la base y el paquete de resultados: ver [SETUP.md](SETUP.md). Las pruebas con escrituras nunca deben apuntar a la base de uso.

La distribución para la plataforma actual se genera en `release/`. El ejecutable y la base se distribuyen por separado; la conexión se configura en cada equipo. La aplicación no realiza generación, inferencia ni entrenamiento.

El alcance y los resultados de la entrega están en [el informe de validación](docs/VALIDACION_FINAL.md), con el detalle de las pruebas omitidas y las evaluaciones humanas pendientes.
