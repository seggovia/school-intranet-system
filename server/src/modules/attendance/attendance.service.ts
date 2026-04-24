import { AttendanceRepository } from './attendance.repository.js';
import { HttpError } from '../../shared/http-error.js';
import type { JwtUser } from '../auth/auth.types.js';

const repository = new AttendanceRepository();

function serialize(item: Awaited<ReturnType<AttendanceRepository['create']>>) {
  return {
    id: item.id,
    student: item.student.user.name,
    course: `${item.enrollment.section.course.name} ${item.enrollment.section.name}`,
    date: item.date.toISOString().slice(0, 10),
    status: item.status,
    note: item.note
  };
}

export class AttendanceService {
  async list() {
    const attendance = await repository.list();
    return attendance.map(serialize);
  }

  private async assertCanWrite(user: JwtUser, enrollmentId: string) {
    if (user.roles.some((role) => ['admin', 'director', 'inspector'].includes(role))) return;
    const enrollment = await repository.findEnrollmentScope(enrollmentId);
    if (user.roles.includes('teacher') && enrollment?.section.headTeacher?.userId === user.id) return;
    throw new HttpError(403, 'No tienes permisos para modificar asistencia de este curso.');
  }

  async create(user: JwtUser, input: { enrollmentId: string; studentId: string; date: Date; status: string; note?: string }) {
    await this.assertCanWrite(user, input.enrollmentId);
    return serialize(await repository.create(input));
  }

  async bulkCreate(user: JwtUser, input: { date: Date; records: { enrollmentId: string; studentId: string; status: string; note?: string }[] }) {
    for (const record of input.records) {
      await this.assertCanWrite(user, record.enrollmentId);
    }
    const records = await repository.bulkCreate(input);
    return records.map(serialize);
  }

  async update(user: JwtUser, id: string, input: { status: string; note?: string }) {
    const attendance = await repository.findById(id);
    if (!attendance) throw new HttpError(404, 'Registro de asistencia no encontrado.');
    await this.assertCanWrite(user, attendance.enrollmentId);
    return serialize(await repository.update(id, input));
  }
}
