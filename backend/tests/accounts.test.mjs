import {before,beforeEach,after,test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {spawn} from 'node:child_process';import {createServer} from 'node:net';
import pg from 'pg';import dotenv from 'dotenv';import jwt from 'jsonwebtoken';
const config=dotenv.parse(readFileSync(new URL('../../data/testing/p00/backend.env',import.meta.url)));assert(new URL(config.DATABASE_URL).pathname.startsWith('/esbozo_test_'));
const schema=`test_accounts_${process.pid}_${Date.now()}`,source=new pg.Pool({connectionString:config.DATABASE_URL}),url=new URL(config.DATABASE_URL);url.searchParams.set('options',`-c search_path=${schema}`);const db=new pg.Pool({connectionString:url.href});let server,origin,adminToken,userToken;
const sign=(id,role)=>jwt.sign({sub:id,username:'fixture',displayName:'Fixture',role},config.JWT_SECRET,{expiresIn:'10m'});
async function request(path,method='GET',body,token=adminToken){const r=await fetch(origin+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:r.status===204?null:await r.json()};}
const accounts=(path='',method='GET',body,token)=>request('/api/accounts'+path,method,body,token);
before(async()=>{
 await source.query(`CREATE SCHEMA ${schema}`);for(const table of ['app_user','audit_log','lote','projection','system_metadata'])await source.query(`CREATE TABLE ${schema}.${table} AS TABLE public.${table}`);
 await db.query('ALTER TABLE app_user ADD PRIMARY KEY(id)');await db.query('ALTER TABLE app_user ADD UNIQUE(username)');
 await db.query('CREATE SEQUENCE user_ids START 1000');await db.query("ALTER TABLE app_user ALTER COLUMN id SET DEFAULT nextval('user_ids')");await db.query('ALTER TABLE app_user ALTER COLUMN session_version SET DEFAULT 0');
 await db.query('CREATE SEQUENCE audit_ids START 1000000');await db.query("ALTER TABLE audit_log ALTER COLUMN id SET DEFAULT nextval('audit_ids')");await db.query('ALTER TABLE audit_log ALTER COLUMN occurred_at SET DEFAULT now()');
 const net=createServer();await new Promise(resolve=>net.listen(0,'127.0.0.1',resolve));const port=net.address().port;await new Promise(resolve=>net.close(resolve));origin=`http://127.0.0.1:${port}`;
 server=spawn(process.execPath,['dist/server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,DATABASE_URL:url.href,JWT_SECRET:config.JWT_SECRET,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('No inició')),10000);server.stdout.on('data',v=>{if(String(v).includes('Backend escuchando')){clearTimeout(t);resolve();}});server.once('error',reject);});
});
beforeEach(async()=>{
 await db.query('TRUNCATE app_user,audit_log');await db.query('INSERT INTO app_user SELECT * FROM public.app_user');
 await db.query("UPDATE app_user SET role='institucional'");
 const user=(await db.query('SELECT * FROM app_user ORDER BY id LIMIT 1')).rows[0];await db.query("UPDATE app_user SET role='admin',is_active=true,session_version=0,deleted_at=NULL WHERE id=$1",[user.id]);adminToken=sign(user.id,'admin');
 const ordinary=(await db.query("INSERT INTO app_user(username,display_name,role,is_active,password_hash,session_version) VALUES('ordinaria','Fixture institucional','institucional',true,'no-login',0) RETURNING id")).rows[0];userToken=sign(ordinary.id,'institucional');
});
after(async()=>{if(server&&server.exitCode===null){server.kill();await new Promise(resolve=>server.once('exit',resolve));}await db.end();await source.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await source.end();});
test('sólo administradora activa puede consultar o crear cuentas; no se revelan hashes',async()=>{
 assert.equal((await accounts('', 'GET',undefined,userToken)).status,403);const list=await accounts();assert.equal(list.status,200);assert(!JSON.stringify(list.body).includes('password_hash'));assert.equal((await accounts('','POST',{username:'nueva',displayName:'Nueva',role:'admin'},userToken)).status,403);
});
test('alta valida campos y duplicados; credencial aleatoria autentica sin almacenarse en texto',async()=>{
 assert.equal((await accounts('','POST',{username:'',displayName:'',role:'institucional'})).status,400);
 const body={username:'consulta.nueva',displayName:'Consulta nueva',role:'institucional'},created=await accounts('','POST',body);assert.equal(created.status,200);assert(created.body.credential.length>=24);
 assert.equal((await accounts('','POST',body)).status,409);const stored=(await db.query('SELECT * FROM app_user WHERE id=$1',[created.body.account.id])).rows[0];assert(!JSON.stringify(stored).includes(created.body.credential));
 const login=await request('/api/auth/login','POST',{username:body.username,password:created.body.credential});assert.equal(login.status,200);assert.equal((await request('/api/auth/me','GET',undefined,login.body.token)).status,200);
});
test('restablecer y desactivar invalidan tokens anteriores; reactivar no los restaura',async()=>{
 const created=await accounts('','POST',{username:'sesion.prueba',displayName:'Sesión',role:'institucional'}),id=created.body.account.id;
 const login=await request('/api/auth/login','POST',{username:'sesion.prueba',password:created.body.credential});assert.equal(login.status,200);
 const reset=await accounts(`/${id}/credential`,'POST',{});assert.equal(reset.status,200);assert.notEqual(reset.body.credential,created.body.credential);assert.equal((await request('/api/auth/me','GET',undefined,login.body.token)).status,401);
 const next=await request('/api/auth/login','POST',{username:'sesion.prueba',password:reset.body.credential});assert.equal(next.status,200);
 assert.equal((await accounts(`/${id}/state`,'PATCH',{active:false})).status,200);assert.equal((await request('/api/auth/me','GET',undefined,next.body.token)).status,403);assert.equal((await accounts(`/${id}/state`,'PATCH',{active:true})).status,200);assert.equal((await request('/api/auth/me','GET',undefined,next.body.token)).status,401);
});
test('última administradora activa no se puede desactivar ni eliminar',async()=>{
 const admin=(await db.query("SELECT id,username FROM app_user WHERE role='admin'")).rows[0];assert.equal((await accounts(`/${admin.id}/state`,'PATCH',{active:false})).status,409);assert.equal((await accounts(`/${admin.id}`,'DELETE',{confirmation:admin.username})).status,409);assert.equal((await db.query('SELECT count(*) FROM audit_log')).rows[0].count,'0');
});
test('eliminar exige confirmación y disocia identidad conservando operaciones',async()=>{
 const row=(await db.query("SELECT id,username FROM app_user WHERE username='ordinaria'")).rows[0];await db.query("INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES($1,'session.login','app_user',$2)",[row.id,String(row.id)]);
 assert.equal((await accounts(`/${row.id}`,'DELETE',{confirmation:'otra'})).status,400);assert.equal((await accounts(`/${row.id}`,'DELETE',{confirmation:row.username})).status,200);
 const user=(await db.query('SELECT * FROM app_user WHERE id=$1',[row.id])).rows[0];assert.equal(user.display_name,'Cuenta eliminada');assert.notEqual(user.username,row.username);assert(user.deleted_at);assert.equal((await request('/api/auth/me','GET',undefined,userToken)).status,403);assert.equal((await db.query('SELECT count(*) FROM audit_log WHERE user_id=$1',[row.id])).rows[0].count,'1');assert(!(await accounts()).body.accounts.some(a=>a.id===row.id));
});
test('fallo de auditoría revierte el alta completa',async()=>{
 await db.query("ALTER TABLE audit_log ADD CONSTRAINT block_create CHECK(action<>'account.create') NOT VALID");
 try{assert.equal((await accounts('','POST',{username:'rollback',displayName:'Fixture',role:'institucional'})).status,503);assert.equal((await db.query("SELECT count(*) FROM app_user WHERE username='rollback'")).rows[0].count,'0');}finally{await db.query('ALTER TABLE audit_log DROP CONSTRAINT block_create');}
});

test('registro institucional limita actividad y oculta identificadores de accesos fallidos',async()=>{
 const ordinary=(await db.query("SELECT id FROM app_user WHERE username='ordinaria'")).rows[0];
 await db.query("INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES($1,'session.login','app_user',$2)",[ordinary.id,String(ordinary.id)]);
 await db.query("INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES(NULL,'session.login_failed','app_user','identificador-privado')");
 const personal=await request('/api/operations','GET',undefined,userToken);assert.equal(personal.status,200);assert.equal(personal.body.total,1);
 const all=await request('/api/operations');assert.equal(all.status,200);assert.equal(all.body.total,2);assert(!JSON.stringify(all.body).includes('identificador-privado'));assert.equal(all.body.rows.find(r=>r.action==='session.login_failed').display_name,'Sin cuenta autenticada');
 assert.equal((await request('/api/operations?page=-1')).status,400);assert.equal((await request('/api/operations?inventory=no-existe')).body.total,0);
});

test('filtro de fechas valida calendario y usa el día local de Argentina',async()=>{
 for(const date of ['2026-02-31','2026-13-01','0000-01-01'])assert.equal((await request('/api/operations?from='+date)).status,400);
 assert.equal((await request('/api/operations?from=2026-10-19&to=2026-10-18')).status,400);
 const user=(await db.query("SELECT id FROM app_user WHERE username='ordinaria'")).rows[0];
 for(const date of ['2026-10-18T02:59:59Z','2026-10-18T03:00:00Z','2026-10-19T02:59:59Z','2026-10-19T03:00:00Z'])await db.query("INSERT INTO audit_log(user_id,action,entity_type,entity_id,occurred_at) VALUES($1,'session.login','app_user',$2,$3)",[user.id,String(user.id),date]);
 const rows=(await request('/api/operations?from=2026-10-18&to=2026-10-18')).body;assert.equal(rows.total,2);assert(rows.rows.every(r=>r.resource_label==='ordinaria'));
});
test('el registro disocia también recursos afectados por una cuenta eliminada',async()=>{
 const user=(await db.query("SELECT id FROM app_user WHERE username='ordinaria'")).rows[0];
 await db.query("INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES(NULL,'session.login_failed','app_user','ORDINARIA')");
 assert.equal((await accounts('/'+user.id,'DELETE',{confirmation:'ordinaria'})).status,200);
 const rows=(await request('/api/operations')).body.rows;assert.equal(rows.find(r=>r.action==='account.delete').resource_label,'Cuenta eliminada');
 assert.equal((await db.query("SELECT entity_id FROM audit_log WHERE action='session.login_failed'")).rows[0].entity_id,String(user.id));
});
test('Acerca informa versiones reales sin exponer configuración privada',async()=>{
 const result=await request('/api/system/about');assert.equal(result.status,200);assert.equal(result.body.applicationVersion,JSON.parse(readFileSync(new URL('../../package.json',import.meta.url))).version);assert.equal(result.body.dossierSchemaVersion,'2');assert(!JSON.stringify(result.body).includes('DATABASE_URL'));
});

test('el usuario institucional consulta decisiones compartidas sin acceder a administración ajena',async()=>{
 const admin=(await db.query("SELECT id FROM app_user WHERE role='admin'")).rows[0];
 await db.query("INSERT INTO audit_log(user_id,action,entity_type,entity_id,payload) VALUES($1,'candidate.set','lote','LOT-1582-L01',$2)",[admin.id,JSON.stringify({projection_id:'PRJ-1582-L01-A02'})]);
 await db.query("INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES($1,'account.create','app_user','1000')",[admin.id]);
 const result=await request('/api/operations','GET',undefined,userToken);assert.equal(result.status,200);assert.equal(result.body.total,1);assert.equal(result.body.rows[0].projection_id,'PRJ-1582-L01-A02');assert.equal(result.body.rows[0].resource_label,'Alternativa 2 · 1890');
});

test('registro por alternativa mantiene pertenencia al lote y excluye decisiones de otras alternativas',async()=>{
 const admin=(await db.query("SELECT id FROM app_user WHERE role='admin'")).rows[0];
 for(const id of ['PRJ-1582-L01-A02','PRJ-1582-L01-A03'])await db.query("INSERT INTO audit_log(user_id,action,entity_type,entity_id,payload) VALUES($1,'candidate.set','lote','LOT-1582-L01',$2)",[admin.id,JSON.stringify({projection_id:id})]);
 const result=await request('/api/operations?inventory=1582&lot=LOT-1582-L01&projection=PRJ-1582-L01-A02','GET',undefined,userToken);assert.equal(result.status,200);assert.equal(result.body.total,1);assert.equal(result.body.rows[0].projection_id,'PRJ-1582-L01-A02');
 assert.equal((await request('/api/operations?lot=LOT-1663-L01&projection=PRJ-1582-L01-A02')).body.total,0);
 assert.equal((await request('/api/operations?projection[]=PRJ-1582-L01-A02')).status,400);
});

test('fallos asincrónicos de consulta y auditoría no detienen el servidor ni revelan SQL',async()=>{
 const missing=await request('/api/sketches');assert.equal(missing.status,503);assert(!JSON.stringify(missing.body).includes('relation'));assert.equal((await request('/api/auth/me')).status,200);
 await db.query("ALTER TABLE audit_log ADD CONSTRAINT block_logout CHECK(action<>'session.logout') NOT VALID");
 try{assert.equal((await request('/api/auth/logout','POST')).status,503);assert.equal((await request('/api/auth/me')).status,200);}finally{await db.query('ALTER TABLE audit_log DROP CONSTRAINT block_logout');}
 const malformed=await fetch(origin+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{incorrecto'});assert.equal(malformed.status,400);assert.equal(typeof(await malformed.json()).error,'string');assert.equal((await request('/api/auth/me')).status,200);
});

test('PF-15: filtros inválidos se rechazan y el catálogo de filtros conserva los dos bocetos',async()=>{
 const filters=await request('/api/operations/filters');assert.equal(filters.status,200);assert.equal(filters.body.lots.length,2);
 assert.equal((await request('/api/operations?action='+('x'.repeat(81)))).status,400);assert.equal((await request('/api/operations?inventory[]=1582')).status,400);
});
