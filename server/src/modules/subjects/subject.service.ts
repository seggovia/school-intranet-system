import { SubjectRepository } from './subject.repository.js';
import type { JwtUser } from '../auth/auth.types.js';
import { HttpError } from '../../shared/http-error.js';

const repository = new SubjectRepository();

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
      if (user.roles.includes('teacher')) return section.headTeacher?.userId === user.id;
      if (user.roles.includes('student')) return section.enrollments.some((enrollment) => enrollment.student.userId === user.id);
      if (user.roles.includes('guardian')) return section.enrollments.some((enrollment) => enrollment.student.guardians.some((item) => item.guardian.userId === user.id));
      return false;
    });

    if (!visibleSections.length) throw new HttpError(403, 'No tienes permisos para ver esta asignatura.');

    const materials = await repository.listDocumentsByCategory(subject.name);
    return {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      units: [
        { id: `${subject.id}-u1`, title: `Unidad 1 - Fundamentos de ${subject.name}`, topics: ['Conceptos base', 'Practica guiada', 'Evaluacion formativa'] },
        { id: `${subject.id}-u2`, title: `Unidad 2 - Aplicacion`, topics: ['Resolucion de problemas', 'Trabajo colaborativo', 'Proyecto de cierre'] }
      ],
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
      assessments: subject.assessments.map((assessment) => ({ id: assessment.id, title: assessment.title, date: assessment.date.toISOString().slice(0, 10), grades: assessment.grades.length })),
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
}
