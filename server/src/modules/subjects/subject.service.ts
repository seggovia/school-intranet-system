import { SubjectRepository } from './subject.repository.js';
import type { JwtUser } from '../auth/auth.types.js';
import { HttpError } from '../../shared/http-error.js';

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
      { id: `${subjectId}-u${unitNumber}-guia`, type: 'guia', title: `Guia de aprendizaje Unidad ${unitNumber}`, status: 'disponible' },
      { id: `${subjectId}-u${unitNumber}-actividad`, type: 'actividad', title: `Actividad practica Unidad ${unitNumber}`, status: 'programada' },
      { id: `${subjectId}-u${unitNumber}-evaluacion`, type: 'evaluacion', title: `Evaluacion Unidad ${unitNumber}`, status: 'programada' }
    ]
  }));
}

function stringList(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : fallback;
}

function hasSubjectManagementAccess(user: JwtUser, subject: Awaited<ReturnType<SubjectRepository['findSubjectScope']>>) {
  if (!subject) return false;
  if (user.roles.some((role) => ['admin', 'director'].includes(role))) return true;
  if (!user.roles.includes('teacher')) return false;
  return subject.teachers.some((item) => item.teacher.userId === user.id)
    || subject.sections.some((item) => item.section.headTeacher?.userId === user.id);
}

function studentIdsForUser(user: JwtUser, subject: NonNullable<Awaited<ReturnType<SubjectRepository['findSubjectScope']>>>) {
  return subject.sections.flatMap((item) => item.section.enrollments)
    .filter((enrollment) => {
      if (user.roles.includes('student')) return enrollment.student.userId === user.id;
      if (user.roles.includes('guardian')) return enrollment.student.guardians.some((guardian) => guardian.guardian.userId === user.id);
      return false;
    })
    .map((enrollment) => enrollment.student.id);
}

function serializeUnit(unit: NonNullable<Awaited<ReturnType<SubjectRepository['findDetail']>>>['units'][number]) {
  return {
    id: unit.id,
    title: unit.title,
    description: unit.description,
    duration: unit.duration ?? '3 semanas',
    outcomes: stringList(unit.outcomes, []),
    bibliography: stringList(unit.bibliography, []),
    contents: [
      ...unit.materials.map((material) => ({
        id: material.id,
        type: material.type,
        title: material.title,
        status: material.status,
        fileUrl: material.fileUrl,
        owner: material.owner.name,
        updatedAt: material.updatedAt.toISOString().slice(0, 10)
      })),
      ...unit.assignments.map((assignment) => ({
        id: assignment.id,
        type: 'actividad',
        title: assignment.title,
        status: assignment.status,
        assignmentId: assignment.id,
        dueDate: assignment.dueDate?.toISOString().slice(0, 10) ?? null,
        submissions: assignment.submissions.map((submission) => ({
          id: submission.id,
          studentId: submission.studentId,
          student: submission.student.user.name,
          fileUrl: submission.fileUrl,
          comment: submission.comment,
          status: submission.status,
          submittedAt: submission.submittedAt.toISOString()
        }))
      }))
    ],
    assignments: unit.assignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate?.toISOString().slice(0, 10) ?? null,
      status: assignment.status,
      submissions: assignment.submissions.length
    }))
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
      units: subject.units.length ? subject.units.map(serializeUnit) : fallbackUnits(subject.id, subject.name),
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
      assessments: canViewStaffData(user) ? subject.assessments.map((assessment) => ({ id: assessment.id, title: assessment.title, date: assessment.date.toISOString().slice(0, 10), grades: assessment.grades.length })) : [],
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
    return serializeUnit({ ...unit, materials: [], assignments: [] });
  }

  async updateUnit(user: JwtUser, unitId: string, input: { title?: string; description?: string; duration?: string; outcomes?: string[]; bibliography?: string[]; order?: number }) {
    const unit = await repository.findUnitScope(unitId);
    if (!unit) throw new HttpError(404, 'Unidad no encontrada.');
    if (!hasSubjectManagementAccess(user, unit.subject)) throw new HttpError(403, 'No tienes permisos para editar esta unidad.');
    return serializeUnit(await repository.updateUnit(unitId, input));
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

  async deleteMaterial(user: JwtUser, materialId: string) {
    const material = await repository.findMaterialScope(materialId);
    if (!material) throw new HttpError(404, 'Material no encontrado.');
    const unit = await repository.findUnitScope(material.unitId);
    if (!unit || !hasSubjectManagementAccess(user, unit.subject)) throw new HttpError(403, 'No tienes permisos para eliminar este material.');
    await repository.deleteMaterial(materialId);
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
      type: 'actividad',
      title: assignment.title,
      status: assignment.status,
      assignmentId: assignment.id,
      dueDate: assignment.dueDate?.toISOString().slice(0, 10) ?? null,
      submissions: 0
    };
  }

  async submitAssignment(user: JwtUser, assignmentId: string, input: { fileUrl?: string; comment?: string; studentId?: string }) {
    const assignment = await repository.findAssignmentScope(assignmentId);
    if (!assignment) throw new HttpError(404, 'Entregable no encontrado.');
    const allowedStudentIds = studentIdsForUser(user, assignment.unit.subject);
    const studentId = input.studentId ?? allowedStudentIds[0];
    if (!studentId || !allowedStudentIds.includes(studentId)) throw new HttpError(403, 'No tienes permisos para enviar esta actividad.');
    const submission = await repository.submitAssignment({ assignmentId, studentId, authorId: user.id, fileUrl: input.fileUrl, comment: input.comment });
    return {
      id: submission.id,
      studentId: submission.studentId,
      student: submission.student.user.name,
      fileUrl: submission.fileUrl,
      comment: submission.comment,
      status: submission.status,
      submittedAt: submission.submittedAt.toISOString()
    };
  }
}
