import { prisma } from '../../config/db.js';

const submissionInclude = {
  files: true,
  comments: { include: { author: true }, orderBy: { createdAt: 'asc' as const } },
  student: { include: { user: true, guardians: { include: { guardian: true } } } },
  reviewedBy: true
};

const submissionListInclude = {
  files: true,
  comments: { include: { author: true }, orderBy: { createdAt: 'asc' as const } },
  student: { include: { user: true } },
  reviewedBy: true
};

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
            assignments: { include: { submissions: { include: submissionInclude } }, orderBy: { createdAt: 'asc' } }
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
      include: { materials: { include: { owner: true } }, assignments: { include: { submissions: { include: submissionInclude } } } }
    });
  }

  updateUnit(id: string, input: { title?: string; description?: string; duration?: string; outcomes?: string[]; bibliography?: string[]; order?: number }) {
    return prisma.subjectUnit.update({
      where: { id },
      data: input,
      include: { materials: { include: { owner: true } }, assignments: { include: { submissions: { include: submissionInclude } } } }
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

  updateAssignment(id: string, input: { title?: string; description?: string; dueDate?: Date | null }) {
    return prisma.assignment.update({
      where: { id },
      data: input,
      include: { submissions: { include: submissionInclude } }
    });
  }

  updateAssignmentStatus(id: string, status: string) {
    return prisma.assignment.update({
      where: { id },
      data: { status },
      include: { submissions: { include: submissionInclude } }
    });
  }

  findAssignmentForDelete(assignmentId: string) {
    return prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        submissions: { include: { files: true } },
        unit: {
          include: {
            subject: {
              include: {
                teachers: { include: { teacher: true } },
                sections: {
                  include: {
                    section: {
                      include: {
                        headTeacher: true,
                        enrollments: {
                          include: {
                            student: {
                              include: {
                                guardians: { include: { guardian: true } }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  deleteAssignment(id: string) {
    return prisma.assignment.delete({ where: { id } });
  }

  async submitAssignment(input: { assignmentId: string; studentId: string; authorId: string; fileUrl?: string; storagePath?: string; originalName?: string; comment?: string; files?: Array<{ storagePath: string; originalName: string; mimeType?: string; size?: number }> }) {
    const submission = await prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId: input.assignmentId, studentId: input.studentId } },
      update: {
        fileUrl: input.fileUrl,
        storagePath: input.storagePath ?? input.files?.[0]?.storagePath,
        originalName: input.originalName ?? input.files?.[0]?.originalName,
        comment: input.comment,
        authorId: input.authorId,
        submittedAt: new Date(),
        status: 'entregado',
        grade: null,
        feedback: null,
        teacherComment: null,
        studentReply: null,
        reviewedAt: null,
        reviewedById: null
      },
      create: {
        assignmentId: input.assignmentId,
        studentId: input.studentId,
        authorId: input.authorId,
        fileUrl: input.fileUrl,
        storagePath: input.storagePath ?? input.files?.[0]?.storagePath,
        originalName: input.originalName ?? input.files?.[0]?.originalName,
        comment: input.comment,
        status: 'entregado'
      },
      include: submissionListInclude
    });
    if (input.files?.length) {
      await prisma.submissionFile.createMany({
        data: input.files.map((file) => ({
          submissionId: submission.id,
          storagePath: file.storagePath,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size
        }))
      });
    }
    return prisma.assignmentSubmission.findUniqueOrThrow({
      where: { id: submission.id },
      include: submissionListInclude
    });
  }

  findSubmission(assignmentId: string, studentId: string) {
    return prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      include: { files: true, comments: { include: { author: true }, orderBy: { createdAt: 'asc' } } }
    });
  }

  findAssignmentWithRoster(assignmentId: string) {
    return prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        submissions: { include: submissionListInclude },
        unit: {
          include: {
            subject: {
              include: {
                teachers: { include: { teacher: true } },
                sections: {
                  include: {
                    section: {
                      include: {
                        course: true,
                        headTeacher: true,
                        enrollments: {
                          include: {
                            student: {
                              include: {
                                user: true,
                                guardians: { include: { guardian: true } }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  findSubmissionWithScope(submissionId: string) {
    return prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        files: true,
        comments: { include: { author: true }, orderBy: { createdAt: 'asc' } },
        student: { include: { user: true, guardians: { include: { guardian: true } } } },
        reviewedBy: true,
        assignment: {
          include: {
            unit: {
              include: {
                subject: {
                  include: {
                    teachers: { include: { teacher: true } },
                    sections: {
                      include: {
                        section: {
                          include: {
                            headTeacher: true,
                            enrollments: {
                              include: {
                                student: {
                                  include: {
                                    guardians: { include: { guardian: true } }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  reviewSubmission(submissionId: string, input: { grade?: number | null; teacherComment?: string | null; status: string; reviewedById: string; reviewedAt: Date }) {
    return prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: input,
      include: submissionListInclude
    });
  }

  updateSubmissionReply(submissionId: string, studentReply: string | null) {
    return prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { studentReply },
      include: submissionListInclude
    });
  }

  createSubmissionComment(input: { submissionId: string; authorId: string; body: string }) {
    return prisma.submissionComment.create({
      data: input,
      include: { author: true }
    });
  }

  deleteSubmissionComment(commentId: string) {
    return prisma.submissionComment.delete({ where: { id: commentId } });
  }

  findSubmissionCommentWithScope(commentId: string) {
    return prisma.submissionComment.findUnique({
      where: { id: commentId },
      include: {
        author: true,
        submission: {
          include: {
            files: true,
            comments: { include: { author: true }, orderBy: { createdAt: 'asc' } },
            student: { include: { user: true, guardians: { include: { guardian: true } } } },
            reviewedBy: true,
            assignment: {
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
            }
          }
        }
      }
    });
  }

  findSubmissionFile(fileId: string) {
    return prisma.submissionFile.findUnique({
      where: { id: fileId },
      include: {
        submission: {
          include: {
            files: true,
            student: { include: { user: true, guardians: { include: { guardian: true } } } },
            assignment: {
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
            }
          }
        }
      }
    });
  }

  deleteSubmissionFiles(fileIds: string[]) {
    return prisma.submissionFile.deleteMany({ where: { id: { in: fileIds } } });
  }

  deleteSubmission(assignmentId: string, studentId: string) {
    return prisma.assignmentSubmission.delete({
      where: { assignmentId_studentId: { assignmentId, studentId } }
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
