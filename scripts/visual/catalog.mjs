import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const directory = path.join(root, "data/references/mockups-v1/catalog");
const read = (name) => JSON.parse(readFileSync(path.join(directory, name), "utf8"));
const references = read("references.json").references;
const scenarios = read("scenarios.json").scenarios;
const fixtures = read("fixtures.json");
const resources = read("resources.json").resources;
const measurements = read("measurements.json").screens;
const landmarks = read("landmarks.json").screens;
const texts = read("screen-texts.json").screens;
const interactions = read("interactions.json").screens;
const textMeasurements = read("text-measurements.json").screens;
const localPath = path.join(root, "data/testing/p01/local-resource-paths.json");
const localResources = existsSync(localPath) ? JSON.parse(readFileSync(localPath, "utf8")) : {};
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function byId(list, id) {
  const result = list.find((item) => item.id === id);
  assert(result, `No existe la referencia ${id}.`);
  return result;
}

function resolve(id) {
  const scenario = structuredClone(byId(scenarios, id));
  const reference = byId(references, scenario.referenceId);
  const data = structuredClone(fixtures);
  const state = scenario.state;
  data.candidate = state.candidate ? { ...data.candidate, projectionId: state.candidate } : null;
  data.lot.state = state.sketchId === "1582" ? state.lotState : "obtained";
  if (data.lot.state === "available") {
    data.lot.obtainedAt = null;
    data.lot.obtainedBy = null;
  }
  for (const projection of data.lot.projections) {
    projection.fixtureResourceState = state.missingFinalAssets?.includes(projection.asset) ? "missing" : "expected";
    for (const stage of projection.stages) {
      stage.fixtureResourceState = !stage.applicable ? "not-applicable" : stage.asset === state.missingStageAsset ? "missing" : "expected";
    }
  }
  const required = scenario.requiredAssets.map((id) => {
    const resource = byId(resources, id);
    return { id, status: resource.status, path: resource.path };
  });
  return {
    purpose: "reference-fixture-only",
    productionImportAllowed: false,
    scenario,
    reference,
    data,
    text: byId(texts, id).content,
    interactions: byId(interactions, id),
    geometry: byId(landmarks, id),
    requiredResources: required,
    missingOriginals: required.filter((item) => item.status === "not-delivered-as-original").map((item) => item.id),
    applicationMount: "pending",
    pixelComparisonExecuted: false,
  };
}

function check() {
  assert(fixtures.purpose === "reference-fixtures-only" && fixtures.productionImportAllowed === false, "Los fixtures no pueden autorizar importaciones reales.");
  assert(fixtures.id === "reference-main", "Identificador de fixture desconocido.");
  const expected = new Set(references.map((item) => item.id));
  assert(expected.size === 61 && references.length === 61, "El paquete debe tener 61 referencias únicas.");
  for (const [name, collection] of Object.entries({ scenarios, measurements, landmarks, texts, interactions, textMeasurements })) {
    const ids = new Set(collection.map((item) => item.id));
    assert(collection.length === expected.size && ids.size === expected.size, `${name}: IDs duplicados o cantidad incorrecta.`);
    assert([...expected].every((id) => ids.has(id)), `${name}: falta una referencia.`);
  }
  const resourceIds = new Set(resources.map((item) => item.id));
  assert(resources.length === resourceIds.size, "Hay recursos duplicados.");
  const projectionIds = new Set(fixtures.lot.projections.map((item) => item.id));
  const positions = fixtures.lot.projections.map((item) => item.position).sort();
  assert(JSON.stringify(positions) === "[1,2,3,4]", "Las posiciones de las alternativas no son 1–4.");
  assert(fixtures.lot.projections.map((item) => item.branch).join(",") === "2718,1890,1977,314", "El orden de ramas no coincide con el ZIP.");
  for (const projection of fixtures.lot.projections) {
    let pending = false;
    for (const stage of projection.stages) {
      assert(stage.applicable || (!stage.asset && !stage.reviewed), `${projection.id}: una etapa No aplica tiene imagen o conformidad.`);
      if (!stage.applicable) continue;
      assert(!(pending && stage.reviewed), `${projection.id}: conformidad fuera de orden.`);
      if (!stage.reviewed) pending = true;
    }
  }
  for (const reference of references) {
    const filename = path.join(root, reference.path);
    assert(existsSync(filename), `Falta el patrón local ${reference.file}.`);
    const buffer = readFileSync(filename);
    assert(digest(buffer) === reference.sha256, `Cambió el PNG ${reference.id}.`);
    assert(buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${reference.id}: no es PNG.`);
    assert(buffer.readUInt32BE(16) === reference.width && buffer.readUInt32BE(20) === reference.height, `${reference.id}: dimensiones distintas.`);
    const scenario = byId(scenarios, reference.id);
    assert(JSON.stringify(scenario.capture) === JSON.stringify(reference.capture), `${reference.id}: configuración de captura inconsistente.`);
    assert(scenario.fixture === fixtures.id, `${reference.id}: fixture inexistente.`);
    assert(scenario.requiredAssets.every((id) => resourceIds.has(id)), `${reference.id}: recurso no catalogado.`);
    if (scenario.state.projectionId) assert(projectionIds.has(scenario.state.projectionId), `${reference.id}: alternativa inexistente.`);
    if (scenario.state.candidate) {
      const selected = fixtures.lot.projections.find((item) => item.id === scenario.state.candidate);
      assert(selected?.stages.every((stage) => !stage.applicable || stage.reviewed), `${reference.id}: candidata sin conformidades.`);
    }
    if (scenario.state.sketchId === "1663") {
      assert(!scenario.state.lotId && !scenario.state.candidate && !scenario.state.projectionId, `${reference.id}: asignación pendiente cruzada con un lote del 1582.`);
    }
    const transcript = byId(texts, reference.id).content;
    assert(transcript.length > 0 && transcript.every((text) => typeof text === "string" && text.length > 0), `${reference.id}: transcripción inválida.`);
    const geometry = byId(measurements, reference.id);
    assert(geometry.regions.length > 0, `${reference.id}: no tiene mediciones.`);
    for (const region of geometry.regions) {
      assert(region.x >= 0 && region.y >= 0 && region.x + region.width <= reference.width && region.y + region.height <= reference.height, `${reference.id}: región fuera del PNG.`);
    }
    const mounted = resolve(reference.id);
    assert(mounted.productionImportAllowed === false && mounted.pixelComparisonExecuted === false, `${reference.id}: estado de comprobación incorrecto.`);
  }
  let verifiedLocalResources = 0;
  const unresolvedLocalResources = [];
  for (const resource of resources.filter((item) => item.sha256)) {
    const filename = resource.path ? path.join(root, resource.path) : localResources[resource.id];
    if (!filename || !existsSync(filename)) {
      unresolvedLocalResources.push(resource.id);
      continue;
    }
    assert(digest(readFileSync(filename)) === resource.sha256, `Cambió el recurso ${resource.id}.`);
    verifiedLocalResources++;
  }
  const summary = {
    references: references.length,
    scenarios: scenarios.length,
    measuredRegions: measurements.reduce((total, screen) => total + screen.regions.length, 0),
    canonicalTextOccurrences: texts.reduce((total, screen) => total + screen.content.length, 0),
    matchedTextBoxes: textMeasurements.reduce((total, screen) => total + screen.textBoxes.length, 0),
    interactionContracts: interactions.reduce((total, screen) => total + screen.actions.length, 0),
    verifiedLocalResources,
    unresolvedLocalResources,
    missingOriginals: resources.filter((item) => item.status === "not-delivered-as-original").length,
    applicationScreenshotsCompared: 0,
    databaseWrites: 0,
  };
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

try {
  const [command = "check", id] = process.argv.slice(2);
  if (command === "check") check();
  else if (command === "show") {
    assert(id, "Indicá un ID, por ejemplo E07.");
    console.log(JSON.stringify(resolve(id), null, 2));
  } else if (command === "prepare") {
    const summary = check();
    const target = path.join(root, "data/testing/p01/scenarios");
    mkdirSync(target, { recursive: true });
    for (const scenario of scenarios) writeFileSync(path.join(target, scenario.id + ".json"), JSON.stringify(resolve(scenario.id), null, 2) + "\n");
    writeFileSync(path.join(target, "catalog-check.json"), JSON.stringify(summary, null, 2) + "\n");
    console.log("Escenarios preparados en data/testing/p01/scenarios/. No se modificó la base ni se montaron pantallas de producto.");
  } else throw new Error("Usá check, show ID o prepare.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
