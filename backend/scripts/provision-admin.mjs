import {readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';
import argon2 from 'argon2';
const root=new URL('../../',import.meta.url),test=process.argv.includes('--test');
const option=name=>process.argv.find(arg=>arg.startsWith(`--${name}=`))?.slice(name.length+3);
const username=option('username'),displayName=option('display-name');
if(!username||!displayName||!/^[a-zA-Z0-9._-]{3,64}$/.test(username)||displayName.length>120)throw Error('Indicá --username=nombre --display-name="Nombre visible"');
if(!test&&!process.argv.includes('--apply'))throw Error('Elegí --test o --apply');
const config=dotenv.parse(readFileSync(new URL(test?'data/testing/p00/backend.env':'backend/.env',root)));
if(test&&!new URL(config.DATABASE_URL).pathname.startsWith('/esbozo_test_'))throw Error('Sólo copia de pruebas');
const pool=new pg.Pool({connectionString:config.DATABASE_URL}),client=await pool.connect();
try{
 await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(723184602)');
 if((await client.query("SELECT id FROM app_user WHERE role='admin' AND is_active AND deleted_at IS NULL")).rowCount)throw Error('Ya hay administración activa: usá la pantalla de cuentas.');
 const credential=randomBytes(18).toString('base64url');
 const user=(await client.query("INSERT INTO app_user(username,display_name,role,is_active,password_hash) VALUES($1,$2,'admin',true,$3) RETURNING id",[username,displayName,await argon2.hash(credential)])).rows[0];
 await client.query("INSERT INTO audit_log(user_id,action,entity_type,entity_id,payload) VALUES(NULL,'account.bootstrap','app_user',$1,$2)",[String(user.id),JSON.stringify({method:'local_provisioning'})]);
 await client.query('COMMIT');console.log(JSON.stringify({username,credential,notice:'Conservá la credencial: no se puede recuperar de la base.'}));
}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}
