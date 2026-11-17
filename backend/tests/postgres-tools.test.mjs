import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postgresTool } from '../scripts/postgres-tools.mjs';

test('Windows: PG_BIN_DIR conserva espacios y utiliza ejecutables .exe', () => {
  const file = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_restore.exe';
  assert.equal(postgresTool('pg_restore', { platform:'win32', env:{PG_BIN_DIR:'C:\\Program Files\\PostgreSQL\\18\\bin'}, exists:p=>p===file }), file);
});
test('una ruta explícita inválida se informa sin elegir otra versión', () => {
  assert.throws(()=>postgresTool('pg_dump',{env:{PG_BIN_DIR:'/inexistente'},exists:()=>false}), /PG_BIN_DIR/);
});
test('se prefiere el PATH y se detecta Homebrew en Mac Intel', () => {
  assert.equal(postgresTool('pg_dump',{platform:'darwin',env:{PATH:'/custom/bin'},exists:p=>p==='/custom/bin/pg_dump'}),'/custom/bin/pg_dump');
  assert.equal(postgresTool('pg_restore',{platform:'darwin',env:{},exists:p=>p==='/usr/local/opt/postgresql@17/bin/pg_restore'}),'/usr/local/opt/postgresql@17/bin/pg_restore');
});
test('Windows: el instalador se detecta sin asumir una letra extra ni una versión fija', () => {
  const base='C:\\Program Files\\PostgreSQL', expected=base+'\\18\\bin\\createdb.exe';
  assert.equal(postgresTool('createdb',{platform:'win32',env:{},exists:p=>p===base||p===expected,list:()=>['17','18','README.txt']}),expected);
});
test('la ausencia de herramientas y los nombres desconocidos se rechazan', () => {
  assert.throws(()=>postgresTool('pg_dump',{platform:'darwin',env:{},exists:()=>false}),/PATH/);
  assert.throws(()=>postgresTool('comando-ajeno'),/no admitida/);
});
