import { prisma } from '../../config/db.js';

export class CourseRepository {
  list() {
    return prisma.section.findMany({
      include: {
        course: { include: { level: true } },
        classroom: true,
        headTeacher: { include: { user: true } },
        enrollments: { include: { student: { include: { grades: true, attendance: true } } } }
      },
      orderBy: [{ course: { name: 'asc' } }, { name: 'asc' }]
    });
  }

  async create(input: { name: string; levelName: string; levelOrder: number }) {
    const level = await prisma.schoolLevel.upsert({
      where: { name: input.levelName },
      update: { order: input.levelOrder },
      create: { name: input.levelName, order: input.levelOrder }
    });

    return prisma.course.create({ data: { name: input.name, levelId: level.id }, include: { level: true } });
  }
}
