import fs from 'node:fs/promises';
import path from 'node:path';
import type { JwtUser } from '../auth/auth.types.js';
import { HttpError } from '../../shared/http-error.js';
import { materialsUploadDir } from '../../shared/upload-paths.js';
import { MaterialRepository } from './material.repository.js';

const repository = new MaterialRepository();

type DownloadMaterial = any;

function canDownloadMaterial(user: JwtUser, material: DownloadMaterial) {
  if (user.roles.some((role) => ['admin', 'director'].includes(role))) return true;
  if (user.roles.includes('teacher')) {
    return material.unit.subject.teachers.some((item: any) => item.teacher.userId === user.id)
      || material.unit.subject.sections.some((item: any) => item.section.headTeacher?.userId === user.id)
      || material.unit.subject.sections.some((item: any) => item.section.schedules?.some((schedule: any) => schedule.teacher.userId === user.id));
  }
  if (user.roles.includes('student')) {
    return material.unit.subject.sections.some((item: any) => item.section.enrollments.some((enrollment: any) => enrollment.student.userId === user.id));
  }
  if (user.roles.includes('guardian')) {
    return material.unit.subject.sections.some((item: any) => item.section.enrollments.some((enrollment: any) => (
      enrollment.student.guardians.some((guardian: any) => guardian.guardian.userId === user.id)
    )));
  }
  return false;
}

function safeDownloadName(material: DownloadMaterial, extension: string) {
  const base = material.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'material';
  return `${base}${extension}`;
}

export class MaterialService {
  async download(user: JwtUser, materialId: string) {
    const material = await repository.findForDownload(materialId);
    if (!material) throw new HttpError(404, 'Material no encontrado.');
    if (!canDownloadMaterial(user, material)) throw new HttpError(403, 'No tienes permisos para descargar este material.');
    if (!material.storagePath) throw new HttpError(404, 'Este material no tiene archivo local disponible.');

    const uploadDir = materialsUploadDir();
    const absolutePath = path.resolve(uploadDir, material.storagePath);
    const relative = path.relative(uploadDir, absolutePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new HttpError(400, 'Ruta de archivo invalida.');
    }

    try {
      await fs.access(absolutePath);
    } catch {
      throw new HttpError(404, 'Archivo no encontrado en el servidor.');
    }

    return {
      absolutePath,
      downloadName: safeDownloadName(material, path.extname(material.storagePath))
    };
  }
}
