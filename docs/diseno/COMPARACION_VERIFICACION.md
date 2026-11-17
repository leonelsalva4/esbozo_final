> Documento histórico de implementación. Para instalar la entrega vigente, consultar README.md y SETUP.md; el estado de validación actual se informa en VALIDACION_FINAL.md.

# Comparación — estado del 23 de octubre

Autores: Leonel Salva y Luciana Russo.

Se integraron las composiciones de E08, E09, N42 y N45: comparación lado a lado, superposición con divisor, selector de cuatro ramas y estado de imagen no disponible con reintento. La interfaz adapta alturas y espacios para el formato 1366×768. No se cambia el boceto ni se reutiliza la imagen anterior mientras se recupera otra alternativa.

El zoom compartido va de 60 a 200 por ciento. El paneo se limita al contenido real, considerando márgenes y proporciones. Restablecer centra las imágenes y devuelve el divisor a la mitad. El divisor admite puntero y teclado. Si falta un recurso, la superposición no presenta una comparación parcial como válida.

Comprobaciones: compilación y lint del frontend; cuatro pruebas de geometría sobre centrado, límites, proporciones diferentes y cambio de tamaño. Pendiente: captura y prueba interactiva en navegador autorizado. El control de navegador rechazó localhost; estas verificaciones no certifican identidad visual.

Qué probar: alternar ambos modos, recorrer las cuatro ramas de ambos bocetos, acercar y arrastrar cada imagen, reducir zoom, restablecer, mover el divisor con puntero y flechas, y verificar la vista compacta. El caso de recurso ausente sólo debe prepararse en un esquema temporal de pruebas. No alterar imágenes de la base principal para reproducirlo.
