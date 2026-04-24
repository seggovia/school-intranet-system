import { prisma } from '../../config/db.js';

export class SectionRepository {
  list() {
    return prisma.section.findMany({
      include: { course: true, classroom: true, headTeacher: { include: { user: true } }, enrollments: true },
      orderBy: [{ course: { name: 'asc' } }, { name: 'asc' }]
    });
  }

  create(input: { courseId: string; name: string; teacherId?: string; classroomId?: string }) {
    return prisma.section.create({ data: input, include: { course: true, classroom: true, headTeacher: { include: { user: true } } } });
  }

  listStudents(sectionId: string) {
    return prisma.enrollment.findMany({
      where: { sectionId, status: 'activo' },
      include: { student: { include: { user: true, attendance: true, grades: true, guardians: { include: { guardian: true } } } }, section: { include: { course: true } } },
      orderBy: { student: { user: { name: 'asc' } } }
    });
  }

  findSectionScope(sectionId: string) {
    return prisma.section.findUnique({
      where: { id: sectionId },
      include: { headTeacher: true, enrollments: { include: { student: { include: { guardians: { include: { guardian: true } } } } } } }
    });
  }
}
