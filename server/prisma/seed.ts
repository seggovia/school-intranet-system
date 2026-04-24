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
      update: { name: input.name, avatar: input.avatar, department: input.department, passwordHash },
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
  }

  const enrollment = await prisma.enrollment.upsert({
    where: { studentId_sectionId_year: { studentId: student.id, sectionId: section.id, year: 2026 } },
    update: { status: 'activo' },
    create: { studentId: student.id, sectionId: section.id, year: 2026, status: 'activo' }
  });
  const enrollments = [enrollment];
  for (const [index, currentStudent] of extraStudents.entries()) {
    const targetSection = index < 4 ? section : section2;
    enrollments.push(await prisma.enrollment.upsert({
      where: { studentId_sectionId_year: { studentId: currentStudent.id, sectionId: targetSection.id, year: 2026 } },
      update: { status: 'activo' },
      create: { studentId: currentStudent.id, sectionId: targetSection.id, year: 2026, status: 'activo' }
    }));
  }

  const math = await prisma.subject.findUniqueOrThrow({ where: { code: 'MAT' } });
  await prisma.classSchedule.deleteMany({
    where: { subjectId: math.id, sectionId: { in: [section.id, section2.id] } }
  });
  await prisma.classSchedule.createMany({
    data: [
      { sectionId: section.id, subjectId: math.id, teacherId: teacher.id, classroomId: classroom.id, weekday: 1, startsAt: '08:15', endsAt: '09:45' },
      { sectionId: section.id, subjectId: math.id, teacherId: teacher.id, classroomId: classroom.id, weekday: 3, startsAt: '10:00', endsAt: '11:30' },
      { sectionId: section2.id, subjectId: math.id, teacherId: teacher2.id, classroomId: classroom2.id, weekday: 2, startsAt: '08:15', endsAt: '09:45' },
      { sectionId: section2.id, subjectId: math.id, teacherId: teacher2.id, classroomId: classroom2.id, weekday: 4, startsAt: '11:45', endsAt: '13:15' }
    ],
    skipDuplicates: true
  });

  await prisma.attendance.createMany({
    data: enrollments.flatMap((item, index) => [
      { enrollmentId: item.id, studentId: item.studentId, date: new Date('2026-04-20'), status: index % 5 === 0 ? 'ausente' : 'presente' },
      { enrollmentId: item.id, studentId: item.studentId, date: new Date('2026-04-21'), status: index % 4 === 0 ? 'atrasado' : 'presente', note: index % 4 === 0 ? 'Ingreso posterior al inicio de clase' : undefined },
      { enrollmentId: item.id, studentId: item.studentId, date: new Date('2026-04-22'), status: index % 6 === 0 ? 'justificado' : 'presente' }
    ]),
    skipDuplicates: true
  });

  const assessment = await prisma.assessment.upsert({
    where: { id: 'assessment-mat-1' },
    update: { title: 'Prueba unidades y proporcionalidad', subjectId: math.id, date: new Date('2026-04-18') },
    create: { id: 'assessment-mat-1', title: 'Prueba unidades y proporcionalidad', subjectId: math.id, date: new Date('2026-04-18'), weight: 1 }
  });
  await prisma.grade.upsert({
    where: { assessmentId_studentId: { assessmentId: assessment.id, studentId: student.id } },
    update: { score: 6.4 },
    create: { assessmentId: assessment.id, studentId: student.id, enrollmentId: enrollment.id, score: 6.4 }
  });
  for (const [index, item] of enrollments.entries()) {
    await prisma.grade.upsert({
      where: { assessmentId_studentId: { assessmentId: assessment.id, studentId: item.studentId } },
      update: { score: Number((4.8 + (index % 5) * 0.4).toFixed(1)) },
      create: { assessmentId: assessment.id, studentId: item.studentId, enrollmentId: item.id, score: Number((4.8 + (index % 5) * 0.4).toFixed(1)) }
    });
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
