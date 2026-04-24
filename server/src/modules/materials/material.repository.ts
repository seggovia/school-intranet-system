import { prisma } from '../../config/db.js';

export class MaterialRepository {
  findForDownload(id: string) {
    return prisma.unitMaterial.findUnique({
      where: { id },
      include: {
        unit: {
          include: {
            subject: {
              include: {
                teachers: { include: { teacher: true } },
                sections: { include: { section: { include: { headTeacher: true, enrollments: { include: { student: { include: { guardians: { include: { guardian: true } } } } } } } } } }
              }
            }
          }
        }
      }
    });
  }
}
