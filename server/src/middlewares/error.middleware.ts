import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../shared/http-error.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message, details: error.details });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({ message: 'Datos invalidos.', details: error.flatten() });
  }

  console.error(error);
  return res.status(500).json({ message: 'Error interno del servidor.' });
}
