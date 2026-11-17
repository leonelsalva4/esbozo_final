import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireBackend = createRequire(path.join(root, "backend/package.json"));
const configPath = path.join(root, "data/testing/p00/backend.env");

let config;
try {
  config = requireBackend("dotenv").parse(readFileSync(configPath));
} catch {
  console.error("Falta data/testing/p00/backend.env. Prepará y verificá una copia de la base antes de iniciar las pruebas.");
  process.exit(1);
}

let database;
try {
  database = decodeURIComponent(new URL(config.DATABASE_URL).pathname.slice(1));
} catch {
  console.error("La conexión del entorno de pruebas no es válida.");
  process.exit(1);
}

if (!database.startsWith("esbozo_test_") || !config.JWT_SECRET || config.PORT !== "4000") {
  console.error("El entorno debe apuntar a una base esbozo_test_*, tener su propia clave de sesión y usar el puerto 4000.");
  process.exit(1);
}

console.log(`Entorno de pruebas: ${database}`);
const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev"], {
  cwd: root,
  env: { ...process.env, ...config },
  stdio: "inherit",
  shell: process.platform === "win32",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", () => {
  console.error("No se pudo iniciar el entorno de pruebas. Verificá que Node y npm estén instalados.");
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal === "SIGINT" ? 0 : 1);
});
