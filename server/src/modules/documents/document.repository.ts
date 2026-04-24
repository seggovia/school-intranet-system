import { prisma } from '../../config/db.js';

export class DocumentRepository {
  list() {
    return prisma.document.findMany({ include: { category: true, owner: true }, orderBy: { updatedAt: 'desc' } });
  }

  listCategories() {
    return prisma.documentCategory.findMany({ orderBy: { name: 'asc' } });
  }

  createCategory(name: string) {
    return prisma.documentCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  async create(input: { title: string; category: string; status: string; fileUrl?: string; ownerId: string }) {
    const category = await this.createCategory(input.category);
    return prisma.document.create({
      data: { title: input.title, status: input.status, fileUrl: input.fileUrl, ownerId: input.ownerId, categoryId: category.id },
      include: { category: true, owner: true }
    });
  }

  findSubjectScope(subjectId: string) {
    return prisma.subject.findUnique({
      where: { id: subjectId },
      include: { sections: { include: { section: { include: { headTeacher: true } } } } }
    });
  }

  async createSubjectMaterial(input: { subjectId: string; title: string; fileUrl?: string; ownerId: string }) {
    const subject = await prisma.subject.findUniqueOrThrow({ where: { id: input.subjectId } });
    const category = await this.createCategory(subject.name);
    return prisma.document.create({
      data: { title: input.title, status: 'vigente', fileUrl: input.fileUrl, ownerId: input.ownerId, categoryId: category.id },
      include: { category: true, owner: true }
    });
  }
}
