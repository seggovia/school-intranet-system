import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env.js';
import { HttpError } from '../../shared/http-error.js';
import type { JwtUser } from './auth.types.js';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new HttpError(401, 'Token de acceso requerido.'));
  }

  try {
    req.user = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtUser;
    return next();
  } catch {
    return next(new HttpError(401, 'Token de acceso invalido o expirado.'));
  }
}

export function authorizeRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const allowed = req.user?.roles.some((role) => roles.includes(role));
    if (!allowed) {
      return next(new HttpError(403, 'No tienes permisos para esta accion.'));
    }
    return next();
  };
}

export function authorizePermissions(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const allowed = req.user?.permissions.some((permission) => permissions.includes(permission));
    if (!allowed) {
      return next(new HttpError(403, 'No tienes permisos para esta accion.'));
    }
    return next();
  };
}
