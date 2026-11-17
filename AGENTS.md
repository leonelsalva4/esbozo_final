# Reglas de trabajo del proyecto

## Autoría y Git

- Autores del PFI: Leonel Salva y Luciana Russo.
- Todo commit nuevo que se incluya en un push debe conservar la coautoría de Luciana mediante este trailer, separado del cuerpo por una línea en blanco:

  Co-authored-by: lucianacrusso <lurusso@uade.edu.ar>

- Antes de cada push, verificar el trailer en todos los commits nuevos que se van a subir. No reescribir historia publicada para corregir atribuciones sin una indicación expresa.
- Antes de cada push, pedir autorización al usuario y esperar su respuesta. La autorización de una tarea o de un commit no autoriza un push.
- Mantener las atribuciones del código, comentarios y documentación del producto limitadas a los integrantes reales del proyecto.

## Preservación de datos

- Conservar cambios locales, imágenes y decisiones ya registradas.
- Mantener imágenes del museo, paquetes de datos, respaldos, credenciales y capturas con material patrimonial dentro de rutas ignoradas por Git.
- No ejecutar `backend/db/schema.sql` sobre una base existente: elimina el esquema. Las actualizaciones deben utilizar migraciones no destructivas, probadas primero sobre una copia.
- Usar la base separada de pruebas para verificar operaciones que modifican datos.
- El procedimiento generativo se ejecuta fuera de la aplicación. La app consulta e importa resultados precomputados.

## Cambios de interfaz

- Conservar el login existente. No rediseñarlo ni modificar su comportamiento salvo pedido explícito del usuario.
- Antes de editar la interfaz, informar qué componentes se van a cambiar. Al terminar, indicar qué probar en cada uno y distinguir los componentes integrados de las vistas de demostración.
