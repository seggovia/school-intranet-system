import bcrypt from 'bcryptjs';
import { HttpError } from '../../shared/http-error.js';
import { AdminRepository } from './admin.repository.js';
import type {
  createAdminUserSchema,
  createClassroomSchema,
  createCourseSchema,
  createSectionSchema,
  createSubjectSchema,
  guardianStudentsSchema,
  guardianStudentDeleteSchema,
  sectionAssignSchema,
  statusSchema,
  subjectTeacherSchema,
  teacherAssignmentDeleteSchema,
  teacherAssignmentsSchema,
  updateAdminUserSchema,
  updateClassroomSchema,
  updateCourseSchema,
  updateSectionSchema,
  updateSubjectSchema
} from './admin.validators.js';
import type { z } from 'zod';

const repository = new AdminRepository();
const currentYear = () => new Date().getFullYear();
const temporaryPassword = 'demo1234';

type RoleName = 'admin' | 'director' | 'teacher' | 'student' | 'guardian' | 'inspector';
type CreateUserInput = z.infer<typeof createAdminUserSchema>;
type UpdateUserInput = z.infer<typeof updateAdminUserSchema>;
type StatusInput = z.infer<typeof statusSchema>;
type SectionAssignInput = z.infer<typeof sectionAssignSchema>;
type TeacherAssignmentsInput = z.infer<typeof teacherAssignmentsSchema>;
type GuardianStudentsInput = z.infer<typeof guardianStudentsSchema>;
type GuardianStudentDeleteInput = z.infer<typeof guardianStudentDeleteSchema>;
type TeacherAssignmentDeleteInput = z.infer<typeof teacherAssignmentDeleteSchema>;
type CreateCourseInput = z.infer<typeof createCourseSchema>;
type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
type CreateSectionInput = z.infer<typeof createSectionSchema>;
type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
type CreateClassroomInput = z.infer<typeof createClassroomSchema>;
type UpdateClassroomInput = z.infer<typeof updateClassroomSchema>;
type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
type SubjectTeacherInput = z.infer<typeof subjectTeacherSchema>;

function fullName(input: { name?: string; lastName?: string }) {
  return [input.name, input.lastName].filter(Boolean).join(' ').trim();
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'US';
}

function internalCode(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

function dateOrDefault(value?: string) {
  if (!value) return new Date('2008-01-01T00:00:00.000Z');
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new HttpError(400, 'Fecha invalida.');
  return parsed;
}

function serializeUser(user: { id: string; name: string; email: string; avatar: string; department: string; isActive: boolean; roles: Array<{ role: { name: string; label?: string } }> }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    department: user.department,
    roles: user.roles.map((item) => item.role.name),
    role: user.roles[0]?.role.name ?? 'student',
    isActive: user.isActive
  };
}

function serializeStudent(student: Awaited<ReturnType<AdminRepository['listStudents']>>[number]) {
  const enrollment = student.enrollments[0];
  return {
    id: student.id,
    userId: student.userId,
    name: student.user.name,
    email: student.user.email,
    rut: student.rut,
    birthDate: student.birthDate.toISOString().slice(0, 10),
    isActive: student.user.isActive,
    sectionId: enrollment?.sectionId ?? null,
    section: enrollment?.section.name ?? 'Sin seccion',
    course: enrollment?.section.course.name ?? 'Sin curso',
    classroom: enrollment?.section.classroom?.name ?? 'Sin sala',
    guardians: student.guardians.map((item) => ({ id: item.guardian.id, name: item.guardian.user.name, relationship: item.relationship }))
  };
}

function serializeTeacher(teacher: Awaited<ReturnType<AdminRepository['listTeachers']>>[number]) {
  return {
    id: teacher.id,
    userId: teacher.userId,
    name: teacher.user.name,
    email: teacher.user.email,
    employeeCode: teacher.employeeCode,
    specialty: teacher.subjects[0]?.subject.name ?? teacher.user.department,
    isActive: teacher.user.isActive,
    subjects: teacher.subjects.map((item) => ({ id: item.subject.id, name: item.subject.name })),
    sections: teacher.sections.map((section) => ({ id: section.id, name: section.name, course: section.course.name, classroom: section.classroom?.name ?? 'Sin sala' }))
  };
}

function serializeGuardian(guardian: Awaited<ReturnType<AdminRepository['listGuardians']>>[number]) {
  return {
    id: guardian.id,
    userId: guardian.userId,
    name: guardian.user.name,
    email: guardian.user.email,
    rut: guardian.rut ?? '',
    phone: guardian.phone,
    isActive: guardian.user.isActive,
    students: guardian.students.map((item) => ({ id: item.student.id, name: item.student.user.name, relationship: item.relationship }))
  };
}

function serializeCourse(course: Awaited<ReturnType<AdminRepository['listCourses']>>[number]) {
  return {
    id: course.id,
    name: course.name,
    levelId: course.levelId,
    level: course.level.name,
    isActive: course.isActive,
    sections: course.sections.length,
    students: course.sections.reduce((total, section) => total + section.enrollments.length, 0),
    subjects: course.subjects.map((item) => ({ id: item.subject.id, name: item.subject.name }))
  };
}

function serializeSection(section: Awaited<ReturnType<AdminRepository['listSections']>>[number]) {
  return {
    id: section.id,
    name: section.name,
    courseId: section.courseId,
    course: section.course.name,
    teacherId: section.teacherId,
    teacher: section.headTeacher?.user.name ?? 'Sin docente',
    classroomId: section.classroomId,
    classroom: section.classroom?.name ?? 'Sin sala',
    isActive: section.isActive,
    students: section.enrollments.length,
    subjects: section.subjects?.map((item) => ({ id: item.subject.id, name: item.subject.name })) ?? []
  };
}

function serializeClassroom(classroom: Awaited<ReturnType<AdminRepository['listClassrooms']>>[number]) {
  return {
    id: classroom.id,
    name: classroom.name,
    capacity: classroom.capacity,
    type: classroom.type,
    floor: classroom.floor,
    isActive: classroom.isActive,
    sections: classroom.sections.length,
    schedules: classroom.schedules.length
  };
}

function serializeSubject(subject: Awaited<ReturnType<AdminRepository['listSubjects']>>[number]) {
  return {
    id: subject.id,
    name: subject.name,
    code: subject.code,
    teachers: subject.teachers.map((item) => ({ id: item.teacher.id, name: item.teacher.user.name })),
    courses: subject.courses.map((item) => ({ id: item.course.id, name: item.course.name })),
    sections: subject.sections.map((item) => ({ id: item.section.id, name: item.section.name, course: item.section.course.name }))
  };
}

export class AdminService {
  private async ensureEmailAvailable(email: string | undefined, currentUserId: string) {
    if (!email) return;
    const existing = await repository.findUserByEmail(email);
    if (existing && existing.id !== currentUserId) throw new HttpError(409, 'Ya existe un usuario con ese correo.');
  }

  async summary() {
    const [[users, activeUsers, students, teachers, guardians, courses, sections, subjects], [roles, levels, classrooms, courseOptions, sectionOptions, subjectOptions, teacherOptions, studentOptions, guardianOptions]] = await Promise.all([
      repository.summary(),
      repository.options()
    ]);

    return {
      users,
      activeUsers,
      students,
      teachers,
      guardians,
      courses,
      sections,
      subjects,
      temporaryPassword,
      options: {
        roles: roles.map((role) => ({ id: role.name, label: role.label })),
        levels: levels.map((level) => ({ id: level.id, label: level.name })),
        classrooms: classrooms.map((classroom) => ({ id: classroom.id, label: classroom.name, meta: `${classroom.capacity} cupos · ${classroom.type ?? 'aula'}` })),
        courses: courseOptions.map((course) => ({ id: course.id, label: course.name, meta: course.level.name })),
        sections: sectionOptions.map((section) => ({ id: section.id, label: section.name, meta: `${section.course.name} · ${section.classroom?.name ?? 'Sin sala'}` })),
        subjects: subjectOptions.map((subject) => ({ id: subject.id, label: subject.name, meta: subject.code })),
        teachers: teacherOptions.map((teacher) => ({ id: teacher.id, label: teacher.user.name, meta: teacher.user.email })),
        students: studentOptions.map((student) => ({ id: student.id, label: student.user.name, meta: student.user.email })),
        guardians: guardianOptions.map((guardian) => ({ id: guardian.id, label: guardian.user.name, meta: guardian.user.email }))
      }
    };
  }

  async users() {
    const users = await repository.listUsers();
    return users.map((user) => ({
      ...serializeUser(user),
      teacherId: user.teacher?.id ?? null,
      studentId: user.student?.id ?? null,
      guardianId: user.guardian?.id ?? null,
      section: user.student?.enrollments[0]?.section.name ?? null,
      linkedStudents: user.guardian?.students.map((item) => item.student.user.name) ?? []
    }));
  }

  async createUser(input: CreateUserInput) {
    const name = fullName(input);
    const role = input.role as RoleName;
    const existing = await repository.findUserByEmail(input.email);
    if (existing) throw new HttpError(409, 'Ya existe un usuario con ese correo.');
    if (role === 'student' && input.rut && await repository.findStudentByRut(input.rut)) throw new HttpError(409, 'Ya existe un estudiante con ese RUT/identificador.');
    if (role === 'teacher' && input.rut && await repository.findTeacherByEmployeeCode(input.rut)) throw new HttpError(409, 'Ya existe un profesor con ese RUT/identificador.');
    if (role === 'guardian' && input.rut && await repository.findGuardianByRut(input.rut)) throw new HttpError(409, 'Ya existe un apoderado con ese RUT/identificador.');

    const roles = await repository.findRoles([role]);
    if (roles.length !== 1) throw new HttpError(400, 'El rol indicado no existe.');
    const passwordHash = await bcrypt.hash(input.password ?? temporaryPassword, 12);

    const user = await repository.transaction(async (tx) => {
      const created = await repository.createUser(tx, {
        name,
        email: input.email,
        passwordHash,
        avatar: initials(name),
        department: input.department ?? role,
        roleIds: roles.map((item) => item.id)
      });
      if (role === 'teacher') await repository.createTeacherProfile(tx, created.id, input.rut || internalCode('DOC'));
      if (role === 'student') {
        const student = await repository.createStudentProfile(tx, created.id, { rut: input.rut || internalCode('EST'), birthDate: dateOrDefault(input.birthDate) });
        if (input.sectionId) await repository.upsertEnrollment(tx, { studentId: student.id, sectionId: input.sectionId, year: currentYear() });
      }
      if (role === 'guardian') {
        const guardian = await repository.createGuardianProfile(tx, created.id, { phone: input.phone ?? '', rut: input.rut });
        if (input.studentIds?.length) await repository.replaceGuardianStudents(tx, { guardianId: guardian.id, studentIds: input.studentIds, relationship: input.relationship ?? 'Apoderado' });
      }
      if (['admin', 'director', 'inspector'].includes(role)) await repository.createStaffProfile(tx, created.id, { position: role, area: input.department ?? 'Administracion' });
      return created;
    });

    return serializeUser(user);
  }

  async updateUser(id: string, input: UpdateUserInput) {
    const current = await repository.findUserById(id);
    if (!current) throw new HttpError(404, 'Usuario no encontrado.');
    if (input.email && input.email !== current.email) {
      const existing = await repository.findUserByEmail(input.email);
      if (existing) throw new HttpError(409, 'Ya existe un usuario con ese correo.');
    }

    const roles = input.role ? await repository.findRoles([input.role]) : [];
    if (input.role && roles.length !== 1) throw new HttpError(400, 'El rol indicado no existe.');
    const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;

    const user = await repository.transaction(async (tx) => {
      const updatedName = input.name ? fullName(input) : undefined;
      const updated = await repository.updateUser(tx, id, {
        name: updatedName,
        email: input.email,
        department: input.department,
        avatar: updatedName ? initials(updatedName) : undefined,
        passwordHash
      });
      if (input.role) {
        await repository.replaceRoles(tx, id, roles.map((role) => role.id));
        if (input.role === 'teacher') await repository.createTeacherProfile(tx, id, input.rut || internalCode('DOC'));
        if (input.role === 'student') await repository.createStudentProfile(tx, id, { rut: input.rut || internalCode('EST'), birthDate: dateOrDefault(input.birthDate) });
        if (input.role === 'guardian') await repository.createGuardianProfile(tx, id, { phone: input.phone ?? '', rut: input.rut });
      }
      return updated;
    });
    return serializeUser(user);
  }

  async setUserStatus(id: string, input: StatusInput) {
    const current = await repository.findUserById(id);
    if (!current) throw new HttpError(404, 'Usuario no encontrado.');
    return serializeUser(await repository.setUserActive(id, input.isActive));
  }

  async resetUserPassword(id: string, input?: { password?: string }) {
    const current = await repository.findUserById(id);
    if (!current) throw new HttpError(404, 'Usuario no encontrado.');
    const password = input?.password || temporaryPassword;
    return { user: serializeUser(await repository.resetPassword(id, await bcrypt.hash(password, 12))), temporaryPassword: password };
  }

  async students() {
    return (await repository.listStudents()).map(serializeStudent);
  }

  async createStudent(input: CreateUserInput) {
    return this.createUser({ ...input, role: 'student' });
  }

  async updateStudent(id: string, input: UpdateUserInput) {
    const student = await repository.findStudent(id);
    if (!student) throw new HttpError(404, 'Estudiante no encontrado.');
    await this.ensureEmailAvailable(input.email, student.userId);
    if (input.rut) {
      const existing = await repository.findStudentByRut(input.rut);
      if (existing && existing.id !== id) throw new HttpError(409, 'Ya existe un estudiante con ese RUT/identificador.');
    }
    await repository.transaction(async (tx) => {
      await repository.updateUser(tx, student.userId, {
        name: input.name ? fullName(input) : undefined,
        email: input.email,
        department: input.department,
        avatar: input.name ? initials(fullName(input)) : undefined
      });
      await repository.updateStudent(tx, id, { rut: input.rut, birthDate: input.birthDate ? dateOrDefault(input.birthDate) : undefined });
      if (input.sectionId) await repository.moveStudentToSection(tx, { studentId: id, sectionId: input.sectionId, year: currentYear() });
    });
    return (await this.students()).find((item) => item.id === id);
  }

  async setStudentStatus(id: string, input: StatusInput) {
    const student = await repository.findStudent(id);
    if (!student) throw new HttpError(404, 'Estudiante no encontrado.');
    return serializeUser(await repository.setUserActive(student.userId, input.isActive));
  }

  async assignStudentSection(id: string, input: SectionAssignInput) {
    const student = await repository.findStudent(id);
    if (!student) throw new HttpError(404, 'Estudiante no encontrado.');
    await repository.transaction((tx) => repository.moveStudentToSection(tx, { studentId: id, sectionId: input.sectionId, year: currentYear() }));
    return (await this.students()).find((item) => item.id === id);
  }

  async clearStudentSection(id: string) {
    const student = await repository.findStudent(id);
    if (!student) throw new HttpError(404, 'Estudiante no encontrado.');
    await repository.transaction((tx) => repository.clearStudentSection(tx, { studentId: id, year: currentYear() }));
    return (await this.students()).find((item) => item.id === id);
  }

  async teachers() {
    return (await repository.listTeachers()).map(serializeTeacher);
  }

  async createTeacher(input: CreateUserInput) {
    return this.createUser({ ...input, role: 'teacher' });
  }

  async updateTeacher(id: string, input: UpdateUserInput) {
    const teacher = await repository.findTeacher(id);
    if (!teacher) throw new HttpError(404, 'Profesor no encontrado.');
    await this.ensureEmailAvailable(input.email, teacher.userId);
    if (input.rut) {
      const existing = await repository.findTeacherByEmployeeCode(input.rut);
      if (existing && existing.id !== id) throw new HttpError(409, 'Ya existe un profesor con ese RUT/identificador.');
    }
    await repository.transaction(async (tx) => {
      await repository.updateUser(tx, teacher.userId, {
        name: input.name ? fullName(input) : undefined,
        email: input.email,
        department: input.department,
        avatar: input.name ? initials(fullName(input)) : undefined
      });
      await repository.updateTeacher(tx, id, { employeeCode: input.rut });
    });
    return (await this.teachers()).find((item) => item.id === id);
  }

  async setTeacherStatus(id: string, input: StatusInput) {
    const teacher = await repository.findTeacher(id);
    if (!teacher) throw new HttpError(404, 'Profesor no encontrado.');
    return serializeUser(await repository.setUserActive(teacher.userId, input.isActive));
  }

  async assignTeacher(id: string, input: TeacherAssignmentsInput) {
    const teacher = await repository.findTeacher(id);
    if (!teacher) throw new HttpError(404, 'Profesor no encontrado.');
    await repository.transaction((tx) => repository.assignTeacher(tx, { teacherId: id, subjectIds: input.subjectIds ?? [], sectionIds: input.sectionIds ?? [] }));
    return (await this.teachers()).find((item) => item.id === id);
  }

  async removeTeacherAssignment(input: TeacherAssignmentDeleteInput) {
    const teacher = await repository.findTeacher(input.teacherId);
    if (!teacher) throw new HttpError(404, 'Profesor no encontrado.');
    await repository.transaction((tx) => repository.removeTeacherAssignment(tx, input));
    return { ok: true };
  }

  async guardians() {
    return (await repository.listGuardians()).map(serializeGuardian);
  }

  async createGuardian(input: CreateUserInput) {
    return this.createUser({ ...input, role: 'guardian' });
  }

  async updateGuardian(id: string, input: UpdateUserInput) {
    const guardian = await repository.findGuardian(id);
    if (!guardian) throw new HttpError(404, 'Apoderado no encontrado.');
    await this.ensureEmailAvailable(input.email, guardian.userId);
    if (input.rut) {
      const existing = await repository.findGuardianByRut(input.rut);
      if (existing && existing.id !== id) throw new HttpError(409, 'Ya existe un apoderado con ese RUT/identificador.');
    }
    await repository.transaction(async (tx) => {
      await repository.updateUser(tx, guardian.userId, {
        name: input.name ? fullName(input) : undefined,
        email: input.email,
        department: input.department,
        avatar: input.name ? initials(fullName(input)) : undefined
      });
      await repository.updateGuardian(tx, id, { phone: input.phone, rut: input.rut ?? undefined });
      if (input.studentIds) await repository.replaceGuardianStudents(tx, { guardianId: id, studentIds: input.studentIds, relationship: input.relationship ?? 'Apoderado' });
    });
    return (await this.guardians()).find((item) => item.id === id);
  }

  async setGuardianStatus(id: string, input: StatusInput) {
    const guardian = await repository.findGuardian(id);
    if (!guardian) throw new HttpError(404, 'Apoderado no encontrado.');
    return serializeUser(await repository.setUserActive(guardian.userId, input.isActive));
  }

  async linkGuardianStudents(id: string, input: GuardianStudentsInput) {
    const guardian = await repository.findGuardian(id);
    if (!guardian) throw new HttpError(404, 'Apoderado no encontrado.');
    await repository.transaction((tx) => repository.replaceGuardianStudents(tx, { guardianId: id, studentIds: input.studentIds, relationship: input.relationship ?? 'Apoderado' }));
    return (await this.guardians()).find((item) => item.id === id);
  }

  async unlinkGuardianStudent(input: GuardianStudentDeleteInput) {
    const guardian = await repository.findGuardian(input.guardianId);
    if (!guardian) throw new HttpError(404, 'Apoderado no encontrado.');
    await repository.transaction((tx) => repository.unlinkGuardianStudent(tx, input));
    return { ok: true };
  }

  async courses() {
    return (await repository.listCourses()).map(serializeCourse);
  }

  async createCourse(input: CreateCourseInput) {
    const existing = await repository.findCourseByNameLevel(input.name, input.levelId);
    if (existing) throw new HttpError(409, `Ya existe un curso ${input.name} para ese nivel.`);
    return serializeCourse(await repository.transaction((tx) => repository.createCourseWithSections(tx, {
      name: input.name,
      levelId: input.levelId,
      sections: input.sections ?? []
    })));
  }

  async updateCourse(id: string, input: UpdateCourseInput) {
    if (input.name || input.levelId) {
      const current = (await repository.listCourses()).find((item) => item.id === id);
      if (!current) throw new HttpError(404, 'Curso no encontrado.');
      const name = input.name ?? current.name;
      const levelId = input.levelId ?? current.levelId;
      const existing = await repository.findCourseByNameLevel(name, levelId);
      if (existing && existing.id !== id) throw new HttpError(409, `Ya existe un curso ${name} para ese nivel.`);
    }
    return serializeCourse(await repository.updateCourse(id, input));
  }

  async setCourseStatus(id: string, input: StatusInput) {
    const current = (await repository.listCourses()).find((item) => item.id === id);
    if (!current) throw new HttpError(404, 'Curso no encontrado.');
    if (!input.isActive && current.sections.some((section) => section.enrollments.length > 0)) throw new HttpError(400, 'No se puede desactivar un curso con estudiantes activos en sus secciones.');
    return serializeCourse(await repository.setCourseActive(id, input.isActive));
  }

  async sections() {
    return (await repository.listSections()).map(serializeSection);
  }

  async createSection(input: CreateSectionInput) {
    const existing = await repository.findSectionByCourseName(input.courseId, input.name);
    if (existing) throw new HttpError(409, `Ya existe una sección ${input.name} para ese curso.`);
    return serializeSection(await repository.createSection(input));
  }

  async updateSection(id: string, input: UpdateSectionInput) {
    if (input.name || input.courseId) {
      const current = await repository.findSection(id);
      if (!current) throw new HttpError(404, 'Seccion no encontrada.');
      const name = input.name ?? current.name;
      const courseId = input.courseId ?? current.courseId;
      const existing = await repository.findSectionByCourseName(courseId, name);
      if (existing && existing.id !== id) throw new HttpError(409, `Ya existe una sección ${name} para ese curso.`);
    }
    return serializeSection(await repository.updateSection(id, { ...input, teacherId: input.teacherId ?? undefined, classroomId: input.classroomId ?? undefined }));
  }

  async setSectionStatus(id: string, input: StatusInput) {
    const section = await repository.findSection(id);
    if (!section) throw new HttpError(404, 'Seccion no encontrada.');
    if (!input.isActive && section.enrollments.length) throw new HttpError(400, 'No se puede desactivar una seccion con estudiantes asignados.');
    return serializeSection(await repository.setSectionActive(id, input.isActive));
  }

  async deleteSection(id: string) {
    const section = await repository.findSection(id);
    if (!section) throw new HttpError(404, 'Seccion no encontrada.');
    if (section.enrollments.length) throw new HttpError(400, 'No se puede eliminar una seccion con estudiantes asignados.');
    if (section.subjects.length || section.schedules.length) throw new HttpError(400, 'No se puede eliminar una seccion en uso por asignaturas u horarios.');
    await repository.deleteSection(id);
    return { ok: true };
  }

  async classrooms() {
    return (await repository.listClassrooms()).map(serializeClassroom);
  }

  async createClassroom(input: CreateClassroomInput) {
    const existing = await repository.findClassroomByName(input.name);
    if (existing) throw new HttpError(409, 'Ya existe una sala con ese nombre.');
    return serializeClassroom(await repository.createClassroom(input));
  }

  async updateClassroom(id: string, input: UpdateClassroomInput) {
    const current = await repository.findClassroom(id);
    if (!current) throw new HttpError(404, 'Sala no encontrada.');
    if (input.name && input.name !== current.name) {
      const existing = await repository.findClassroomByName(input.name);
      if (existing) throw new HttpError(409, 'Ya existe una sala con ese nombre.');
    }
    return serializeClassroom(await repository.updateClassroom(id, input));
  }

  async setClassroomStatus(id: string, input: StatusInput) {
    const classroom = await repository.findClassroom(id);
    if (!classroom) throw new HttpError(404, 'Sala no encontrada.');
    if (!input.isActive && (classroom.sections.length || classroom.schedules.length)) throw new HttpError(400, 'No se puede desactivar una sala en uso.');
    return serializeClassroom(await repository.setClassroomActive(id, input.isActive));
  }

  async deleteClassroom(id: string) {
    const classroom = await repository.findClassroom(id);
    if (!classroom) throw new HttpError(404, 'Sala no encontrada.');
    if (classroom.sections.length || classroom.schedules.length) throw new HttpError(400, 'No se puede eliminar una sala en uso.');
    await repository.deleteClassroom(id);
    return { ok: true };
  }

  async subjects() {
    return (await repository.listSubjects()).map(serializeSubject);
  }

  async createSubject(input: CreateSubjectInput) {
    const existing = await repository.findSubjectByNameOrCode({ name: input.name, code: input.code });
    if (existing) throw new HttpError(409, 'Ya existe una asignatura con ese nombre o código.');
    const created = await repository.transaction(async (tx) => {
      const subject = await repository.createSubject(tx, { name: input.name, code: input.code });
      await repository.linkSubject(tx, { subjectId: subject.id, courseIds: input.courseIds ?? [], sectionIds: input.sectionIds ?? [], teacherIds: input.teacherIds ?? [] });
      return subject;
    });
    return (await this.subjects()).find((item) => item.id === created.id);
  }

  async updateSubject(id: string, input: UpdateSubjectInput) {
    if (input.name || input.code) {
      const existing = await repository.findSubjectByNameOrCode({ name: input.name, code: input.code });
      if (existing && existing.id !== id) throw new HttpError(409, 'Ya existe una asignatura con ese nombre o código.');
    }
    await repository.transaction(async (tx) => {
      await repository.updateSubject(tx, id, { name: input.name, code: input.code });
      await repository.linkSubject(tx, { subjectId: id, courseIds: input.courseIds ?? [], sectionIds: input.sectionIds ?? [], teacherIds: input.teacherIds ?? [] });
    });
    return (await this.subjects()).find((item) => item.id === id);
  }

  async assignSubjectTeacher(id: string, input: SubjectTeacherInput) {
    await repository.transaction((tx) => repository.assignSubjectTeacher(tx, { subjectId: id, teacherId: input.teacherId, sectionId: input.sectionId }));
    return (await this.subjects()).find((item) => item.id === id);
  }

  async assignments() {
    const [teachers, students, guardians, subjects, sections] = await Promise.all([this.teachers(), this.students(), this.guardians(), this.subjects(), this.sections()]);
    return { teachers, students, guardians, subjects, sections };
  }
}
