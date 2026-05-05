import { SubjectRepository } from './subject.repository.js';
import type { JwtUser } from '../auth/auth.types.js';
import { HttpError } from '../../shared/http-error.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { materialsUploadDir, submissionsUploadDir } from '../../shared/upload-paths.js';

const repository = new SubjectRepository();

const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

function canViewStaffData(user: JwtUser) {
  return user.roles.some((role) => ['admin', 'director', 'teacher', 'inspector'].includes(role));
}

function fallbackUnits(subjectId: string, subjectName: string) {
  return [1, 2, 3].map((unitNumber) => ({
    id: `${subjectId}-u${unitNumber}`,
    title: `Unidad ${unitNumber}`,
    description: `Contenidos de trabajo para ${subjectName}.`,
    duration: unitNumber === 2 ? '4 semanas' : '3 semanas',
    outcomes: ['Reconoce conceptos base.', 'Desarrolla actividades aplicadas.', 'Presenta evidencias de aprendizaje.'],
    bibliography: ['Apuntes docentes de la asignatura', 'Bibliografia digital disponible'],
    contents: [
      { id: `${subjectId}-u${unitNumber}-presentacion`, type: 'presentacion', title: `Presentacion Unidad ${unitNumber}`, status: 'disponible' },
      { id: `${subjectId}-u${unitNumber}-guia`, type: 'guia', title: `Guia de aprendizaje Unidad ${unitNumber}`, status: 'disponible' }
    ],
    assignments: []
  }));
}

function stringList(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : fallback;
}

function hasSubjectManagementAccess(user: JwtUser, subject: any) {
  if (!subject) return false;
  if (user.roles.some((role) => ['admin', 'director'].includes(role))) return true;
  if (!user.roles.includes('teacher')) return false;
  return subject.teachers.some((item: any) => item.teacher.userId === user.id)
    || subject.sections.some((item: any) => item.section.headTeacher?.userId === user.id)
    || subject.sections.some((item: any) => item.section.schedules?.some((schedule: any) => schedule.teacher.userId === user.id));
}

function studentIdsForUser(user: JwtUser, subject: any) {
  return subject.sections.flatMap((item: any) => item.section.enrollments)
    .filter((enrollment: any) => {
      if (user.roles.includes('student')) return enrollment.student.userId === user.id;
      if (user.roles.includes('guardian')) return enrollment.student.guardians.some((guardian: any) => guardian.guardian.userId === user.id);
      return false;
    })
    .map((enrollment: any) => enrollment.student.id);
}

function visibleSubmissionsForUser(user: JwtUser | undefined, submissions: any[]) {
  if (!user || user.roles.some((role) => ['admin', 'director', 'teacher', 'inspector'].includes(role))) return submissions;
  if (user.roles.includes('student')) return submissions.filter((submission) => submission.student.userId === user.id);
  if (user.roles.includes('guardian')) return submissions.filter((submission) => submission.student.guardians?.some((guardian: any) => guardian.guardian.userId === user.id));
  return submissions;
}

function serializeSubmission(submission: any) {
  const files = [
    ...(submission.files ?? []).map((file: any) => ({
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      createdAt: file.createdAt?.toISOString?.() ?? null
    })),
    ...(!submission.files?.length && submission.storagePath ? [{
      id: submission.id,
      originalName: submission.originalName ?? 'entrega',
      mimeType: null,
      size: null,
      createdAt: submission.submittedAt?.toISOString?.() ?? null
    }] : [])
  ];
  return {
    id: submission.id,
    studentId: submission.studentId,
    student: submission.student.user.name,
    fileUrl: submission.fileUrl,
    comment: submission.comment,
    status: submission.status === 'enviado' ? 'entregado' : submission.status,
    originalName: submission.originalName,
    files,
    grade: submission.grade,
    commentThread: {
      teacher: submission.teacherComment ?? submission.feedback ?? null,
      student: submission.studentReply ?? null
    },
    comments: (submission.comments ?? []).map((comment: any) => ({
      id: comment.id,
      body: comment.body,
      authorId: comment.authorId,
      author: comment.author?.name ?? 'Usuario',
      createdAt: comment.createdAt?.toISOString?.() ?? null
    })),
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    reviewedBy: submission.reviewedBy?.name ?? null,
    submittedAt: submission.submittedAt.toISOString()
  };
}

function canAccessSubmission(user: JwtUser, submission: any) {
  const subject = submission.assignment.unit.subject;
  const canReview = hasSubjectManagementAccess(user, subject);
  const isOwnStudent = user.roles.includes('student') && submission.student.userId === user.id;
  const isGuardian = user.roles.includes('guardian') && submission.student.guardians.some((guardian: any) => guardian.guardian.userId === user.id);
  return { canReview, isOwnStudent, isGuardian, canAccess: canReview || isOwnStudent || isGuardian };
}

function serializeAssignment(assignment: any, user?: JwtUser) {
  const submissions = visibleSubmissionsForUser(user, assignment.submissions ?? []);
  return {
    id: assignment.id,
    title: assignment.title,
    description: assignment.description,
    dueDate: assignment.dueDate?.toISOString() ?? null,
    openedAt: assignment.createdAt?.toISOString() ?? null,
    status: assignment.status,
    submissions: submissions.length,
    submissionItems: submissions.map((submission: any) => serializeSubmission(submission))
  };
}

function allRosterStudents(subject: any) {
  const seen = new Set<string>();
  return subject.sections.flatMap((item: any) => item.section.enrollments)
    .map((enrollment: any) => enrollment.student)
    .filter((student: any) => {
      if (seen.has(student.id)) return false;
      seen.add(student.id);
      return true;
    });
}

function isLate(assignment: any, submittedAt?: Date | null) {
  if (!assignment.dueDate) return false;
  const due = new Date(assignment.dueDate).getTime();
  const compare = submittedAt ? new Date(submittedAt).getTime() : Date.now();
  return compare > due;
}

function computedSubmissionStatus(assignment: any, submission?: any) {
  if (!submission) return isLate(assignment) ? 'atrasado' : 'pendiente';
  if (['revisado', 'devuelto'].includes(submission.status)) return submission.status;
  return isLate(assignment, submission.submittedAt) ? 'atrasado' : 'entregado';
}

function serializeUnit(unit: any, user?: JwtUser) {
  const assignments = unit.assignments.map((assignment: any) => serializeAssignment(assignment, user));

  return {
    id: unit.id,
    title: unit.title,
    description: unit.description,
    duration: unit.duration ?? '3 semanas',
    outcomes: stringList(unit.outcomes, []),
    bibliography: stringList(unit.bibliography, []),
    contents: unit.materials.map((material: any) => ({
        id: material.id,
        type: material.type,
        title: material.title,
        status: material.status,
        fileUrl: material.fileUrl,
        owner: material.owner.name,
        updatedAt: material.updatedAt.toISOString().slice(0, 10)
      })),
    assignments
  };
}

export class SubjectService {
  async list() {
    const subjects = await repository.list();
    return subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      teachers: subject.teachers.map((item) => item.teacher.user.name),
      sections: subject.sections.map((item) => `${item.section.course.name} ${item.section.name}`)
    }));
  }

  async create(input: { name: string; code: string }) {
    return repository.create(input);
  }

  async detail(user: JwtUser, id: string) {
    const subject = await repository.findDetail(id);
    if (!subject) throw new HttpError(404, 'Asignatura no encontrada.');

    const visibleSections = subject.sections.filter(({ section }) => {
      if (user.roles.some((role) => ['admin', 'director', 'inspector'].includes(role))) return true;
      if (user.roles.includes('teacher')) {
        return section.headTeacher?.userId === user.id
          || subject.teachers.some((item) => item.teacher.userId === user.id)
          || section.schedules.some((schedule) => schedule.teacher.userId === user.id);
      }
      if (user.roles.includes('student')) return section.enrollments.some((enrollment) => enrollment.student.userId === user.id);
      if (user.roles.includes('guardian')) return section.enrollments.some((enrollment) => enrollment.student.guardians.some((item) => item.guardian.userId === user.id));
      return false;
    });

    if (!visibleSections.length) throw new HttpError(403, 'No tienes permisos para ver esta asignatura.');

    const materials = await repository.listDocumentsByCategory(subject.name);
    const primarySection = visibleSections[0]?.section;
    const primarySchedule = primarySection?.schedules[0];
    const schedule = visibleSections.flatMap(({ section }) => section.schedules.map((item) => ({
      id: item.id,
      weekday: item.weekday,
      weekdayName: weekdayNames[item.weekday] ?? `Dia ${item.weekday}`,
      startsAt: item.startsAt,
      endsAt: item.endsAt,
      subjectId: subject.id,
      subject: item.subject.name,
      teacher: item.teacher.user.name,
      classroom: item.classroom.name,
      section: `${section.course.name} ${section.name}`
    })));

    return {
      subject: {
        id: subject.id,
        name: subject.name,
        code: subject.code
      },
      teacher: primarySchedule?.teacher.user.name ?? subject.teachers[0]?.teacher.user.name ?? primarySection?.headTeacher?.user.name ?? 'Sin asignar',
      section: primarySection ? `${primarySection.course.name} ${primarySection.name}` : 'Sin seccion',
      room: primarySchedule?.classroom.name ?? primarySection?.classroom?.name ?? 'Sin sala',
      schedule,
      units: subject.units.length ? subject.units.map((unit) => serializeUnit(unit, user)) : fallbackUnits(subject.id, subject.name),
      sections: visibleSections.map(({ section }) => ({
        id: section.id,
        name: `${section.course.name} ${section.name}`,
        teacher: section.headTeacher?.user.name ?? 'Sin asignar',
        classroom: section.classroom?.name ?? 'Sin sala',
        students: section.enrollments.map((enrollment) => ({
          id: enrollment.student.id,
          name: enrollment.student.user.name,
          enrollmentId: enrollment.id
        })),
        schedules: section.schedules.map((schedule) => ({
          id: schedule.id,
          weekday: schedule.weekday,
          startsAt: schedule.startsAt,
          endsAt: schedule.endsAt,
          subject: schedule.subject.name,
          teacher: schedule.teacher.user.name,
          classroom: schedule.classroom.name
        }))
      })),
      assessments: canViewStaffData(user) ? subject.assessments.map((assessment) => ({ id: assessment.id, title: assessment.title, date: assessment.date.toISOString().slice(0, 10), grades: assessment.grades.length, periodId: assessment.periodId, period: assessment.period ? { id: assessment.period.id, name: assessment.period.name } : null })) : [],
      materials: materials.map((document) => ({
        id: document.id,
        title: document.title,
        category: document.category.name,
        owner: document.owner.name,
        updatedAt: document.updatedAt.toISOString().slice(0, 10),
        status: document.status,
        fileUrl: document.fileUrl ?? '#'
      }))
    };
  }

  async createUnit(user: JwtUser, subjectId: string, input: { title: string; description: string; duration?: string; outcomes?: string[]; bibliography?: string[]; order?: number }) {
    const subject = await repository.findSubjectScope(subjectId);
    if (!hasSubjectManagementAccess(user, subject)) throw new HttpError(403, 'No tienes permisos para editar esta asignatura.');
    const unit = await repository.createUnit({
      subjectId,
      title: input.title,
      description: input.description,
      duration: input.duration,
      outcomes: input.outcomes ?? [],
      bibliography: input.bibliography ?? [],
      order: input.order ?? 0
    });
    return serializeUnit({ ...unit, materials: [], assignments: [] }, user);
  }

  async updateUnit(user: JwtUser, unitId: string, input: { title?: string; description?: string; duration?: string; outcomes?: string[]; bibliography?: string[]; order?: number }) {
    const unit = await repository.findUnitScope(unitId);
    if (!unit) throw new HttpError(404, 'Unidad no encontrada.');
    if (!hasSubjectManagementAccess(user, unit.subject)) throw new HttpError(403, 'No tienes permisos para editar esta unidad.');
    return serializeUnit(await repository.updateUnit(unitId, input), user);
  }

  async deleteUnit(user: JwtUser, unitId: string) {
    const unit = await repository.findUnitScope(unitId);
    if (!unit) throw new HttpError(404, 'Unidad no encontrada.');
    if (!hasSubjectManagementAccess(user, unit.subject)) throw new HttpError(403, 'No tienes permisos para eliminar esta unidad.');
    await repository.deleteUnit(unitId);
    return { ok: true };
  }

  async createMaterial(user: JwtUser, unitId: string, input: { title: string; type: string; fileUrl?: string }) {
    const unit = await repository.findUnitScope(unitId);
    if (!unit) throw new HttpError(404, 'Unidad no encontrada.');
    if (!hasSubjectManagementAccess(user, unit.subject)) throw new HttpError(403, 'No tienes permisos para agregar materiales.');
    const material = await repository.createMaterial({ ...input, unitId, ownerId: user.id });
    return {
      id: material.id,
      type: material.type,
      title: material.title,
      status: material.status,
      fileUrl: material.fileUrl,
      owner: material.owner.name,
      updatedAt: material.updatedAt.toISOString().slice(0, 10)
    };
  }

  async uploadMaterial(user: JwtUser, unitId: string, input: { title: string; type: string; file?: Express.Multer.File }) {
    const unit = await repository.findUnitScope(unitId);
    if (!unit) throw new HttpError(404, 'Unidad no encontrada.');
    if (!hasSubjectManagementAccess(user, unit.subject)) throw new HttpError(403, 'No tienes permisos para agregar materiales.');
    if (!input.file) throw new HttpError(400, 'Debe adjuntar un archivo valido.');

    const material = await repository.createMaterial({
      unitId,
      title: input.title,
      type: input.type,
      storagePath: input.file.filename,
      ownerId: user.id
    });
    const updated = await repository.updateMaterialFileUrl(material.id, `/api/materials/${material.id}/download`);

    return {
      id: updated.id,
      type: updated.type,
      title: updated.title,
      status: updated.status,
      fileUrl: updated.fileUrl,
      owner: updated.owner.name,
      updatedAt: updated.updatedAt.toISOString().slice(0, 10)
    };
  }

  async deleteMaterial(user: JwtUser, materialId: string) {
    const material = await repository.findMaterialScope(materialId);
    if (!material) throw new HttpError(404, 'Material no encontrado.');
    const unit = await repository.findUnitScope(material.unitId);
    if (!unit || !hasSubjectManagementAccess(user, unit.subject)) throw new HttpError(403, 'No tienes permisos para eliminar este material.');
    const deleted = await repository.deleteMaterial(materialId);
    if (deleted.storagePath) {
      const uploadDir = materialsUploadDir();
      const absolutePath = path.resolve(uploadDir, deleted.storagePath);
      const relative = path.relative(uploadDir, absolutePath);
      if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
        await fs.unlink(absolutePath).catch(() => undefined);
      }
    }
    return { ok: true };
  }

  async createAssignment(user: JwtUser, unitId: string, input: { title: string; description: string; dueDate?: string }) {
    const unit = await repository.findUnitScope(unitId);
    if (!unit) throw new HttpError(404, 'Unidad no encontrada.');
    if (!hasSubjectManagementAccess(user, unit.subject)) throw new HttpError(403, 'No tienes permisos para crear entregables.');
    const assignment = await repository.createAssignment({
      unitId,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined
    });
    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      status: assignment.status,
      dueDate: assignment.dueDate?.toISOString() ?? null,
      openedAt: assignment.createdAt?.toISOString() ?? null,
      submissions: 0,
      submissionItems: []
    };
  }

  async updateAssignment(user: JwtUser, assignmentId: string, input: { title?: string; description?: string; dueDate?: string }) {
    const assignment = await repository.findAssignmentScope(assignmentId);
    if (!assignment) throw new HttpError(404, 'Buzon no encontrado.');
    if (!hasSubjectManagementAccess(user, assignment.unit.subject)) throw new HttpError(403, 'No tienes permisos para editar este buzon.');
    const updated = await repository.updateAssignment(assignmentId, {
      title: input.title,
      description: input.description,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined
    });
    return serializeAssignment(updated, user);
  }

  async updateAssignmentStatus(user: JwtUser, assignmentId: string, input: { status: string }) {
    const assignment = await repository.findAssignmentScope(assignmentId);
    if (!assignment) throw new HttpError(404, 'Buzon no encontrado.');
    if (!hasSubjectManagementAccess(user, assignment.unit.subject)) throw new HttpError(403, 'No tienes permisos para cerrar este buzon.');
    const updated = await repository.updateAssignmentStatus(assignmentId, input.status);
    return serializeAssignment(updated, user);
  }

  async deleteAssignment(user: JwtUser, assignmentId: string) {
    const assignment = await repository.findAssignmentForDelete(assignmentId);
    if (!assignment) throw new HttpError(404, 'Buzon no encontrado.');
    if (!hasSubjectManagementAccess(user, assignment.unit.subject)) throw new HttpError(403, 'No tienes permisos para eliminar este buzon.');
    await repository.deleteAssignment(assignmentId);
    const uploadDir = submissionsUploadDir();
    await Promise.all(assignment.submissions.map(async (submission: any) => {
      await Promise.all((submission.files ?? []).map(async (file: any) => {
        const absolutePath = path.resolve(uploadDir, file.storagePath);
        const relative = path.relative(uploadDir, absolutePath);
        if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
          await fs.unlink(absolutePath).catch(() => undefined);
        }
      }));
      if (!submission.storagePath) return;
      const absolutePath = path.resolve(uploadDir, submission.storagePath);
      const relative = path.relative(uploadDir, absolutePath);
      if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
        await fs.unlink(absolutePath).catch(() => undefined);
      }
    }));
    return { ok: true };
  }

  async submitAssignment(user: JwtUser, assignmentId: string, input: { fileUrl?: string; storagePath?: string; originalName?: string; comment?: string; studentId?: string; files?: Array<{ storagePath: string; originalName: string; mimeType?: string; size?: number }> }) {
    const assignment = await repository.findAssignmentScope(assignmentId);
    if (!assignment) throw new HttpError(404, 'Entregable no encontrado.');
    if (assignment.status === 'cerrado' || isLate(assignment)) throw new HttpError(409, 'Este buzon ya no acepta entregas.');
    const allowedStudentIds = studentIdsForUser(user, assignment.unit.subject);
    const studentId = input.studentId ?? allowedStudentIds[0];
    if (!studentId || !allowedStudentIds.includes(studentId)) throw new HttpError(403, 'No tienes permisos para enviar esta actividad.');
    const submission = await repository.submitAssignment({
      assignmentId,
      studentId,
      authorId: user.id,
      fileUrl: input.fileUrl,
      storagePath: input.storagePath,
      originalName: input.originalName,
      comment: input.comment,
      files: input.files
    });
    return serializeSubmission(submission);
  }

  async uploadAssignment(user: JwtUser, assignmentId: string, input: { files?: Express.Multer.File[]; comment?: string; studentId?: string }) {
    if (!input.files?.length) throw new HttpError(400, 'Debe adjuntar al menos un archivo valido.');
    return this.submitAssignment(user, assignmentId, {
      studentId: input.studentId,
      comment: input.comment,
      files: input.files.map((file) => ({
        storagePath: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      }))
    });
  }

  async deleteSubmission(user: JwtUser, assignmentId: string, input: { studentId?: string }) {
    const assignment = await repository.findAssignmentScope(assignmentId);
    if (!assignment) throw new HttpError(404, 'Buzon no encontrado.');
    if (assignment.status === 'cerrado' || isLate(assignment)) throw new HttpError(409, 'Este buzon ya no permite modificar entregas.');
    const allowedStudentIds = studentIdsForUser(user, assignment.unit.subject);
    const studentId = input.studentId ?? allowedStudentIds[0];
    if (!studentId || !allowedStudentIds.includes(studentId)) throw new HttpError(403, 'No tienes permisos para eliminar esta entrega.');
    const submission = await repository.findSubmission(assignmentId, studentId);
    if (!submission) return { ok: true };
    await repository.deleteSubmission(assignmentId, studentId);
    const uploadDir = submissionsUploadDir();
    await Promise.all((submission.files ?? []).map(async (file: any) => {
      const absolutePath = path.resolve(uploadDir, file.storagePath);
      const relative = path.relative(uploadDir, absolutePath);
      if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
        await fs.unlink(absolutePath).catch(() => undefined);
      }
    }));
    if (submission.storagePath) {
      const absolutePath = path.resolve(uploadDir, submission.storagePath);
      const relative = path.relative(uploadDir, absolutePath);
      if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
        await fs.unlink(absolutePath).catch(() => undefined);
      }
    }
    return { ok: true };
  }

  async listAssignmentSubmissions(user: JwtUser, assignmentId: string) {
    const assignment = await repository.findAssignmentWithRoster(assignmentId);
    if (!assignment) throw new HttpError(404, 'Buzon no encontrado.');
    const subject = assignment.unit.subject;
    const canReview = hasSubjectManagementAccess(user, subject);
    const allowedStudentIds = canReview ? null : new Set(studentIdsForUser(user, subject));
    if (!canReview && (!allowedStudentIds || allowedStudentIds.size === 0)) throw new HttpError(403, 'No tienes permisos para ver estas entregas.');

    const submissionsByStudent = new Map(assignment.submissions.map((submission: any) => [submission.studentId, submission]));
    return allRosterStudents(subject)
      .filter((student: any) => canReview || allowedStudentIds?.has(student.id))
      .map((student: any) => {
        const submission = submissionsByStudent.get(student.id) as any | undefined;
        return {
          studentId: student.id,
          student: student.user.name,
          status: computedSubmissionStatus(assignment, submission),
          submission: submission ? serializeSubmission(submission) : null
        };
      });
  }

  async reviewSubmission(user: JwtUser, submissionId: string, input: { grade?: number | null; comment?: string | null; status: string }) {
    const submission = await repository.findSubmissionWithScope(submissionId);
    if (!submission) throw new HttpError(404, 'Entrega no encontrada.');
    if (!hasSubjectManagementAccess(user, submission.assignment.unit.subject)) throw new HttpError(403, 'No tienes permisos para revisar esta entrega.');
    const updated = await repository.reviewSubmission(submissionId, {
      grade: input.grade ?? null,
      teacherComment: input.comment?.trim() || submission.teacherComment || null,
      status: input.status,
      reviewedById: user.id,
      reviewedAt: new Date()
    });
    if (input.comment?.trim()) {
      await repository.createSubmissionComment({
        submissionId,
        authorId: user.id,
        body: input.comment.trim()
      });
    }
    const refreshed = await repository.findSubmissionWithScope(submissionId);
    return serializeSubmission(refreshed ?? updated);
  }

  async replyToSubmission(user: JwtUser, submissionId: string, input: { comment?: string | null }) {
    const submission = await repository.findSubmissionWithScope(submissionId);
    if (!submission) throw new HttpError(404, 'Entrega no encontrada.');
    const { isOwnStudent, isGuardian } = canAccessSubmission(user, submission);
    if (!isOwnStudent && !isGuardian) throw new HttpError(403, 'No tienes permisos para responder este comentario.');
    if (submission.assignment.status === 'cerrado' || isLate(submission.assignment)) throw new HttpError(409, 'Este buzon esta cerrado.');
    const body = input.comment?.trim();
    if (!body) throw new HttpError(400, 'El comentario no puede estar vacio.');
    await repository.updateSubmissionReply(submissionId, body);
    await repository.createSubmissionComment({ submissionId, authorId: user.id, body });
    const refreshed = await repository.findSubmissionWithScope(submissionId);
    return serializeSubmission(refreshed);
  }

  async addSubmissionComment(user: JwtUser, submissionId: string, input: { body: string }) {
    const submission = await repository.findSubmissionWithScope(submissionId);
    if (!submission) throw new HttpError(404, 'Entrega no encontrada.');
    const { canAccess } = canAccessSubmission(user, submission);
    if (!canAccess) throw new HttpError(403, 'No tienes permisos para comentar esta entrega.');
    const body = input.body.trim();
    if (!body) throw new HttpError(400, 'El comentario no puede estar vacio.');
    await repository.createSubmissionComment({ submissionId, authorId: user.id, body });
    const refreshed = await repository.findSubmissionWithScope(submissionId);
    return serializeSubmission(refreshed);
  }

  async addAssignmentComment(user: JwtUser, assignmentId: string, input: { body: string }) {
    const assignment = await repository.findAssignmentScope(assignmentId);
    if (!assignment) throw new HttpError(404, 'Buzon no encontrado.');
    const allowedStudentIds = studentIdsForUser(user, assignment.unit.subject);
    const studentId = allowedStudentIds[0];
    if (!studentId || !allowedStudentIds.includes(studentId)) throw new HttpError(403, 'No tienes permisos para comentar esta entrega.');
    const body = input.body.trim();
    if (!body) throw new HttpError(400, 'El comentario no puede estar vacio.');
    const submission = await repository.ensureSubmissionForComment({
      assignmentId,
      studentId,
      authorId: user.id
    });
    await repository.createSubmissionComment({ submissionId: submission.id, authorId: user.id, body });
    const refreshed = await repository.findSubmissionWithScope(submission.id);
    return serializeSubmission(refreshed);
  }

  async deleteSubmissionComment(user: JwtUser, commentId: string) {
    const comment = await repository.findSubmissionCommentWithScope(commentId);
    if (!comment) throw new HttpError(404, 'Comentario no encontrado.');
    const { canReview } = canAccessSubmission(user, comment.submission);
    if (comment.authorId !== user.id && !canReview) throw new HttpError(403, 'No tienes permisos para borrar este comentario.');
    await repository.deleteSubmissionComment(commentId);
    return { ok: true };
  }

  async downloadSubmission(user: JwtUser, submissionId: string) {
    const submission = await repository.findSubmissionWithScope(submissionId);
    if (!submission) throw new HttpError(404, 'Entrega no encontrada.');
    const subject = submission.assignment.unit.subject;
    const canReview = hasSubjectManagementAccess(user, subject);
    const isOwnStudent = user.roles.includes('student') && submission.student.userId === user.id;
    const isGuardian = user.roles.includes('guardian') && submission.student.guardians.some((guardian: any) => guardian.guardian.userId === user.id);
    if (!canReview && !isOwnStudent && !isGuardian) throw new HttpError(403, 'No tienes permisos para descargar esta entrega.');
    const file = submission.files?.[0] ?? (submission.storagePath ? { storagePath: submission.storagePath, originalName: submission.originalName ?? 'entrega' } : null);
    if (!file) throw new HttpError(404, 'La entrega no tiene archivo descargable.');
    const uploadDir = submissionsUploadDir();
    const absolutePath = path.resolve(uploadDir, file.storagePath);
    const relative = path.relative(uploadDir, absolutePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new HttpError(400, 'Ruta de archivo invalida.');
    return {
      absolutePath,
      filename: file.originalName ?? 'entrega'
    };
  }

  async downloadSubmissionFile(user: JwtUser, fileId: string) {
    const file = await repository.findSubmissionFile(fileId);
    if (!file) throw new HttpError(404, 'Archivo no encontrado.');
    const submission = file.submission;
    const subject = submission.assignment.unit.subject;
    const canReview = hasSubjectManagementAccess(user, subject);
    const isOwnStudent = user.roles.includes('student') && submission.student.userId === user.id;
    const isGuardian = user.roles.includes('guardian') && submission.student.guardians.some((guardian: any) => guardian.guardian.userId === user.id);
    if (!canReview && !isOwnStudent && !isGuardian) throw new HttpError(403, 'No tienes permisos para descargar este archivo.');
    const uploadDir = submissionsUploadDir();
    const absolutePath = path.resolve(uploadDir, file.storagePath);
    const relative = path.relative(uploadDir, absolutePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new HttpError(400, 'Ruta de archivo invalida.');
    return { absolutePath, filename: file.originalName };
  }

  async deleteSubmissionFiles(user: JwtUser, submissionId: string, input: { fileIds: string[] }) {
    const submission = await repository.findSubmissionWithScope(submissionId);
    if (!submission) throw new HttpError(404, 'Entrega no encontrada.');
    const isOwnStudent = user.roles.includes('student') && submission.student.userId === user.id;
    const isGuardian = user.roles.includes('guardian') && submission.student.guardians.some((guardian: any) => guardian.guardian.userId === user.id);
    if (!isOwnStudent && !isGuardian) throw new HttpError(403, 'No tienes permisos para editar esta entrega.');
    if (submission.assignment.status === 'cerrado' || isLate(submission.assignment)) throw new HttpError(409, 'Este buzon ya no permite modificar entregas.');
    const files = (submission.files ?? []).filter((file: any) => input.fileIds.includes(file.id));
    await repository.deleteSubmissionFiles(files.map((file: any) => file.id));
    const uploadDir = submissionsUploadDir();
    await Promise.all(files.map(async (file: any) => {
      const absolutePath = path.resolve(uploadDir, file.storagePath);
      const relative = path.relative(uploadDir, absolutePath);
      if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
        await fs.unlink(absolutePath).catch(() => undefined);
      }
    }));
    return { ok: true };
  }
}
