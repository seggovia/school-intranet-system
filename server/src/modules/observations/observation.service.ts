import type { JwtUser } from '../auth/auth.types.js';
import { HttpError } from '../../shared/http-error.js';
import { NotificationService } from '../notifications/notification.service.js';
import { ObservationRepository } from './observation.repository.js';
import { observationTypeSchema } from './observation.validators.js';

const repository = new ObservationRepository();
const notifications = new NotificationService();

type ObservationRow = Awaited<ReturnType<ObservationRepository['create']>>;

function canSeeAll(user: JwtUser) {
  return user.roles.some((role) => ['admin', 'inspector'].includes(role));
}

function canManage(user: JwtUser) {
  return user.roles.some((role) => ['admin', 'teacher', 'inspector'].includes(role));
}

function teacherCanAccessStudent(user: JwtUser, student: Awaited<ReturnType<ObservationRepository['findStudentScope']>>) {
  if (!student) return false;
  return student.enrollments.some((enrollment) =>
    enrollment.section.headTeacher?.userId === user.id ||
    enrollment.section.schedules.some((schedule) => schedule.teacher.userId === user.id)
  );
}

function serialize(observation: ObservationRow) {
  return {
    id: observation.id,
    studentId: observation.studentId,
    student: observation.student.user.name,
    authorId: observation.authorId,
    author: observation.author.name,
    sectionId: observation.sectionId,
    section: observation.section ? `${observation.section.course.name} ${observation.section.name}` : null,
    body: observation.body,
    type: observation.type,
    date: observation.date.toISOString().slice(0, 10),
    isVisible: observation.isVisible,
    createdAt: observation.createdAt.toISOString()
  };
}

export class ObservationService {
  async list(user: JwtUser, input: { studentId?: string; sectionId?: string; visibleOnly?: boolean }) {
    if (!canManage(user)) throw new HttpError(403, 'No tienes permisos para ver anotaciones.');
    if (input.studentId && !canSeeAll(user)) {
      const student = await repository.findStudentScope(input.studentId);
      if (!student) throw new HttpError(404, 'Estudiante no encontrado.');
      if (!teacherCanAccessStudent(user, student)) throw new HttpError(403, 'No tienes permisos para este estudiante.');
    }
    const observations = await repository.list(input);
    return observations.map(serialize);
  }

  async listVisibleForStudents(studentIds: string[]) {
    const observations = await repository.listVisibleForStudentIds(studentIds);
    return observations.map(serialize);
  }

  async create(user: JwtUser, input: { studentId: string; sectionId?: string; body: string; type: string; date: Date; isVisible: boolean }) {
    if (!canManage(user)) throw new HttpError(403, 'No tienes permisos para crear anotaciones.');
    const parsedType = observationTypeSchema.safeParse(input.type);
    if (!parsedType.success) throw new HttpError(400, 'Tipo de anotacion invalido.');
    if (input.date.getTime() > Date.now()) throw new HttpError(400, 'La fecha no puede ser futura.');
    const student = await repository.findStudentScope(input.studentId);
    if (!student) throw new HttpError(404, 'Estudiante no encontrado.');
    if (!canSeeAll(user) && !teacherCanAccessStudent(user, student)) throw new HttpError(403, 'No tienes permisos para este estudiante.');

    const observation = await repository.create({
      studentId: input.studentId,
      authorId: user.id,
      sectionId: input.sectionId,
      body: input.body,
      type: parsedType.data,
      date: input.date,
      isVisible: input.isVisible
    });

    if (parsedType.data === 'negativa') {
      await notifications.notifyStudentNetwork(input.studentId, {
        title: 'Nueva anotacion registrada',
        message: `Se registro una anotacion negativa en tu ficha estudiantil.`,
        type: 'system'
      });
    }

    return serialize(observation);
  }

  async delete(user: JwtUser, id: string) {
    const observation = await repository.findById(id);
    if (!observation) throw new HttpError(404, 'Anotacion no encontrada.');
    if (!user.roles.includes('admin') && observation.authorId !== user.id) throw new HttpError(403, 'Solo puedes eliminar tus propias anotaciones.');
    await repository.delete(id);
    return { ok: true };
  }
}
