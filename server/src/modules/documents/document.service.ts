import { DocumentRepository } from './document.repository.js';
import { HttpError } from '../../shared/http-error.js';
import type { JwtUser } from '../auth/auth.types.js';

const repository = new DocumentRepository();

function serialize(document: Awaited<ReturnType<DocumentRepository['create']>>) {
  return {
    id: document.id,
    title: document.title,
    category: document.category.name,
    owner: document.owner.name,
    updatedAt: document.updatedAt.toISOString().slice(0, 10),
    status: document.status,
    fileUrl: document.fileUrl
  };
}

export class DocumentService {
  async list() {
    const documents = await repository.list();
    return documents.map(serialize);
  }

  listCategories() {
    return repository.listCategories();
  }

  createCategory(input: { name: string }) {
    return repository.createCategory(input.name);
  }

  async create(input: { title: string; category: string; status: string; fileUrl?: string; ownerId: string }) {
    return serialize(await repository.create(input));
  }

  async createSubjectMaterial(user: JwtUser, input: { subjectId: string; title: string; fileUrl?: string }) {
    if (!user.roles.some((role) => ['admin', 'director'].includes(role))) {
      const subject = await repository.findSubjectScope(input.subjectId);
      const assigned = user.roles.includes('teacher') && subject?.sections.some((item) => item.section.headTeacher?.userId === user.id);
      if (!assigned) throw new HttpError(403, 'No tienes permisos para registrar materiales en esta asignatura.');
    }

    return serialize(await repository.createSubjectMaterial({ ...input, ownerId: user.id }));
  }
}
