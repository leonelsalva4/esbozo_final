import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "./db.js";

// Carga histórica de bocetos desde data/sketches/. Para la instalación vigente, usar la exportación verificada.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data/sketches");

interface SketchSeed {
  id: string;
  filename: string;
  width: number;
  height: number;
  title: string;
  series: string;
  author: string;
  dateDocumented: string;
  technique: string;
  dimensionsCm: string;
  provenance: string;
}

const sketches: SketchSeed[] = [
  {
    id: "1582",
    filename: "1582_cargadores_naranjas.jpg",
    width: 7019,
    height: 5100,
    title: "Sin título",
    series: "Cargadores de naranjas. Sello n.° 44",
    author: "Benito Quinquela Martín",
    dateDocumented: "Sin fecha documentada",
    technique: "Lápiz sobre papel",
    dimensionsCm: "20,5 × 28,5 cm",
    provenance: "Museo Benito Quinquela Martín",
  },
  {
    id: "1663",
    filename: "1663_embarque_cereales.jpg",
    width: 3509,
    height: 2550,
    title: "Sin título",
    series: "Embarque de cereales. Sello n.° 85",
    author: "Benito Quinquela Martín",
    dateDocumented: "Sin fecha documentada",
    technique: "Lápiz sobre papel",
    dimensionsCm: "20,5 × 28,5 cm",
    provenance: "Museo Benito Quinquela Martín",
  },
];

async function main() {
  for (const s of sketches) {
    const filePath = path.join(DATA_DIR, s.filename);

    if (!existsSync(filePath)) {
      console.error(
        `✗ No se encontró ${s.filename} en ${DATA_DIR}\n` +
          `  Bajalo de Drive y colocalo ahí antes de correr este script.`
      );
      process.exit(1);
    }

    const data = readFileSync(filePath);
    const sha256 = createHash("sha256").update(data).digest("hex");
    const assetId = `AST-SKETCH-${s.id}`;
    const filename = s.filename;

    await pool.query(
      `INSERT INTO asset (id, kind, filename, mime_type, width, height, byte_size, sha256)
       VALUES ($1, 'sketch', $2, 'image/jpeg', $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         filename = EXCLUDED.filename, sha256 = EXCLUDED.sha256,
         byte_size = EXCLUDED.byte_size`,
      [assetId, filename, s.width, s.height, data.length, sha256]
    );

    await pool.query(
      `INSERT INTO asset_blob (asset_id, data) VALUES ($1, $2)
       ON CONFLICT (asset_id) DO UPDATE SET data = EXCLUDED.data`,
      [assetId, data]
    );

    await pool.query(
      `INSERT INTO sketch (id, title, series, author, date_documented, technique, dimensions_cm, provenance, asset_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title, series = EXCLUDED.series, author = EXCLUDED.author,
         date_documented = EXCLUDED.date_documented, technique = EXCLUDED.technique,
         dimensions_cm = EXCLUDED.dimensions_cm, provenance = EXCLUDED.provenance,
         asset_id = EXCLUDED.asset_id`,
      [s.id, s.title, s.series, s.author, s.dateDocumented, s.technique, s.dimensionsCm, s.provenance, assetId]
    );

    console.log(`✓ ${s.id}: ${filename} (${(data.length / 1024 / 1024).toFixed(1)} MB, sha256 ${sha256.slice(0, 12)}…)`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
