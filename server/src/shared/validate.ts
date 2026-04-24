import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { HttpError } from './http-error.js';

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(new HttpError(400, 'Datos invalidos.', parsed.error.flatten()));
    }
    req.body = parsed.data;
    return next();
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      return next(new HttpError(400, 'Parametros invalidos.', parsed.error.flatten()));
    }
    req.params = parsed.data as typeof req.params;
    return next();
  };
}
