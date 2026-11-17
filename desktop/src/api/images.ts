// Leer primero los bytes evita fallos de response.blob() en Electron con imágenes grandes.
// El archivo original y su tipo MIME se conservan; el servidor sigue verificando su integridad.
export async function readImageBlob(response: Response): Promise<Blob> {
  if (!response.ok) throw response;
  const bytes = await response.arrayBuffer();
  return new Blob([bytes], { type: response.headers.get("Content-Type") ?? "application/octet-stream" });
}
