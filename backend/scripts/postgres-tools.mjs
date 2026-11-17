import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

export function postgresTool(name, options = {}) {
  if (!['pg_dump', 'pg_restore', 'createdb', 'dropdb', 'initdb', 'pg_ctl'].includes(name)) {
    throw new Error('Herramienta PostgreSQL no admitida');
  }
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const exists = options.exists ?? existsSync;
  const list = options.list ?? readdirSync;
  const paths = platform === 'win32' ? path.win32 : path.posix;
  const executable = name + (platform === 'win32' ? '.exe' : '');
  if (env.PG_BIN_DIR) {
    const target = paths.join(env.PG_BIN_DIR, executable);
    if (!exists(target)) throw new Error(`No se encontró ${executable} en PG_BIN_DIR`);
    return target;
  }
  for (const folder of (env.PATH ?? '').split(platform === 'win32' ? ';' : ':')) {
    if (folder && exists(paths.join(folder, executable))) return paths.join(folder, executable);
  }
  const candidates = [];
  if (platform === 'darwin') {
    for (const version of ['18', '17', '16']) {
      for (const prefix of ['/opt/homebrew/opt', '/usr/local/opt']) candidates.push(`${prefix}/postgresql@${version}/bin`);
    }
    candidates.push('/Applications/Postgres.app/Contents/Versions/latest/bin');
  } else if (platform === 'win32') {
    const base = paths.join(env.ProgramFiles ?? 'C:' + paths.sep + 'Program Files', 'PostgreSQL');
    if (exists(base)) {
      for (const version of list(base).filter(v => /^\d+$/.test(v)).sort((a,b) => Number(b)-Number(a))) candidates.push(paths.join(base, version, 'bin'));
    }
  } else {
    const base = '/usr/lib/postgresql';
    if (exists(base)) {
      for (const version of list(base).filter(v => /^\d+$/.test(v)).sort((a,b) => Number(b)-Number(a))) candidates.push(paths.join(base, version, 'bin'));
    }
  }
  for (const folder of candidates) {
    const target = paths.join(folder, executable);
    if (exists(target)) return target;
  }
  throw new Error(`No se encontró ${executable}. Agregá las herramientas de PostgreSQL al PATH o configurá PG_BIN_DIR.`);
}
