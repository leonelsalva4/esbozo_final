import {logTechnicalError} from "./technical-log.js";
import type {Request,Response,NextFunction,RequestHandler,ErrorRequestHandler} from 'express';

// Express 4 necesita derivar explícitamente las promesas rechazadas.
export function asyncHandler(handler:(req:Request,res:Response,next:NextFunction)=>Promise<unknown>):RequestHandler {
  return (req,res,next)=>{void Promise.resolve().then(()=>handler(req,res,next)).catch(next);};
}

export const requestError:ErrorRequestHandler=(error, _req, res, next)=>{
  logTechnicalError('http.request', error);
  if(res.headersSent){next(error);return;}
  const type=(error as {type?:string})?.type;
  const status=type==='entity.parse.failed'?400:type==='entity.too.large'?413:503;
  res.set('Cache-Control','no-store').status(status).json({error:status===400?'La solicitud no es válida.':status===413?'La solicitud supera el tamaño permitido.':'No se pudo completar la consulta. Podés reintentar; el servidor sigue disponible.'});
};
