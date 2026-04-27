import { AttendanceRepository } from './attendance.repository.js';
import { HttpError } from '../../shared/http-error.js';
import type { JwtUser } from '../auth/auth.types.js';

const repository = new AttendanceRepository();
const statuses = ['presente', 'ausente', 'atrasado', 'justificado'] as const;

function dateOnly(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function todayOnly() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function canSeeAll(user: JwtUser) {
  return user.roles.some((role) => ['admin', 'director', 'inspector'].includes(role));
}

function summarize(records: Array<{ status: string }>) {
  const total = records.length || 1;
  const counts = Object.fromEntries(statuses.map((status) => [status, records.filter((record) => record.status === status).length])) as Record<string, number>;
  return { ...counts, total: records.length, percentage: Math.round(((counts.presente + counts.atrasado + counts.justificado) / total) * 100) };
}

function serializeHistory(records: Array<{ id: string; date: Date; status: string; note: string | null; subject: { name: string }; section: { name: string; course: { name: string } } }>) {
  return records.map((record) => ({
    id: record.id,
    date: record.date.toISOString().slice(0, 10),
    subject: record.subject.name,
    section: `${record.section.course.name} ${record.section.name}`,
    status: record.status,
    note: record.note
  }));
}

export class AttendanceService {
  async context(user: JwtUser) {
    const sections = canSeeAll(user) ? await repository.listAllContext() : await repository.listTeacherContext(user.id);
    return {
      sections: sections.map((section) => ({
        id: section.id,
        name: `${section.course.name} ${section.name}`,
        subjects: section.subjects.map((item) => ({ id: item.subject.id, name: item.subject.name, code: item.subject.code }))
      }))
    };
  }

  private async assertCanManage(user: JwtUser, sectionId: string, subjectId: string) {
    if (canSeeAll(user)) return;
    if (user.roles.includes('teacher') && await repository.findTeacherAssignment(user.id, sectionId, subjectId)) return;
    throw new HttpError(403, 'No tienes permisos para registrar asistencia en esta seccion/asignatura.');
  }

  async records(user: JwtUser, input: { sectionId: string; subjectId: string; date: Date }) {
    await this.assertCanManage(user, input.sectionId, input.subjectId);
    const section = await repository.findSection(input.sectionId);
    if (!section) throw new HttpError(404, 'Seccion no encontrada.');
    const subjectLink = await repository.findSubjectSection(input.sectionId, input.subjectId);
    if (!subjectLink) throw new HttpError(400, 'La asignatura no esta asociada a la seccion.');
    const date = dateOnly(input.date);
    const records = await repository.findRecords({ sectionId: input.sectionId, subjectId: input.subjectId, date });
    const byStudent = new Map(records.map((record) => [record.studentId, record]));
    const subject = section.subjects.find((item) => item.subjectId === input.subjectId)?.subject;
    return {
      section: { id: section.id, name: `${section.course.name} ${section.name}` },
      subject: subject ? { id: subject.id, name: subject.name } : null,
      date: date.toISOString().slice(0, 10),
      students: section.enrollments.map((enrollment) => {
        const record = byStudent.get(enrollment.studentId);
        return {
          studentId: enrollment.studentId,
          enrollmentId: enrollment.id,
          name: enrollment.student.user.name,
          email: enrollment.student.user.email,
          status: record?.status ?? 'sin_registrar',
          note: record?.note ?? '',
          registered: Boolean(record),
          updatedAt: record?.updatedAt?.toISOString() ?? null
        };
      })
    };
  }

  async bulk(user: JwtUser, input: { sectionId: string; subjectId: string; date: Date; records: Array<{ studentId: string; status: string; note?: string }> }) {
    await this.assertCanManage(user, input.sectionId, input.subjectId);
    const date = dateOnly(input.date);
    if (date > todayOnly()) throw new HttpError(400, 'No se puede registrar asistencia futura.');
    const section = await repository.findSection(input.sectionId);
    if (!section) throw new HttpError(404, 'Seccion no encontrada.');
    if (!await repository.findSubjectSection(input.sectionId, input.subjectId)) throw new HttpError(400, 'La asignatura no esta asociada a la seccion.');
    const enrollmentByStudent = new Map(section.enrollments.map((enrollment) => [enrollment.studentId, enrollment.id]));
    const normalized = input.records.map((record) => {
      const enrollmentId = enrollmentByStudent.get(record.studentId);
      if (!enrollmentId) throw new HttpError(400, 'Un estudiante no pertenece a la seccion.');
      return { enrollmentId, studentId: record.studentId, status: record.status, note: record.note };
    });
    const saved = await repository.bulkUpsert({ sectionId: input.sectionId, subjectId: input.subjectId, date, userId: user.id, records: normalized });
    return { ok: true, records: saved.length };
  }

  async me(user: JwtUser) {
    const student = await repository.findStudentByUser(user.id);
    if (!student) return { summary: summarize([]), history: [] };
    return { summary: summarize(student.attendance), history: serializeHistory(student.attendance) };
  }

  async guardian(user: JwtUser) {
    const guardian = await repository.findGuardianByUser(user.id);
    if (!guardian) return { students: [] };
    return {
      students: guardian.students.map((link) => ({
        id: link.student.id,
        name: link.student.user.name,
        summary: summarize(link.student.attendance),
        history: serializeHistory(link.student.attendance)
      }))
    };
  }

  async summary() {
    const date = todayOnly();
    const sections = await repository.listSummary(date);
    const allRecords = sections.flatMap((section) => section.attendance);
    return {
      date: date.toISOString().slice(0, 10),
      totals: summarize(allRecords),
      sections: sections.map((section) => ({ id: section.id, name: `${section.course.name} ${section.name}`, students: section.enrollments.length, records: section.attendance.length, summary: summarize(section.attendance) }))
    };
  }
}
