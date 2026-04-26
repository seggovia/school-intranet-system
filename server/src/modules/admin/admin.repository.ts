import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/db.js';

type Tx = Prisma.TransactionClient;

const userSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  department: true,
  isActive: true,
  roles: { include: { role: true } }
};

export class AdminRepository {
  transaction<T>(handler: (tx: Tx) => Promise<T>) {
    return prisma.$transaction(handler);
  }

  summary() {
    return Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.guardian.count(),
      prisma.course.count(),
      prisma.section.count(),
      prisma.subject.count()
    ]);
  }

  options() {
    return Promise.all([
      prisma.role.findMany({ orderBy: { label: 'asc' } }),
      prisma.schoolLevel.findMany({ orderBy: { order: 'asc' } }),
      prisma.classroom.findMany({ orderBy: { name: 'asc' } }),
      prisma.course.findMany({ include: { level: true }, orderBy: { name: 'asc' } }),
      prisma.section.findMany({ include: { course: true, classroom: true }, orderBy: [{ course: { name: 'asc' } }, { name: 'asc' }] }),
      prisma.subject.findMany({ orderBy: { name: 'asc' } }),
      prisma.teacher.findMany({ include: { user: true }, orderBy: { user: { name: 'asc' } } }),
      prisma.student.findMany({ include: { user: true }, orderBy: { user: { name: 'asc' } } }),
      prisma.guardian.findMany({ include: { user: true }, orderBy: { user: { name: 'asc' } } })
    ]);
  }

  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: userSelect });
  }

  findRoles(names: string[]) {
    return prisma.role.findMany({ where: { name: { in: names } } });
  }

  listUsers() {
    return prisma.user.findMany({
      select: {
        ...userSelect,
        teacher: true,
        student: { include: { enrollments: { include: { section: { include: { course: true } } }, orderBy: { year: 'desc' }, take: 1 } } },
        guardian: { include: { students: { include: { student: { include: { user: true } } } } } }
      },
      orderBy: { name: 'asc' }
    });
  }

  createUser(tx: Tx, input: { name: string; email: string; passwordHash: string; avatar: string; department: string; roleIds: string[] }) {
    return tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        avatar: input.avatar,
        department: input.department,
        roles: { create: input.roleIds.map((roleId) => ({ roleId })) }
      },
      select: userSelect
    });
  }

  updateUser(tx: Tx, id: string, input: Partial<{ name: string; email: string; department: string; avatar: string; passwordHash: string }>) {
    return tx.user.update({ where: { id }, data: input, select: userSelect });
  }

  replaceRoles(tx: Tx, userId: string, roleIds: string[]) {
    return Promise.all([
      tx.userRole.deleteMany({ where: { userId } }),
      tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId, roleId })), skipDuplicates: true })
    ]);
  }

  setUserActive(id: string, isActive: boolean) {
    return prisma.user.update({ where: { id }, data: { isActive }, select: userSelect });
  }

  resetPassword(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash }, select: userSelect });
  }

  createTeacherProfile(tx: Tx, userId: string, employeeCode: string) {
    return tx.teacher.upsert({ where: { userId }, update: {}, create: { userId, employeeCode } });
  }

  createStudentProfile(tx: Tx, userId: string, input: { rut: string; birthDate: Date }) {
    return tx.student.upsert({ where: { userId }, update: { rut: input.rut, birthDate: input.birthDate }, create: { userId, rut: input.rut, birthDate: input.birthDate } });
  }

  createGuardianProfile(tx: Tx, userId: string, phone: string) {
    return tx.guardian.upsert({ where: { userId }, update: { phone }, create: { userId, phone } });
  }

  createStaffProfile(tx: Tx, userId: string, input: { position: string; area: string }) {
    return tx.staff.upsert({ where: { userId }, update: input, create: { userId, ...input } });
  }

  listStudents() {
    return prisma.student.findMany({
      include: {
        user: true,
        enrollments: { include: { section: { include: { course: true, classroom: true } } }, orderBy: { year: 'desc' } },
        guardians: { include: { guardian: { include: { user: true } } } }
      },
      orderBy: { user: { name: 'asc' } }
    });
  }

  findStudent(id: string) {
    return prisma.student.findUnique({ where: { id }, include: { user: true } });
  }

  updateStudent(tx: Tx, id: string, input: Partial<{ rut: string; birthDate: Date }>) {
    return tx.student.update({ where: { id }, data: input, include: { user: true } });
  }

  upsertEnrollment(tx: Tx, input: { studentId: string; sectionId: string; year: number }) {
    return tx.enrollment.upsert({
      where: { studentId_sectionId_year: { studentId: input.studentId, sectionId: input.sectionId, year: input.year } },
      update: { status: 'activo' },
      create: { ...input, status: 'activo' }
    });
  }

  moveStudentToSection(tx: Tx, input: { studentId: string; sectionId: string; year: number }) {
    return tx.enrollment.findFirst({ where: { studentId: input.studentId, year: input.year } }).then((current) => {
      if (current) {
        return tx.enrollment.update({ where: { id: current.id }, data: { sectionId: input.sectionId, status: 'activo' } });
      }
      return tx.enrollment.create({ data: { ...input, status: 'activo' } });
    });
  }

  listTeachers() {
    return prisma.teacher.findMany({
      include: {
        user: true,
        subjects: { include: { subject: true } },
        sections: { include: { course: true, classroom: true } }
      },
      orderBy: { user: { name: 'asc' } }
    });
  }

  findTeacher(id: string) {
    return prisma.teacher.findUnique({ where: { id }, include: { user: true } });
  }

  updateTeacher(tx: Tx, id: string, input: Partial<{ employeeCode: string }>) {
    return tx.teacher.update({ where: { id }, data: input, include: { user: true } });
  }

  assignTeacher(tx: Tx, input: { teacherId: string; subjectIds: string[]; sectionIds: string[] }) {
    const subjectLinks = input.subjectIds.map((subjectId) =>
      tx.teacherSubject.upsert({ where: { teacherId_subjectId: { teacherId: input.teacherId, subjectId } }, update: {}, create: { teacherId: input.teacherId, subjectId } })
    );
    const sectionUpdates = input.sectionIds.map((sectionId) => tx.section.update({ where: { id: sectionId }, data: { teacherId: input.teacherId } }));
    const sectionSubjectLinks = input.sectionIds.flatMap((sectionId) =>
      input.subjectIds.map((subjectId) =>
        tx.subjectSection.upsert({ where: { sectionId_subjectId: { sectionId, subjectId } }, update: {}, create: { sectionId, subjectId } })
      )
    );
    return Promise.all([...subjectLinks, ...sectionUpdates, ...sectionSubjectLinks]);
  }

  listGuardians() {
    return prisma.guardian.findMany({
      include: { user: true, students: { include: { student: { include: { user: true } } } } },
      orderBy: { user: { name: 'asc' } }
    });
  }

  findGuardian(id: string) {
    return prisma.guardian.findUnique({ where: { id }, include: { user: true } });
  }

  updateGuardian(tx: Tx, id: string, input: Partial<{ phone: string }>) {
    return tx.guardian.update({ where: { id }, data: input, include: { user: true } });
  }

  replaceGuardianStudents(tx: Tx, input: { guardianId: string; studentIds: string[]; relationship: string }) {
    return tx.guardianStudent.deleteMany({ where: { guardianId: input.guardianId } }).then(() =>
      tx.guardianStudent.createMany({
        data: input.studentIds.map((studentId) => ({ guardianId: input.guardianId, studentId, relationship: input.relationship })),
        skipDuplicates: true
      })
    );
  }

  listCourses() {
    return prisma.course.findMany({ include: { level: true, sections: { include: { enrollments: true } }, subjects: { include: { subject: true } } }, orderBy: { name: 'asc' } });
  }

  createCourse(input: { name: string; levelId: string }) {
    return prisma.course.create({ data: input, include: { level: true, sections: { include: { enrollments: true } }, subjects: { include: { subject: true } } } });
  }

  updateCourse(id: string, input: Partial<{ name: string; levelId: string }>) {
    return prisma.course.update({ where: { id }, data: input, include: { level: true, sections: { include: { enrollments: true } }, subjects: { include: { subject: true } } } });
  }

  listSections() {
    return prisma.section.findMany({
      include: { course: true, classroom: true, headTeacher: { include: { user: true } }, enrollments: true, subjects: { include: { subject: true } } },
      orderBy: [{ course: { name: 'asc' } }, { name: 'asc' }]
    });
  }

  createSection(input: { name: string; courseId: string; teacherId?: string; classroomId?: string }) {
    return prisma.section.create({ data: input, include: { course: true, classroom: true, headTeacher: { include: { user: true } }, enrollments: true, subjects: { include: { subject: true } } } });
  }

  updateSection(id: string, input: Partial<{ name: string; courseId: string; teacherId: string | null; classroomId: string | null }>) {
    return prisma.section.update({ where: { id }, data: input, include: { course: true, classroom: true, headTeacher: { include: { user: true } }, enrollments: true, subjects: { include: { subject: true } } } });
  }

  listSubjects() {
    return prisma.subject.findMany({
      include: { teachers: { include: { teacher: { include: { user: true } } } }, courses: { include: { course: true } }, sections: { include: { section: { include: { course: true } } } } },
      orderBy: { name: 'asc' }
    });
  }

  createSubject(tx: Tx, input: { name: string; code: string }) {
    return tx.subject.create({ data: input });
  }

  updateSubject(tx: Tx, id: string, input: Partial<{ name: string; code: string }>) {
    return tx.subject.update({ where: { id }, data: input });
  }

  linkSubject(tx: Tx, input: { subjectId: string; courseIds: string[]; sectionIds: string[]; teacherIds: string[] }) {
    return Promise.all([
      ...input.courseIds.map((courseId) => tx.courseSubject.upsert({ where: { courseId_subjectId: { courseId, subjectId: input.subjectId } }, update: {}, create: { courseId, subjectId: input.subjectId } })),
      ...input.sectionIds.map((sectionId) => tx.subjectSection.upsert({ where: { sectionId_subjectId: { sectionId, subjectId: input.subjectId } }, update: {}, create: { sectionId, subjectId: input.subjectId } })),
      ...input.teacherIds.map((teacherId) => tx.teacherSubject.upsert({ where: { teacherId_subjectId: { teacherId, subjectId: input.subjectId } }, update: {}, create: { teacherId, subjectId: input.subjectId } }))
    ]);
  }

  assignSubjectTeacher(tx: Tx, input: { subjectId: string; teacherId: string; sectionId?: string }) {
    const operations: Array<Promise<unknown>> = [
      tx.teacherSubject.upsert({ where: { teacherId_subjectId: { teacherId: input.teacherId, subjectId: input.subjectId } }, update: {}, create: { teacherId: input.teacherId, subjectId: input.subjectId } })
    ];
    if (input.sectionId) {
      operations.push(tx.subjectSection.upsert({ where: { sectionId_subjectId: { sectionId: input.sectionId, subjectId: input.subjectId } }, update: {}, create: { sectionId: input.sectionId, subjectId: input.subjectId } }));
      operations.push(tx.section.update({ where: { id: input.sectionId }, data: { teacherId: input.teacherId } }));
    }
    return Promise.all(operations);
  }
}
