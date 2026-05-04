import { GradeRepository } from './grade.repository.js';
import { HttpError } from '../../shared/http-error.js';
import type { JwtUser } from '../auth/auth.types.js';
import { NotificationService } from '../notifications/notification.service.js';

const repository = new GradeRepository();
const notifications = new NotificationService();
const gradeStatuses = ['con_nota', 'pendiente', 'ausente', 'eximido'] as const;

function serialize(grade: Awaited<ReturnType<GradeRepository['create']>>) {
  return {
    id: grade.id,
    studentId: grade.studentId,
    student: grade.student.user.name,
    course: `${grade.enrollment.section.course.name} ${grade.enrollment.section.name}`,
    section: `${grade.enrollment.section.course.name} ${grade.enrollment.section.name}`,
    subject: grade.assessment.subject.name,
    assessment: grade.assessment.title,
    score: grade.score ?? 0
  };
}

function canSeeAll(user: JwtUser) {
  return user.roles.some((role) => ['admin', 'director', 'inspector'].includes(role));
}

function canWriteAll(user: JwtUser) {
  return user.roles.some((role) => ['admin', 'director'].includes(role));
}

function toDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function serializeEvaluation(evaluation: Awaited<ReturnType<GradeRepository['createEvaluation']>>) {
  return {
    id: evaluation.id,
    title: evaluation.title,
    subjectId: evaluation.subjectId,
    subject: evaluation.subject.name,
    sectionId: evaluation.sectionId,
    section: `${evaluation.section.course.name} ${evaluation.section.name}`,
    date: toDate(evaluation.date),
    weight: evaluation.weight,
    type: evaluation.type,
    description: evaluation.description,
    grades: evaluation.grades.length
  };
}

function summarizeGrades(grades: Array<{ score: number | null; status: string; assessment: { weight: number; subject: { id: string; name: string } } }>) {
  const scored = grades.filter((grade) => grade.status === 'con_nota' && grade.score !== null);
  const weightedTotal = scored.reduce((sum, grade) => sum + Number(grade.score) * grade.assessment.weight, 0);
  const weights = scored.reduce((sum, grade) => sum + grade.assessment.weight, 0);
  const average = weights ? Number((weightedTotal / weights).toFixed(1)) : null;
  const bySubject = new Map<string, { subjectId: string; subject: string; grades: typeof scored }>();
  scored.forEach((grade) => {
    const item = bySubject.get(grade.assessment.subject.id) ?? { subjectId: grade.assessment.subject.id, subject: grade.assessment.subject.name, grades: [] };
    item.grades.push(grade);
    bySubject.set(item.subjectId, item);
  });
  return {
    average,
    total: grades.length,
    scored: scored.length,
    pending: grades.filter((grade) => grade.status === 'pendiente').length,
    absent: grades.filter((grade) => grade.status === 'ausente').length,
    exempt: grades.filter((grade) => grade.status === 'eximido').length,
    subjects: Array.from(bySubject.values()).map((item) => {
      const total = item.grades.reduce((sum, grade) => sum + Number(grade.score) * grade.assessment.weight, 0);
      const weight = item.grades.reduce((sum, grade) => sum + grade.assessment.weight, 0);
      return { subjectId: item.subjectId, subject: item.subject, average: weight ? Number((total / weight).toFixed(1)) : null, grades: item.grades.length };
    })
  };
}

function serializeHistory(grades: Array<Awaited<ReturnType<GradeRepository['list']>>[number]>) {
  return grades.map((grade) => ({
    id: grade.id,
    evaluationId: grade.assessmentId,
    evaluation: grade.assessment.title,
    subject: grade.assessment.subject.name,
    section: `${grade.assessment.section.course.name} ${grade.assessment.section.name}`,
    date: toDate(grade.assessment.date),
    type: grade.assessment.type,
    weight: grade.assessment.weight,
    status: grade.status,
    score: grade.score,
    comment: grade.comment
  }));
}

export class GradeService {
  async list() {
    const grades = await repository.list();
    return grades.map(serialize);
  }

  private async assertCanWrite(user: JwtUser, enrollmentId: string) {
    if (canWriteAll(user)) return;
    const enrollment = await repository.findEnrollmentScope(enrollmentId);
    if (user.roles.includes('teacher') && enrollment?.section.headTeacher?.userId === user.id) return;
    throw new HttpError(403, 'No tienes permisos para modificar calificaciones de este curso.');
  }

  private async assertCanManageEvaluation(user: JwtUser, sectionId: string, subjectId: string, write = true) {
    if (canWriteAll(user) || (!write && canSeeAll(user))) return;
    if (!write && user.roles.includes('inspector')) return;
    if (user.roles.includes('teacher') && await repository.findTeacherAssignment(user.id, sectionId, subjectId)) return;
    throw new HttpError(403, 'No tienes permisos para esta seccion/asignatura.');
  }

  async create(user: JwtUser, input: { assessmentId: string; studentId: string; enrollmentId: string; score: number }) {
    await this.assertCanWrite(user, input.enrollmentId);
    const grade = await repository.create(input);
    await notifications.notifyStudentNetwork(grade.studentId, {
      title: 'Nueva calificación registrada',
      message: `${grade.assessment.subject.name}: ${grade.score ?? 0} en ${grade.assessment.title}.`,
      type: 'grade'
    });
    return serialize(grade);
  }

  async update(user: JwtUser, id: string, input: { score: number }) {
    const grade = await repository.findById(id);
    if (!grade) throw new HttpError(404, 'Calificacion no encontrada.');
    await this.assertCanWrite(user, grade.enrollmentId);
    const updated = await repository.update(id, input);
    await notifications.notifyStudentNetwork(updated.studentId, {
      title: 'Calificación actualizada',
      message: `${updated.assessment.subject.name}: ${updated.score ?? 0} en ${updated.assessment.title}.`,
      type: 'grade'
    });
    return serialize(updated);
  }

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

  async evaluations(user: JwtUser, input: { sectionId?: string; subjectId?: string }) {
    if (input.sectionId && input.subjectId) await this.assertCanManageEvaluation(user, input.sectionId, input.subjectId, false);
    const evaluations = await repository.listEvaluations(input);
    const visible = [];
    for (const evaluation of evaluations) {
      try {
        await this.assertCanManageEvaluation(user, evaluation.sectionId, evaluation.subjectId, false);
        visible.push(evaluation);
      } catch {
        // Filter evaluations outside the teacher's assignment.
      }
    }
    return visible.map(serializeEvaluation);
  }

  async createEvaluation(user: JwtUser, input: { title: string; subjectId: string; sectionId: string; date: Date; weight: number; type: string; description?: string }) {
    await this.assertCanManageEvaluation(user, input.sectionId, input.subjectId);
    if (!await repository.findSubjectSection(input.sectionId, input.subjectId)) throw new HttpError(400, 'La asignatura no esta asociada a la seccion.');
    return serializeEvaluation(await repository.createEvaluation(input));
  }

  async updateEvaluation(user: JwtUser, id: string, input: Partial<{ title: string; subjectId: string; sectionId: string; date: Date; weight: number; type: string; description?: string }>) {
    const current = await repository.findEvaluation(id);
    if (!current) throw new HttpError(404, 'Evaluacion no encontrada.');
    const sectionId = input.sectionId ?? current.sectionId;
    const subjectId = input.subjectId ?? current.subjectId;
    await this.assertCanManageEvaluation(user, current.sectionId, current.subjectId);
    await this.assertCanManageEvaluation(user, sectionId, subjectId);
    if (!await repository.findSubjectSection(sectionId, subjectId)) throw new HttpError(400, 'La asignatura no esta asociada a la seccion.');
    const data = { ...input } as Partial<{ title: string; subjectId: string; sectionId: string; date: Date; weight: number; type: string; description?: string | null }>;
    if ('description' in input) data.description = input.description ?? null;
    return serializeEvaluation(await repository.updateEvaluation(id, data));
  }

  async deleteEvaluation(user: JwtUser, id: string) {
    const evaluation = await repository.findEvaluation(id);
    if (!evaluation) throw new HttpError(404, 'Evaluacion no encontrada.');
    await this.assertCanManageEvaluation(user, evaluation.sectionId, evaluation.subjectId);
    if (evaluation.grades.length) throw new HttpError(400, 'No se puede eliminar una evaluacion con notas registradas.');
    await repository.deleteEvaluation(id);
    return { ok: true };
  }

  async records(user: JwtUser, evaluationId: string) {
    const evaluation = await repository.findEvaluation(evaluationId);
    if (!evaluation) throw new HttpError(404, 'Evaluacion no encontrada.');
    await this.assertCanManageEvaluation(user, evaluation.sectionId, evaluation.subjectId, false);
    const gradesByStudent = new Map(evaluation.grades.map((grade) => [grade.studentId, grade]));
    return {
      evaluation: serializeEvaluation(evaluation),
      students: evaluation.section.enrollments.map((enrollment) => {
        const grade = gradesByStudent.get(enrollment.studentId);
        return {
          studentId: enrollment.studentId,
          enrollmentId: enrollment.id,
          name: enrollment.student.user.name,
          email: enrollment.student.user.email,
          score: grade?.score ?? null,
          status: grade?.status ?? 'pendiente',
          comment: grade?.comment ?? '',
          registered: Boolean(grade),
          updatedAt: grade?.updatedAt?.toISOString() ?? null
        };
      })
    };
  }

  async bulk(user: JwtUser, input: { evaluationId: string; records: Array<{ studentId: string; status: string; score?: number | null; comment?: string | null }> }) {
    const evaluation = await repository.findEvaluation(input.evaluationId);
    if (!evaluation) throw new HttpError(404, 'Evaluacion no encontrada.');
    await this.assertCanManageEvaluation(user, evaluation.sectionId, evaluation.subjectId);
    const enrollmentByStudent = new Map(evaluation.section.enrollments.map((enrollment) => [enrollment.studentId, enrollment.id]));
    const records = input.records.map((record) => {
      if (!gradeStatuses.includes(record.status as (typeof gradeStatuses)[number])) throw new HttpError(400, 'Estado de nota invalido.');
      const enrollmentId = enrollmentByStudent.get(record.studentId);
      if (!enrollmentId) throw new HttpError(400, 'Un estudiante no pertenece a la seccion de la evaluacion.');
      return {
        enrollmentId,
        studentId: record.studentId,
        status: record.status,
        score: record.status === 'con_nota' ? record.score ?? null : null,
        comment: record.comment?.trim() || null
      };
    });
    const saved = await repository.bulkUpsert({ evaluationId: input.evaluationId, records });
    await Promise.all(saved
      .filter((grade) => grade.status === 'con_nota' && grade.score !== null)
      .map((grade) => notifications.notifyStudentNetwork(grade.studentId, {
        title: 'Nueva calificación registrada',
        message: `${grade.assessment.subject.name}: ${grade.score ?? 0} en ${grade.assessment.title}.`,
        type: 'grade'
      })));
    return { ok: true, records: records.length };
  }

  async me(user: JwtUser) {
    const student = await repository.findStudentByUser(user.id);
    if (!student) return { summary: summarizeGrades([]), history: [] };
    return { summary: summarizeGrades(student.grades), history: serializeHistory(student.grades) };
  }

  async guardian(user: JwtUser) {
    const guardian = await repository.findGuardianByUser(user.id);
    if (!guardian) return { students: [] };
    return {
      students: guardian.students.map((link) => ({
        id: link.student.id,
        name: link.student.user.name,
        summary: summarizeGrades(link.student.grades),
        history: serializeHistory(link.student.grades)
      }))
    };
  }

  async summary() {
    const sections = await repository.listSummary();
    return {
      sections: sections.map((section) => {
        const grades = section.enrollments.flatMap((enrollment) => enrollment.student.grades.filter((grade) => grade.assessment.sectionId === section.id));
        const summary = summarizeGrades(grades);
        return {
          id: section.id,
          name: `${section.course.name} ${section.name}`,
          average: summary.average,
          students: section.enrollments.length,
          belowAverage: section.enrollments.filter((enrollment) => {
            const studentGrades = enrollment.student.grades.filter((grade) => grade.assessment.sectionId === section.id);
            const average = summarizeGrades(studentGrades).average;
            return average !== null && average < 4;
          }).length,
          subjects: summary.subjects,
          recentEvaluations: section.assessments.slice(0, 5).map(serializeEvaluation)
        };
      })
    };
  }
}
