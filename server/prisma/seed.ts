import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/db.js';

const password = 'demo1234';

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  const permissions = [
    'dashboard:read',
    'users:manage',
    'roles:manage',
    'academics:manage',
    'attendance:manage',
    'grades:manage',
    'communications:manage',
    'documents:manage',
    'requests:manage',
    'profile:read'
  ];

  for (const key of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: `Permiso ${key}` }
    });
  }

  const roleDefinitions = [
    { name: 'admin', label: 'Administrador', permissions },
    { name: 'director', label: 'Director', permissions: permissions.filter((key) => key !== 'roles:manage') },
    { name: 'teacher', label: 'Docente', permissions: ['dashboard:read', 'academics:manage', 'attendance:manage', 'grades:manage', 'communications:manage', 'profile:read'] },
    { name: 'student', label: 'Estudiante', permissions: ['dashboard:read', 'profile:read'] },
    { name: 'guardian', label: 'Apoderado', permissions: ['dashboard:read', 'requests:manage', 'profile:read'] },
    { name: 'inspector', label: 'Inspector', permissions: ['dashboard:read', 'attendance:manage', 'requests:manage', 'profile:read'] }
  ];

  for (const role of roleDefinitions) {
    const savedRole = await prisma.role.upsert({
      where: { name: role.name },
      update: { label: role.label },
      create: { name: role.name, label: role.label }
    });

    for (const permissionKey of role.permissions) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key: permissionKey } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: savedRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: savedRole.id, permissionId: permission.id }
      });
    }
  }

  const createUser = async (input: { name: string; email: string; avatar: string; department: string; role: string }) => {
    const user = await prisma.user.upsert({
      where: { email: input.email },
      update: { name: input.name, avatar: input.avatar, department: input.department, passwordHash, isActive: true },
      create: { name: input.name, email: input.email, avatar: input.avatar, department: input.department, passwordHash }
    });
    const role = await prisma.role.findUniqueOrThrow({ where: { name: input.role } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id }
    });
    return user;
  };

  const director = await createUser({ name: 'Morgan Carter', email: 'director@school-intranet.test', avatar: 'MC', department: 'Direccion', role: 'director' });
  const teacherUser = await createUser({ name: 'Taylor Rivera', email: 'teacher@school-intranet.test', avatar: 'TR', department: 'Matematica', role: 'teacher' });
  const teacherUser2 = await createUser({ name: 'Valentina Soto', email: 'teacher2@school-intranet.test', avatar: 'VS', department: 'Lenguaje', role: 'teacher' });
  const cristianUser = await createUser({ name: 'Cristian Segovia', email: 'cristian.segovia@school-intranet.test', avatar: 'CS', department: 'Matematica', role: 'teacher' });
  const guardianUser = await createUser({ name: 'Jordan Lee', email: 'guardian@school-intranet.test', avatar: 'JL', department: 'Familias', role: 'guardian' });
  const guardianUser2 = await createUser({ name: 'Mariana Torres', email: 'guardian2@school-intranet.test', avatar: 'MT', department: 'Familias', role: 'guardian' });
  const studentUser = await createUser({ name: 'Alex Morgan', email: 'student@school-intranet.test', avatar: 'AM', department: '8 Basico A', role: 'student' });
  const adminUser = await createUser({ name: 'Casey Brooks', email: 'admin@school-intranet.test', avatar: 'CB', department: 'Administracion', role: 'admin' });
  const inspectorUser = await createUser({ name: 'Riley Bennett', email: 'inspector@school-intranet.test', avatar: 'RB', department: 'Inspectoria', role: 'inspector' });

  await prisma.staff.upsert({
    where: { userId: adminUser.id },
    update: { position: 'Encargado administrativo', area: 'Administracion' },
    create: { userId: adminUser.id, position: 'Encargado administrativo', area: 'Administracion' }
  });
  await prisma.staff.upsert({
    where: { userId: inspectorUser.id },
    update: { position: 'Inspector general', area: 'Inspectoria' },
    create: { userId: inspectorUser.id, position: 'Inspector general', area: 'Inspectoria' }
  });

  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: { employeeCode: 'PROF-001' },
    create: { userId: teacherUser.id, employeeCode: 'PROF-001' }
  });
  const teacher2 = await prisma.teacher.upsert({
    where: { userId: teacherUser2.id },
    update: { employeeCode: 'PROF-002' },
    create: { userId: teacherUser2.id, employeeCode: 'PROF-002' }
  });
  const cristianTeacher = await prisma.teacher.upsert({
    where: { userId: cristianUser.id },
    update: { employeeCode: 'PROF-003' },
    create: { userId: cristianUser.id, employeeCode: 'PROF-003' }
  });

  const guardian = await prisma.guardian.upsert({
    where: { userId: guardianUser.id },
    update: { phone: '+56987654321' },
    create: { userId: guardianUser.id, phone: '+56987654321' }
  });
  const guardian2 = await prisma.guardian.upsert({
    where: { userId: guardianUser2.id },
    update: { phone: '+56911223344' },
    create: { userId: guardianUser2.id, phone: '+56911223344' }
  });

  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: { rut: '22.111.333-4', birthDate: new Date('2012-08-12') },
    create: { userId: studentUser.id, rut: '22.111.333-4', birthDate: new Date('2012-08-12') }
  });
  const extraStudentInputs = [
    { name: 'Mateo Lagos', email: 'student2@school-intranet.test', avatar: 'ML', rut: '22.111.333-5', birthDate: '2012-03-10', guardian: guardian },
    { name: 'Isidora Salinas', email: 'student3@school-intranet.test', avatar: 'IS', rut: '22.111.333-6', birthDate: '2012-11-02', guardian: guardian },
    { name: 'Tomas Aguilera', email: 'student4@school-intranet.test', avatar: 'TA', rut: '22.111.333-7', birthDate: '2011-07-20', guardian: guardian2 },
    { name: 'Emilia Torres', email: 'student5@school-intranet.test', avatar: 'ET', rut: '22.111.333-8', birthDate: '2011-01-15', guardian: guardian2 },
    { name: 'Benjamin Rojas', email: 'student6@school-intranet.test', avatar: 'BR', rut: '22.111.333-9', birthDate: '2010-09-13', guardian: guardian2 },
    { name: 'Antonia Morales', email: 'student7@school-intranet.test', avatar: 'AM', rut: '22.111.334-0', birthDate: '2012-05-24', guardian: guardian },
    { name: 'Lucas Herrera', email: 'student8@school-intranet.test', avatar: 'LH', rut: '22.111.334-1', birthDate: '2011-12-01', guardian: guardian2 },
    { name: 'Catalina Diaz', email: 'student9@school-intranet.test', avatar: 'CD', rut: '22.111.334-2', birthDate: '2010-04-18', guardian: guardian }
  ];
  const extraStudents = [];
  for (const input of extraStudentInputs) {
    const user = await createUser({ name: input.name, email: input.email, avatar: input.avatar, department: 'Estudiante', role: 'student' });
    const savedStudent = await prisma.student.upsert({
      where: { userId: user.id },
      update: { rut: input.rut, birthDate: new Date(input.birthDate) },
      create: { userId: user.id, rut: input.rut, birthDate: new Date(input.birthDate) }
    });
    await prisma.guardianStudent.upsert({
      where: { guardianId_studentId: { guardianId: input.guardian.id, studentId: savedStudent.id } },
      update: { relationship: 'Apoderado' },
      create: { guardianId: input.guardian.id, studentId: savedStudent.id, relationship: 'Apoderado' }
    });
    extraStudents.push(savedStudent);
  }

  await prisma.guardianStudent.upsert({
    where: { guardianId_studentId: { guardianId: guardian.id, studentId: student.id } },
    update: { relationship: 'Madre' },
    create: { guardianId: guardian.id, studentId: student.id, relationship: 'Madre' }
  });

  const basica = await prisma.schoolLevel.upsert({
    where: { name: 'Educacion Basica' },
    update: { order: 1 },
    create: { name: 'Educacion Basica', order: 1 }
  });
  const media = await prisma.schoolLevel.upsert({
    where: { name: 'Educacion Media' },
    update: { order: 2 },
    create: { name: 'Educacion Media', order: 2 }
  });

  const course8 = await prisma.course.upsert({
    where: { id: 'course-8-basico' },
    update: { name: '8 Basico', levelId: basica.id },
    create: { id: 'course-8-basico', name: '8 Basico', levelId: basica.id }
  });
  const course2 = await prisma.course.upsert({
    where: { id: 'course-2-medio' },
    update: { name: '2 Medio', levelId: media.id },
    create: { id: 'course-2-medio', name: '2 Medio', levelId: media.id }
  });

  const classroom = await prisma.classroom.upsert({
    where: { name: 'Sala 308' },
    update: { capacity: 32 },
    create: { name: 'Sala 308', capacity: 32 }
  });

  const section = await prisma.section.upsert({
    where: { courseId_name: { courseId: course8.id, name: 'A' } },
    update: { teacherId: teacher.id, classroomId: classroom.id },
    create: { courseId: course8.id, name: 'A', teacherId: teacher.id, classroomId: classroom.id }
  });
  const classroom2 = await prisma.classroom.upsert({
    where: { name: 'Sala 412' },
    update: { capacity: 30 },
    create: { name: 'Sala 412', capacity: 30 }
  });
  const section2 = await prisma.section.upsert({
    where: { courseId_name: { courseId: course2.id, name: 'B' } },
    update: { teacherId: teacher2.id, classroomId: classroom2.id },
    create: { courseId: course2.id, name: 'B', teacherId: teacher2.id, classroomId: classroom2.id }
  });
  const classroom3 = await prisma.classroom.upsert({
    where: { name: 'Sala 210' },
    update: { capacity: 30 },
    create: { name: 'Sala 210', capacity: 30 }
  });
  const section3 = await prisma.section.upsert({
    where: { courseId_name: { courseId: course2.id, name: 'A' } },
    update: { teacherId: cristianTeacher.id, classroomId: classroom3.id },
    create: { courseId: course2.id, name: 'A', teacherId: cristianTeacher.id, classroomId: classroom3.id }
  });

  const subjects = [
    { name: 'Lenguaje', code: 'LEN' },
    { name: 'Matematica', code: 'MAT' },
    { name: 'Ciencias Naturales', code: 'CIE' },
    { name: 'Historia', code: 'HIS' },
    { name: 'Ingles', code: 'ING' }
  ];

  for (const item of subjects) {
    const subject = await prisma.subject.upsert({
      where: { code: item.code },
      update: { name: item.name },
      create: item
    });
    await prisma.teacherSubject.upsert({
      where: { teacherId_subjectId: { teacherId: teacher.id, subjectId: subject.id } },
      update: {},
      create: { teacherId: teacher.id, subjectId: subject.id }
    });
    await prisma.teacherSubject.upsert({
      where: { teacherId_subjectId: { teacherId: teacher2.id, subjectId: subject.id } },
      update: {},
      create: { teacherId: teacher2.id, subjectId: subject.id }
    });
    await prisma.teacherSubject.upsert({
      where: { teacherId_subjectId: { teacherId: cristianTeacher.id, subjectId: subject.id } },
      update: {},
      create: { teacherId: cristianTeacher.id, subjectId: subject.id }
    });
    await prisma.courseSubject.upsert({
      where: { courseId_subjectId: { courseId: course8.id, subjectId: subject.id } },
      update: {},
      create: { courseId: course8.id, subjectId: subject.id }
    });
    await prisma.subjectSection.upsert({
      where: { sectionId_subjectId: { sectionId: section.id, subjectId: subject.id } },
      update: {},
      create: { sectionId: section.id, subjectId: subject.id }
    });
    await prisma.courseSubject.upsert({
      where: { courseId_subjectId: { courseId: course2.id, subjectId: subject.id } },
      update: {},
      create: { courseId: course2.id, subjectId: subject.id }
    });
    await prisma.subjectSection.upsert({
      where: { sectionId_subjectId: { sectionId: section2.id, subjectId: subject.id } },
      update: {},
      create: { sectionId: section2.id, subjectId: subject.id }
    });
    await prisma.subjectSection.upsert({
      where: { sectionId_subjectId: { sectionId: section3.id, subjectId: subject.id } },
      update: {},
      create: { sectionId: section3.id, subjectId: subject.id }
    });
  }

  const enrollment = await prisma.enrollment.upsert({
    where: { studentId_sectionId_year: { studentId: student.id, sectionId: section.id, year: 2026 } },
    update: { status: 'activo' },
    create: { studentId: student.id, sectionId: section.id, year: 2026, status: 'activo' }
  });
  const enrollments = [enrollment];
  for (const [index, currentStudent] of extraStudents.entries()) {
    const targetSection = index < 4 ? section : index < 6 ? section2 : section3;
    await prisma.enrollment.updateMany({
      where: { studentId: currentStudent.id, year: 2026, NOT: { sectionId: targetSection.id } },
      data: { status: 'trasladado' }
    });
    enrollments.push(await prisma.enrollment.upsert({
      where: { studentId_sectionId_year: { studentId: currentStudent.id, sectionId: targetSection.id, year: 2026 } },
      update: { status: 'activo' },
      create: { studentId: currentStudent.id, sectionId: targetSection.id, year: 2026, status: 'activo' }
    }));
  }

  const seededSubjects = await prisma.subject.findMany({
    where: { code: { in: subjects.map((item) => item.code) } },
    orderBy: { code: 'asc' }
  });
  const subjectByCode = new Map(seededSubjects.map((subject) => [subject.code, subject]));
  const math = subjectByCode.get('MAT') ?? await prisma.subject.findUniqueOrThrow({ where: { code: 'MAT' } });
  const academicPeriods = [
    { id: 'period-2026-t1', name: '1er Trimestre 2026', year: 2026, startDate: new Date('2026-03-01'), endDate: new Date('2026-05-31') },
    { id: 'period-2026-t2', name: '2do Trimestre 2026', year: 2026, startDate: new Date('2026-06-01'), endDate: new Date('2026-08-31') },
    { id: 'period-2026-t3', name: '3er Trimestre 2026', year: 2026, startDate: new Date('2026-09-01'), endDate: new Date('2026-11-30') }
  ];
  for (const period of academicPeriods) {
    await prisma.academicPeriod.upsert({
      where: { id: period.id },
      update: period,
      create: period
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay();
  monday.setDate(today.getDate() + mondayOffset);
  const currentWeekdays = Array.from({ length: 5 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day.getDay();
  });

  const sectionContexts = [
    { section, classroom, teacher, teacherUser, slug: '8ba' },
    { section: section2, classroom: classroom2, teacher: teacher2, teacherUser: teacherUser2, slug: '2mb' },
    { section: section3, classroom: classroom3, teacher: cristianTeacher, teacherUser: cristianUser, slug: '2ma' }
  ];
  const scheduleTemplates = [
    { code: 'MAT', dayIndex: 0, startsAt: '08:15', endsAt: '09:45' },
    { code: 'LEN', dayIndex: 1, startsAt: '10:00', endsAt: '11:30' },
    { code: 'CIE', dayIndex: 2, startsAt: '08:15', endsAt: '09:45' },
    { code: 'HIS', dayIndex: 3, startsAt: '10:00', endsAt: '11:30' },
    { code: 'ING', dayIndex: 4, startsAt: '11:45', endsAt: '13:15' }
  ];

  await prisma.classSchedule.deleteMany({
    where: { sectionId: { in: sectionContexts.map((item) => item.section.id) } }
  });

  const scheduleRows = sectionContexts.flatMap((context, sectionIndex) =>
    scheduleTemplates.map((template) => {
      const subject = subjectByCode.get(template.code);
      if (!subject) throw new Error(`Missing subject ${template.code}`);
      return {
        sectionId: context.section.id,
        subjectId: subject.id,
        teacherId: context.teacher.id,
        classroomId: context.classroom.id,
        weekday: currentWeekdays[template.dayIndex],
        startsAt: sectionIndex === 1 && template.dayIndex < 2 ? '14:00' : template.startsAt,
        endsAt: sectionIndex === 1 && template.dayIndex < 2 ? '15:30' : template.endsAt
      };
    })
  );
  await prisma.classSchedule.createMany({ data: scheduleRows });

  const attendanceStart = new Date(monday);
  attendanceStart.setDate(monday.getDate() - 21);
  const attendanceEnd = new Date(monday);
  attendanceEnd.setDate(monday.getDate() - 1);
  await prisma.attendance.deleteMany({
    where: {
      sectionId: { in: sectionContexts.map((item) => item.section.id) },
      date: { gte: attendanceStart, lte: attendanceEnd }
    }
  });

  const activeEnrollments = enrollments.filter((item) => item.status === 'activo');
  const attendanceRows = activeEnrollments.flatMap((item, enrollmentIndex) => {
    const context = sectionContexts.find((sectionContext) => sectionContext.section.id === item.sectionId);
    if (!context) return [];
    const sectionSchedules = scheduleRows.filter((schedule) => schedule.sectionId === item.sectionId);
    return [1, 2, 3].flatMap((weekOffset) =>
      sectionSchedules.map((schedule, scheduleIndex) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() - weekOffset * 7 + (schedule.weekday === 0 ? 6 : schedule.weekday - 1));
        const bucket = (enrollmentIndex * 17 + scheduleIndex * 11 + weekOffset * 7) % 100;
        const status = bucket < 90 ? 'presente' : bucket < 96 ? 'ausente' : 'atrasado';
        return {
          enrollmentId: item.id,
          studentId: item.studentId,
          sectionId: item.sectionId,
          subjectId: schedule.subjectId,
          date,
          status,
          note: status === 'atrasado' ? 'Ingreso posterior al inicio de clase' : undefined,
          recordedById: context.teacherUser.id,
          updatedById: context.teacherUser.id
        };
      })
    );
  });
  await prisma.attendance.createMany({ data: attendanceRows, skipDuplicates: true });

  const seededAssessmentScope = {
    sectionId: { in: sectionContexts.map((item) => item.section.id) },
    subjectId: { in: seededSubjects.map((item) => item.id) }
  };
  await prisma.grade.deleteMany({
    where: {
      assessment: seededAssessmentScope
    }
  });
  await prisma.assessment.deleteMany({
    where: {
      ...seededAssessmentScope
    }
  });

  const assessmentTitles = ['Diagnostico', 'Trabajo practico', 'Control de contenidos', 'Proyecto aplicado', 'Prueba de cierre'];
  const assessmentsToGrade = [];
  for (const context of sectionContexts) {
    for (const [subjectIndex, subject] of seededSubjects.entries()) {
      for (const [assessmentIndex, title] of assessmentTitles.entries()) {
        const date = new Date('2026-04-01');
        date.setDate(date.getDate() + subjectIndex * 3 + assessmentIndex * 7);
        const assessment = await prisma.assessment.create({
          data: {
            id: `assessment-${context.slug}-${subject.code.toLowerCase()}-${assessmentIndex + 1}`,
            title: `${title} ${subject.name}`,
            subjectId: subject.id,
            sectionId: context.section.id,
            periodId: 'period-2026-t1',
            date,
            weight: assessmentIndex === 4 ? 1.5 : 1,
            type: assessmentIndex === 1 || assessmentIndex === 3 ? 'trabajo' : 'prueba',
            description: `Evaluacion ${assessmentIndex + 1} de ${subject.name} para ${context.section.name}.`
          }
        });
        assessmentsToGrade.push({ assessment, sectionId: context.section.id, subjectIndex, assessmentIndex });
      }
    }
  }

  for (const [enrollmentIndex, item] of activeEnrollments.entries()) {
    const sectionAssessments = assessmentsToGrade.filter((entry) => entry.sectionId === item.sectionId);
    for (const entry of sectionAssessments) {
      const rawScore = 4.2 + ((enrollmentIndex * 0.35 + entry.subjectIndex * 0.25 + entry.assessmentIndex * 0.3) % 2.8);
      const score = Math.min(7, Math.max(3.5, Number(rawScore.toFixed(1))));
      await prisma.grade.create({
        data: {
          assessmentId: entry.assessment.id,
          studentId: item.studentId,
          enrollmentId: item.id,
          score,
          status: 'con_nota'
        }
      });
    }
  }

  const seededAnnouncements = [
      { title: 'Inicio del plan de reforzamiento lector', audience: 'Docentes y familias', authorId: director.id, priority: 'alta', body: 'Durante mayo se aplicara un plan focalizado para estudiantes que requieren acompanamiento lector.' },
      { title: 'Simulacro de evacuacion', audience: 'Toda la comunidad', authorId: inspectorUser.id, priority: 'normal', body: 'El simulacro se realizara por ciclos y sera coordinado con inspectoria general.' },
      { title: 'Cierre de notas primer trimestre', audience: 'Docentes', authorId: director.id, priority: 'critica', body: 'Las calificaciones deben quedar registradas antes de las 18:00 horas.' },
      { title: 'Entrega de guias de matematica', audience: 'Estudiantes 8 Basico A', authorId: teacherUser.id, priority: 'normal', body: 'Las guias de ejercitacion ya se encuentran disponibles en materiales de la asignatura.' },
      { title: 'Reunion de apoderados', audience: 'Familias', authorId: director.id, priority: 'alta', body: 'La reunion mensual se realizara por curso durante la proxima semana.' }
    ];
  await prisma.announcement.deleteMany({ where: { title: { in: seededAnnouncements.map((item) => item.title) } } });
  await prisma.announcement.createMany({
    data: seededAnnouncements,
    skipDuplicates: true
  });

  const secretaria = await prisma.requestType.upsert({
    where: { name: 'Certificados y constancias' },
    update: { area: 'Secretaria' },
    create: { name: 'Certificados y constancias', area: 'Secretaria' }
  });
  const seededRequests = [
      { subject: 'Certificado alumno regular', requesterId: guardianUser.id, typeId: secretaria.id, status: 'resuelto' },
      { subject: 'Reposicion de credencial', requesterId: studentUser.id, typeId: secretaria.id, status: 'en_proceso' },
      { subject: 'Justificacion de inasistencia', requesterId: guardianUser2.id, typeId: secretaria.id, status: 'nuevo' },
      { subject: 'Solicitud de entrevista docente', requesterId: guardianUser.id, typeId: secretaria.id, status: 'en_proceso' }
    ];
  await prisma.schoolRequest.deleteMany({ where: { subject: { in: seededRequests.map((item) => item.subject) } } });
  await prisma.schoolRequest.createMany({
    data: seededRequests,
    skipDuplicates: true
  });

  const normativa = await prisma.documentCategory.upsert({
    where: { name: 'Normativa' },
    update: {},
    create: { name: 'Normativa' }
  });
  const institutionalDocuments = [
      { title: 'Reglamento interno 2026', categoryId: normativa.id, ownerId: director.id, status: 'vigente' },
      { title: 'Protocolo de accidentes escolares', categoryId: normativa.id, ownerId: inspectorUser.id, status: 'vigente' }
    ];
  await prisma.document.deleteMany({ where: { title: { in: institutionalDocuments.map((item) => item.title) } } });
  await prisma.document.createMany({
    data: institutionalDocuments,
    skipDuplicates: true
  });
  const materialMat = await prisma.documentCategory.upsert({
    where: { name: 'Matematica' },
    update: {},
    create: { name: 'Matematica' }
  });
  const materialLen = await prisma.documentCategory.upsert({
    where: { name: 'Lenguaje' },
    update: {},
    create: { name: 'Lenguaje' }
  });
  const subjectMaterials = [
      { title: 'Guia de proporcionalidad', categoryId: materialMat.id, ownerId: teacherUser.id, status: 'vigente', fileUrl: 'https://example.com/guias/proporcionalidad.pdf' },
      { title: 'Ejercicios de ecuaciones', categoryId: materialMat.id, ownerId: teacherUser.id, status: 'vigente', fileUrl: 'https://example.com/guias/ecuaciones.pdf' },
      { title: 'Lectura domiciliaria abril', categoryId: materialLen.id, ownerId: teacherUser2.id, status: 'vigente', fileUrl: 'https://example.com/materiales/lectura-abril.pdf' }
    ];
  await prisma.document.deleteMany({ where: { title: { in: subjectMaterials.map((item) => item.title) } } });
  await prisma.document.createMany({
    data: subjectMaterials,
    skipDuplicates: true
  });

  await prisma.subjectUnit.deleteMany({ where: { subjectId: math.id } });
  const mathUnit1 = await prisma.subjectUnit.create({
    data: {
      id: 'unit-mat-1',
      subjectId: math.id,
      title: 'Unidad 1 - Fundamentos de Matematica',
      description: 'Numeros, proporcionalidad, lenguaje algebraico y resolucion guiada de problemas.',
      duration: '3 semanas',
      outcomes: ['Reconocer relaciones proporcionales.', 'Resolver problemas de operatoria y ecuaciones simples.', 'Comunicar procedimientos matematicos con precision.'],
      bibliography: ['Texto del estudiante de Matematica 8 Basico', 'Apuntes docentes de proporcionalidad y algebra'],
      order: 1
    }
  });
  const mathUnit2 = await prisma.subjectUnit.create({
    data: {
      id: 'unit-mat-2',
      subjectId: math.id,
      title: 'Unidad 2 - Aplicacion',
      description: 'Modelamiento, ejercicios aplicados, analisis de datos y actividades colaborativas.',
      duration: '4 semanas',
      outcomes: ['Aplicar estrategias de resolucion en contextos reales.', 'Interpretar datos desde tablas y graficos.', 'Construir respuestas justificadas.'],
      bibliography: ['Guia de ejercicios aplicados', 'Biblioteca digital escolar: estadistica inicial'],
      order: 2
    }
  });
  const mathUnit3 = await prisma.subjectUnit.create({
    data: {
      id: 'unit-mat-3',
      subjectId: math.id,
      title: 'Unidad 3 - Cierre y sintesis',
      description: 'Integracion de contenidos, preparacion de evaluacion final y proyecto breve.',
      duration: '3 semanas',
      outcomes: ['Integrar contenidos clave del semestre.', 'Preparar evidencias de aprendizaje.', 'Evaluar resultados con pauta.'],
      bibliography: ['Material de cierre de asignatura', 'Ejercicios de repaso docente'],
      order: 3
    }
  });

  await prisma.unitMaterial.createMany({
    data: [
      { unitId: mathUnit1.id, title: 'PPT proporcionalidad', type: 'presentacion', fileUrl: 'https://example.com/ppt/proporcionalidad.pptx', ownerId: teacherUser.id },
      { unitId: mathUnit1.id, title: 'Guia 1 - Proporciones', type: 'guia', fileUrl: 'https://example.com/guias/proporciones.pdf', ownerId: teacherUser.id },
      { unitId: mathUnit2.id, title: 'PPT analisis de datos', type: 'presentacion', fileUrl: 'https://example.com/ppt/datos.pptx', ownerId: teacherUser.id },
      { unitId: mathUnit2.id, title: 'Ejercicios Excel', type: 'documento', fileUrl: 'https://example.com/planillas/ejercicios.xlsx', ownerId: teacherUser.id },
      { unitId: mathUnit3.id, title: 'Material de cierre', type: 'guia', fileUrl: 'https://example.com/guias/cierre.pdf', ownerId: teacherUser.id }
    ],
    skipDuplicates: true
  });

  await prisma.assignment.createMany({
    data: [
      { id: 'assignment-mat-u1', unitId: mathUnit1.id, title: 'Entregable 1 - Resolucion de problemas', description: 'Sube el desarrollo de los ejercicios indicados en la guia 1.', dueDate: new Date('2026-05-05') },
      { id: 'assignment-mat-u2', unitId: mathUnit2.id, title: 'Entregable 2 - Ejercicios aplicados', description: 'Sube la planilla o documento con los ejercicios aplicados.', dueDate: new Date('2026-05-20') }
    ],
    skipDuplicates: true
  });

  const seededEvents = [
      { title: 'Consejo de profesores', date: new Date('2026-04-24'), type: 'academico', location: 'Biblioteca' },
      { title: 'Reunion centro de padres', date: new Date('2026-04-29'), type: 'familias', location: 'Auditorio' },
      { title: 'Feria cientifica escolar', date: new Date('2026-05-08'), type: 'academico', location: 'Patio central' }
    ];
  await prisma.calendarEvent.deleteMany({ where: { title: { in: seededEvents.map((item) => item.title) } } });
  await prisma.calendarEvent.createMany({
    data: seededEvents,
    skipDuplicates: true
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
