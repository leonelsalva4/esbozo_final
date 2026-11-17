import { randomBytes } from "node:crypto";
import { Router, type Request, type Response } from "express";
import argon2 from "argon2";
import type { PoolClient } from "pg";
import { pool } from "../db.js";
import { requireAuth } from "../auth.js";
export const accountsRouter=Router();
accountsRouter.use(requireAuth);
const columns="id,username,display_name,role,is_active,last_login_at";
class AccountError extends Error { constructor(public status:number,message:string){super(message);} }
async function transaction(req:Request,res:Response,operation:(client:PoolClient)=>Promise<unknown>){
 let client:PoolClient|undefined;
 try{
  client=await pool.connect();await client.query('BEGIN');
  // Serializa los cambios de cuentas y la protección de la última administradora activa.
  await client.query('SELECT pg_advisory_xact_lock(723184602)');
  const actor=(await client.query('SELECT role,is_active,deleted_at FROM app_user WHERE id=$1 FOR UPDATE',[req.user!.sub])).rows[0];
  if(actor?.role!=='admin'||!actor.is_active||actor.deleted_at)throw new AccountError(403,'Esta operación requiere una cuenta administradora activa.');
  const result=await operation(client);await client.query('COMMIT');res.set('Cache-Control','no-store').json(result);
 }catch(error){if(client)await client.query('ROLLBACK').catch(()=>undefined);res.status(error instanceof AccountError?error.status:(error as {code?:string}).code==='23505'?409:503).json({error:error instanceof AccountError?error.message:(error as {code?:string}).code==='23505'?'Este nombre de usuario ya existe. Elegí otro.':'No se pudo completar la operación. No se guardaron cambios.'});}
 finally{client?.release();}
}
async function audit(client:PoolClient,req:Request,action:string,id:number){await client.query("INSERT INTO audit_log(user_id,action,entity_type,entity_id) VALUES($1,$2,'app_user',$3)",[req.user!.sub,action,String(id)]);}
async function target(client:PoolClient,id:string){if(!/^\d+$/.test(id))throw new AccountError(400,'Cuenta inválida.');const row=(await client.query('SELECT * FROM app_user WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[id])).rows[0];if(!row)throw new AccountError(404,'Cuenta no disponible.');return row;}
async function protectLast(client:PoolClient,user:{role:string;is_active:boolean}){if(user.role==='admin'&&user.is_active&&Number((await client.query("SELECT count(*) FROM app_user WHERE role='admin' AND is_active AND deleted_at IS NULL")).rows[0].count)<=1)throw new AccountError(409,'No se puede desactivar ni eliminar la última cuenta administradora activa.');}
accountsRouter.get('/',(req,res)=>transaction(req,res,async client=>({accounts:(await client.query(`SELECT ${columns} FROM app_user WHERE deleted_at IS NULL ORDER BY id`)).rows})));
accountsRouter.post('/',(req,res)=>transaction(req,res,async client=>{
 const {username,displayName,role}=req.body??{};
 if(typeof username!=='string'||typeof displayName!=='string'||!username.trim()||!displayName.trim())throw new AccountError(400,'Completá los campos obligatorios.');
 if(!/^[a-zA-Z0-9._-]{3,64}$/.test(username.trim())||displayName.trim().length>120)throw new AccountError(400,'Revisá el nombre de usuario y el nombre visible.');
 if(!['institucional','admin'].includes(role))throw new AccountError(400,'Rol inválido.');
 const credential=randomBytes(18).toString('base64url');
 const user=(await client.query(`INSERT INTO app_user(username,display_name,role,password_hash,is_active) VALUES($1,$2,$3,$4,true) RETURNING ${columns}`,[username.trim(),displayName.trim(),role,await argon2.hash(credential)])).rows[0];await audit(client,req,'account.create',user.id);return {account:user,credential};
}));
accountsRouter.post('/:id/credential',(req,res)=>transaction(req,res,async client=>{
 const user=await target(client,req.params.id),credential=randomBytes(18).toString('base64url');
 await client.query('UPDATE app_user SET password_hash=$2,session_version=session_version+1 WHERE id=$1',[user.id,await argon2.hash(credential)]);await audit(client,req,'account.credential.reset',user.id);return {credential,username:user.username};
}));
accountsRouter.patch('/:id/state',(req,res)=>transaction(req,res,async client=>{
 const user=await target(client,req.params.id),active=req.body?.active;
 if(typeof active!=='boolean')throw new AccountError(400,'Estado inválido.');
 if(user.is_active===active)return {changed:false};
 if(!active)await protectLast(client,user);
 await client.query('UPDATE app_user SET is_active=$2,session_version=session_version+1 WHERE id=$1',[user.id,active]);await audit(client,req,active?'account.activate':'account.deactivate',user.id);return {changed:true};
}));
accountsRouter.delete('/:id',(req,res)=>transaction(req,res,async client=>{
 const user=await target(client,req.params.id);if(req.body?.confirmation!==user.username)throw new AccountError(400,'Escribí el nombre de usuario para confirmar.');await protectLast(client,user);
 // Tombstone sin nombre ni credencial recuperables; mantiene claves históricas de revisión.
 await client.query("UPDATE app_user SET username=$2,display_name='Cuenta eliminada',password_hash=$3,is_active=false,role='institucional',deleted_at=now(),session_version=session_version+1 WHERE id=$1",[user.id,`eliminada-${user.id}-${randomBytes(8).toString('hex')}`,await argon2.hash(randomBytes(32))]);
 await client.query("UPDATE audit_log SET entity_id=$2 WHERE entity_type='app_user' AND action='session.login_failed' AND (lower(entity_id)=lower($1) OR user_id=$3)",[user.username,String(user.id),user.id]);
 await audit(client,req,'account.delete',user.id);return {deleted:true};
}));
