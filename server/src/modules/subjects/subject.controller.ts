import type { Request, Response } from 'express';
import { SubjectService } from './subject.service.js';
import { HttpError } from '../../shared/http-error.js';

const service = new SubjectService();

export class SubjectController {
  async list(_req: Request, res: Response) {
    res.json(await service.list());
  }

  async create(req: Request, res: Response) {
    res.status(201).json(await service.create(req.body));
  }

  async detail(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.detail(req.user, String(req.params.id)));
  }

  async createUnit(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.createUnit(req.user, String(req.params.id), req.body));
  }

  async updateUnit(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.updateUnit(req.user, String(req.params.unitId), req.body));
  }

  async deleteUnit(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.deleteUnit(req.user, String(req.params.unitId)));
  }

  async createMaterial(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.createMaterial(req.user, String(req.params.unitId), req.body));
  }

  async uploadMaterial(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.uploadMaterial(req.user, String(req.params.unitId), { ...req.body, file: req.file }));
  }

  async deleteMaterial(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.deleteMaterial(req.user, String(req.params.materialId)));
  }

  async createAssignment(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.createAssignment(req.user, String(req.params.unitId), req.body));
  }

  async updateAssignment(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.updateAssignment(req.user, String(req.params.assignmentId), req.body));
  }

  async updateAssignmentStatus(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.updateAssignmentStatus(req.user, String(req.params.assignmentId), req.body));
  }

  async deleteAssignment(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.deleteAssignment(req.user, String(req.params.assignmentId)));
  }

  async submitAssignment(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.submitAssignment(req.user, String(req.params.assignmentId), req.body));
  }

  async uploadAssignment(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    const files = req.files && !Array.isArray(req.files)
      ? [...(req.files.file ?? []), ...(req.files.files ?? [])]
      : [];
    res.status(201).json(await service.uploadAssignment(req.user, String(req.params.assignmentId), { ...req.body, files }));
  }

  async deleteSubmission(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.deleteSubmission(req.user, String(req.params.assignmentId), req.body));
  }

  async listAssignmentSubmissions(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.listAssignmentSubmissions(req.user, String(req.params.assignmentId)));
  }

  async reviewSubmission(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.reviewSubmission(req.user, String(req.params.submissionId), req.body));
  }

  async replyToSubmission(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.replyToSubmission(req.user, String(req.params.submissionId), req.body));
  }

  async addSubmissionComment(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.addSubmissionComment(req.user, String(req.params.submissionId), req.body));
  }

  async addAssignmentComment(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.addAssignmentComment(req.user, String(req.params.assignmentId), req.body));
  }

  async deleteSubmissionComment(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.deleteSubmissionComment(req.user, String(req.params.commentId)));
  }

  async deleteSubmissionFiles(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.deleteSubmissionFiles(req.user, String(req.params.submissionId), req.body));
  }

  async downloadSubmission(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    const file = await service.downloadSubmission(req.user, String(req.params.submissionId));
    res.download(file.absolutePath, file.filename);
  }

  async downloadSubmissionFile(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    const file = await service.downloadSubmissionFile(req.user, String(req.params.fileId));
    res.download(file.absolutePath, file.filename);
  }
}
