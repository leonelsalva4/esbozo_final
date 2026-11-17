export interface Pan { x: number; y: number }
// Coordenadas proporcionales al visor; el encuadre se limita al área real
// de todas las imágenes sincronizadas, incluyendo sus márgenes de ajuste.
export function clampComparisonPan(pan: Pan, zoom: number, width: number, height: number, images: { width: number; height: number }[]): Pan {
  if (zoom <= 1 || width <= 0 || height <= 0 || !images.length) return { x: 0, y: 0 };
  let maxX = Infinity, maxY = Infinity;
  for (const image of images) {
    if (image.width <= 0 || image.height <= 0) return { x: 0, y: 0 };
    const scale = Math.min(width / image.width, height / image.height);
    maxX = Math.min(maxX, Math.max(0, (image.width * scale * zoom - width) / (2 * width)));
    maxY = Math.min(maxY, Math.max(0, (image.height * scale * zoom - height) / (2 * height)));
  }
  return { x: Math.max(-maxX, Math.min(maxX, pan.x)), y: Math.max(-maxY, Math.min(maxY, pan.y)) };
}
