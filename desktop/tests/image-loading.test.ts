import { test } from "node:test";
import assert from "node:assert/strict";
import { readImageBlob } from "../src/api/images";

test("una imagen grande conserva sus bytes y MIME aunque falle la lectura blob directa", async () => {
  const bytes = new Uint8Array(12 * 1024 * 1024);
  bytes[0] = 255; bytes[1] = 216; bytes[bytes.length - 1] = 217;
  const response = new Response(bytes, { headers: { "Content-Type": "image/jpeg" } });
  response.blob = async () => { throw new TypeError("Failed to fetch"); };
  const image = await readImageBlob(response);
  assert.equal(image.type, "image/jpeg");
  assert.equal(image.size, bytes.length);
  assert.deepEqual(new Uint8Array(await image.arrayBuffer()), bytes);
});

test("un error HTTP conserva la respuesta y no se convierte en imagen", async () => {
  const response = new Response("recurso no disponible", { status: 422 });
  await assert.rejects(readImageBlob(response), error => error === response);
  assert.equal(response.bodyUsed, false);
});

test("una descarga interrumpida propaga el error sin crear un recurso parcial", async () => {
  const interrupted = new DOMException("Descarga cancelada", "AbortError");
  const body = new ReadableStream({ start(controller) { controller.error(interrupted); } });
  await assert.rejects(readImageBlob(new Response(body)), error => error === interrupted);
});
