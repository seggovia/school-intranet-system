import { prisma } from '../../config/db.js';

export class SubjectRepository {
  list() {
    return prisma.subject.findMany({
      include: {
        teachers: { include: { teacher: { include: { user: true } } } },
        sections: { include: { section: { include: { course: true } } } }
      },
      orderBy: { name: 'asc' }
    });
  }

  create(input: { name: string; code: string }) {
    return prisma.subject.create({ data: input });
  }

  findDetail(id: string) {
    return prisma.subject.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            section: {
              include: {
                course: true,
                classroom: true,
                headTeacher: { include: { user: true } },
                schedules: { where: { subjectId: id }, include: { subject: true, teacher: { include: { user: true } }, classroom: true } },
                enrollments: { include: { student: { include: { user: true, guardians: { include: { guardian: true } }, grades: { include: { assessment: { include: { subject: true } } } }, attendance: true } } } }
              }
            }
          }
        },
        assessments: { include: { grades: true }, orderBy: { date: 'asc' } }
      }
    });
  }

  listDocumentsByCategory(category: string) {
    return prisma.document.findMany({ where: { category: { name: category } }, include: { category: true, owner: true }, orderBy: { updatedAt: 'desc' } });
  }
}
