const { readFileSync, existsSync } = require('node:fs');
const { createRequire } = require('node:module');
const { randomBytes } = require('node:crypto');
const net = require('node:net');
const path = require('node:path');

async function portAvailable(port) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); resolve(false); });
    socket.once('error', error => { socket.destroy(); if (error.code === 'ECONNREFUSED') resolve(true); else reject(error); });
    socket.setTimeout(1500, () => { socket.destroy(); reject(new Error('No se pudo comprobar el puerto local.')); });
  });
}
async function startBackend({ backendDir, configPath, appVersion, spawnChild, request = fetch, timeoutMs = 20000, expectedPort = 4000, available = portAvailable }) {
  if (!existsSync(configPath)) throw new Error(`Falta la configuración local de Esbozo: ${configPath}. La instalación debe indicar DATABASE_URL y JWT_SECRET. No se modificó la base.`);
  const load = createRequire(path.join(backendDir, 'package.json'));
  const config = load('dotenv').parse(readFileSync(configPath));
  if (!config.DATABASE_URL || !config.JWT_SECRET || config.JWT_SECRET.length < 32) throw new Error('Revisá DATABASE_URL y JWT_SECRET en la configuración local. El secreto de sesión debe tener al menos 32 caracteres.');
  const port = Number(config.PORT || 4000);
  if (port !== expectedPort) throw new Error('La aplicación de escritorio utiliza el puerto local 4000. Revisá PORT en la configuración.');
  if (!await available(port)) throw new Error('El puerto local 4000 está ocupado. Cerrá la otra instancia o el servidor de desarrollo antes de abrir Esbozo.');
  const instanceId = randomBytes(24).toString('hex');
  const child = spawnChild(path.join(backendDir, 'dist/server.js'), {
    ...process.env, ...config, NODE_ENV: 'production', PORT: String(port),
    DOTENV_CONFIG_PATH: configPath, ESBOZO_APP_VERSION: appVersion, ESBOZO_INSTANCE_ID: instanceId,
  });
  let exited = false, stopped = false;
  child.once('exit', () => { exited = true; });
  child.once('error', () => { exited = true; });
  const stop = () => { if (!stopped) { stopped = true; if (!exited) child.kill(); } };
  const started = Date.now();
  try {
    while (Date.now() - started < timeoutMs) {
      if (exited) throw new Error('El servidor local no pudo iniciar. Revisá la configuración de la instalación. No se modificó la base.');
      let health;
      try { const response = await request(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500), cache: 'no-store' }); if (response.ok) health = await response.json(); }
      catch { /* La base puede tardar unos instantes en responder durante el arranque. */ }
      if (health) {
        if (health.instanceId !== instanceId) throw new Error('La respuesta corresponde a otro servidor local. Cerrá esa instancia antes de continuar.');
        if (!health.ready) throw new Error('La base de Esbozo necesita una actualización de instalación. Conservá el respaldo y aplicá las migraciones indicadas en SETUP.md.');
        return { child, stop };
      }
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    throw new Error('No se pudo conectar con PostgreSQL. Comprobá que el servicio esté iniciado y que la configuración local sea correcta. No se modificaron los datos.');
  } catch (error) { stop(); throw error; }
}
module.exports = { startBackend };
