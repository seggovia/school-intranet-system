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
        teachers: { include: { teacher: { include: { user: true } } } },
        units: {
          include: {
            materials: { include: { owner: true }, orderBy: { createdAt: 'asc' } },
            assignments: { include: { submissions: { include: { student: { include: { user: true } } } } }, orderBy: { createdAt: 'asc' } }
          },
          orderBy: { order: 'asc' }
        },
        assessments: { include: { grades: true }, orderBy: { date: 'asc' } }
      }
    });
  }

  listDocumentsByCategory(category: string) {
    return prisma.document.findMany({ where: { category: { name: category } }, include: { category: true, owner: true }, orderBy: { updatedAt: 'desc' } });
  }

  createUnit(input: { subjectId: string; title: string; description: string; duration?: string; outcomes: string[]; bibliography: string[]; order: number }) {
    return prisma.subjectUnit.create({
      data: input,
      include: { materials: { include: { owner: true } }, assignments: { include: { submissions: { include: { student: { include: { user: true } } } } } } }
    });
  }

  updateUnit(id: string, input: { title?: string; description?: string; duration?: string; outcomes?: string[]; bibliography?: string[]; order?: number }) {
    return prisma.subjectUnit.update({
      where: { id },
      data: input,
      include: { materials: { include: { owner: true } }, assignments: { include: { submissions: { include: { student: { include: { user: true } } } } } } }
    });
  }

  deleteUnit(id: string) {
    return prisma.subjectUnit.delete({ where: { id } });
  }

  createMaterial(input: { unitId: string; title: string; type: string; fileUrl?: string; storagePath?: string; ownerId: string }) {
    return prisma.unitMaterial.create({ data: input, include: { owner: true } });
  }

  updateMaterialFileUrl(id: string, fileUrl: string) {
    return prisma.unitMaterial.update({ where: { id }, data: { fileUrl }, include: { owner: true } });
  }

  deleteMaterial(id: string) {
    return prisma.unitMaterial.delete({ where: { id } });
  }

  createAssignment(input: { unitId: string; title: string; description: string; dueDate?: Date }) {
    return prisma.assignment.create({ data: input, include: { submissions: true } });
  }

  submitAssignment(input: { assignmentId: string; studentId: string; authorId: string; fileUrl?: string; comment?: string }) {
    return prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId: input.assignmentId, studentId: input.studentId } },
      update: { fileUrl: input.fileUrl, comment: input.comment, authorId: input.authorId, submittedAt: new Date(), status: 'enviado' },
      create: input,
      include: { student: { include: { user: true } } }
    });
  }

  findSubjectScope(subjectId: string) {
    return prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        teachers: { include: { teacher: true } },
        sections: { include: { section: { include: { headTeacher: true, enrollments: { include: { student: { include: { guardians: { include: { guardian: true } } } } } } } } } }
      }
    });
  }

  findUnitScope(unitId: string) {
    return prisma.subjectUnit.findUnique({
      where: { id: unitId },
      include: {
        subject: {
          include: {
            teachers: { include: { teacher: true } },
            sections: { include: { section: { include: { headTeacher: true, enrollments: { include: { student: { include: { guardians: { include: { guardian: true } } } } } } } } } }
          }
        }
      }
    });
  }

  findAssignmentScope(assignmentId: string) {
    return prisma.assignment.findUnique({
      where: { id: assignmentId },
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

  findMaterialScope(materialId: string) {
    return prisma.unitMaterial.findUnique({ where: { id: materialId }, include: { unit: true } });
  }
}
