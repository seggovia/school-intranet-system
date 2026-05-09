import type { Request, Response } from 'express';
import { HttpError } from '../../shared/http-error.js';
import { ReportsService } from './reports.service.js';

const service = new ReportsService();

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
  return req.user;
}

export class ReportsController {
  async studentReportCard(req: Request, res: Response) {
    const result = await service.studentReportCard(requireUser(req), String(req.params.studentId), req.query.periodId ? String(req.query.periodId) : undefined);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  }
}
