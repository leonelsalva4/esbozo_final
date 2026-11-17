// Color de acento por boceto, compartido entre Home y Detalle boceto para
// que las dos pantallas usen siempre el mismo tono por sketch.id.
export const SKETCH_ACCENT: Record<string, string> = {
  "1582": "#e0a52a",
  "1663": "#9d3a34",
};

// Aspect-ratio del recuadro de imagen tal como está diseñado en Figma
// para cada pantalla — se preserva la proporción del diseño (con
// object-fit: cover) en vez de la del archivo real, que puede diferir.
export const SKETCH_HOME_IMAGE_ASPECT: Record<string, string> = {
  "1582": "450 / 290.72",
  "1663": "450 / 283.02",
};

export const SKETCH_BOCETO_IMAGE_ASPECT: Record<string, string> = {
  "1582": "636 / 414",
  "1663": "636 / 414", // sin dato propio en el Figma para 1663 todavía; se reutiliza el de 1582
};
