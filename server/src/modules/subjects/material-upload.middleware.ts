import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../shared/http-error.js';
import { materialsUploadDir } from '../../shared/upload-paths.js';

const maxFileSize = 25 * 1024 * 1024;
const uploadDir = materialsUploadDir();

const allowedExtensions = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']);
const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]);

fs.mkdirSync(uploadDir, { recursive: true });

function sanitizeFilename(originalName: string) {
  const extension = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, extension)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'material';
  return `${Date.now()}-${randomUUID()}-${base}${extension}`;
}

function validateUploadFile(file: Express.Multer.File) {
  const extension = path.extname(file.originalname).toLowerCase();
  return allowedExtensions.has(extension) && allowedMimeTypes.has(file.mimetype);
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => callback(null, sanitizeFilename(file.originalname))
});

const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter: (_req, file, callback) => {
    if (!validateUploadFile(file)) {
      callback(new HttpError(400, 'Tipo de archivo no permitido. Solo PDF, DOC, DOCX, XLS, XLSX, PPT y PPTX.'));
      return;
    }
    callback(null, true);
  }
});

export function handleMaterialUpload(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new HttpError(400, 'El archivo supera el maximo permitido de 25 MB.'));
      return;
    }

    next(error);
  });
}
