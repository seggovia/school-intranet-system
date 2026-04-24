import type { Announcement, CalendarEvent, Course, Document, RequestTicket, Student, User } from './types.js';

export const users: User[] = [
  { id: 'u-001', name: 'Morgan Carter', email: 'director@school-intranet.test', role: 'director', avatar: 'MC', department: 'Direccion' },
  { id: 'u-002', name: 'Taylor Rivera', email: 'teacher@school-intranet.test', role: 'teacher', avatar: 'TR', department: 'Matematica' },
  { id: 'u-003', name: 'Jordan Lee', email: 'guardian@school-intranet.test', role: 'guardian', avatar: 'JL', department: 'Familias' },
  { id: 'u-004', name: 'Alex Morgan', email: 'student@school-intranet.test', role: 'student', avatar: 'AM', department: '8 Basico A' },
  { id: 'u-005', name: 'Casey Brooks', email: 'admin@school-intranet.test', role: 'admin', avatar: 'CB', department: 'Administracion' }
];

export const courses: Course[] = [
  { id: 'c-001', name: '1 Basico A', teacher: 'Valentina Soto', room: 'Sala 101', students: 31, attendance: 94, average: 6.1 },
  { id: 'c-002', name: '4 Basico B', teacher: 'Natalia Cornejo', room: 'Sala 204', students: 34, attendance: 91, average: 5.8 },
  { id: 'c-003', name: '8 Basico A', teacher: 'Taylor Rivera', room: 'Sala 308', students: 29, attendance: 88, average: 5.6 },
  { id: 'c-004', name: '2 Medio Humanista', teacher: 'Andrea Fuentes', room: 'Sala 412', students: 27, attendance: 92, average: 5.9 },
  { id: 'c-005', name: '4 Medio Cientifico', teacher: 'Roberto Vargas', room: 'Laboratorio 2', students: 25, attendance: 96, average: 6.3 }
];

export const students: Student[] = [
  { id: 's-001', name: 'Alex Morgan', course: '8 Basico A', guardian: 'Jordan Lee', attendance: 96, average: 6.4, risk: 'bajo' },
  { id: 's-002', name: 'Mateo Lagos', course: '8 Basico A', guardian: 'Felipe Lagos', attendance: 79, average: 4.8, risk: 'alto' },
  { id: 's-003', name: 'Isidora Salinas', course: '4 Medio Cientifico', guardian: 'Mariana Salinas', attendance: 92, average: 6.2, risk: 'bajo' },
  { id: 's-004', name: 'Tomas Aguilera', course: '2 Medio Humanista', guardian: 'Cecilia Moraga', attendance: 85, average: 5.1, risk: 'medio' },
  { id: 's-005', name: 'Emilia Torres', course: '1 Basico A', guardian: 'Jorge Torres', attendance: 98, average: 6.7, risk: 'bajo' }
];

export const announcements: Announcement[] = [
  {
    id: 'a-001',
    title: 'Inicio del plan de reforzamiento lector',
    audience: 'Docentes y familias',
    author: 'Unidad Tecnico Pedagogica',
    date: '2026-04-21',
    priority: 'alta',
    body: 'Durante mayo se aplicara un plan focalizado para estudiantes que requieren acompanamiento lector.'
  },
  {
    id: 'a-002',
    title: 'Simulacro de evacuacion',
    audience: 'Toda la comunidad',
    author: 'Convivencia Escolar',
    date: '2026-04-25',
    priority: 'normal',
    body: 'El simulacro se realizara por ciclos y sera coordinado con inspectoria general.'
  },
  {
    id: 'a-003',
    title: 'Cierre de notas primer trimestre',
    audience: 'Docentes',
    author: 'Direccion Academica',
    date: '2026-05-03',
    priority: 'critica',
    body: 'Las calificaciones deben quedar registradas antes de las 18:00 horas.'
  }
];

export const events: CalendarEvent[] = [
  { id: 'e-001', title: 'Consejo de profesores', date: '2026-04-24', type: 'academico', location: 'Biblioteca' },
  { id: 'e-002', title: 'Reunion centro de padres', date: '2026-04-29', type: 'familias', location: 'Auditorio' },
  { id: 'e-003', title: 'Feria cientifica escolar', date: '2026-05-08', type: 'academico', location: 'Patio central' },
  { id: 'e-004', title: 'Jornada de convivencia', date: '2026-05-14', type: 'convivencia', location: 'Gimnasio' }
];

export const documents: Document[] = [
  { id: 'd-001', title: 'Reglamento interno 2026', category: 'Normativa', owner: 'Direccion', updatedAt: '2026-03-12', status: 'vigente' },
  { id: 'd-002', title: 'Protocolo de accidentes escolares', category: 'Seguridad', owner: 'Inspectoria', updatedAt: '2026-04-02', status: 'vigente' },
  { id: 'd-003', title: 'Plan anual de evaluacion', category: 'Academico', owner: 'UTP', updatedAt: '2026-04-11', status: 'revision' },
  { id: 'd-004', title: 'Manual de uso plataforma', category: 'TI', owner: 'Administracion', updatedAt: '2026-02-26', status: 'vigente' }
];

export const requests: RequestTicket[] = [
  { id: 'r-001', subject: 'Reposicion de credencial', requester: 'Alex Morgan', area: 'Secretaria', status: 'en_proceso', createdAt: '2026-04-20' },
  { id: 'r-002', subject: 'Reserva laboratorio ciencias', requester: 'Roberto Vargas', area: 'Administracion', status: 'nuevo', createdAt: '2026-04-22' },
  { id: 'r-003', subject: 'Certificado alumno regular', requester: 'Jordan Lee', area: 'Secretaria', status: 'resuelto', createdAt: '2026-04-18' }
];
