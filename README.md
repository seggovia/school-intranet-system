# Sistema de Intranet Escolar

Proyecto full-stack para portafolio que simula una plataforma interna real para colegios. Incluye experiencias diferenciadas para administracion, direccion, docentes, estudiantes, apoderados e inspectoria.

## Stack Tecnologico

- Frontend: React, Vite, TypeScript, React Router, Recharts, Axios.
- Backend: Node.js, Express, TypeScript, Prisma ORM, MySQL.
- Autenticacion: JWT, refresh tokens rotativos, bcrypt, RBAC y middleware de permisos.
- Infraestructura: Docker y Docker Compose.

## Arquitectura

Los modulos backend siguen una estructura por capas:

```text
routes -> controller -> service -> repository -> Prisma/MySQL
```

- Los controladores manejan solo request/response.
- Los servicios contienen la logica de negocio.
- Los repositorios son la unica capa que accede a Prisma.
- Las entradas se validan con Zod.
- Las rutas usan autenticacion, roles y permisos.

## Docker

```bash
docker compose up --build
```

Servicios:

- `school-intranet-mysql`
- `school-intranet-backend`
- `school-intranet-frontend`

Base de datos:

- MySQL: `school_intranet`
- Backend: http://localhost:4000
- Frontend: http://localhost:5173

## Cuentas Demo

Todas las cuentas usan la clave `demo1234`.

| Rol | Correo |
| --- | --- |
| Administrador | admin@school-intranet.test |
| Director | director@school-intranet.test |
| Docente | teacher@school-intranet.test |
| Estudiante | student@school-intranet.test |
| Apoderado | guardian@school-intranet.test |
| Inspector | inspector@school-intranet.test |

## Funcionalidades Por Rol

- Admin/director: indicadores institucionales, usuarios, roles, cursos, secciones, asignaturas, horarios, comunicados, documentos, solicitudes y calendario.
- Docente: cursos asignados, nominas, asistencia, ingreso de notas, detalle de asignaturas, evaluaciones, comunicados y materiales.
- Estudiante: asignaturas propias, horario, calificaciones, asistencia, materiales, documentos y calendario escolar.
- Apoderado: estudiantes vinculados, calificaciones, asistencia, comunicados, documentos, solicitudes y estado de solicitudes.
- Inspector: seguimiento de asistencia, registros estudiantiles, solicitudes y calendario.

## Resumen API

Modulos principales:

- Auth: `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`
- Espacio del usuario: `/api/me/dashboard`, `/api/me/subjects`, `/api/me/schedule`, `/api/me/grades`, `/api/me/attendance`
- Usuarios: `/api/users`
- Cursos: `/api/courses`
- Asignaturas: `/api/subjects`
- Secciones: `/api/sections`, `/api/sections/:id/students`
- Evaluaciones: `/api/assessments`
- Calificaciones: `/api/grades`
- Asistencia: `/api/attendance`, `/api/attendance/bulk`
- Comunicados: `/api/announcements`
- Notificaciones: `/api/notifications`
- Documentos: `/api/documents`, `/api/documents/categories`
- Solicitudes: `/api/requests`, `/api/requests/:id/status`
- Calendario y horarios: `/api/events`, `/api/schedules`
- Salud del servicio: `/api/health`

## Seguridad

- Claves hasheadas con bcrypt.
- Access tokens JWT de corta duracion.
- Refresh tokens hasheados en base de datos y rotados en cada refresh.
- Logout revoca el refresh token.
- Rutas protegidas por autenticacion.
- Operaciones de escritura protegidas por roles y permisos.
- Validacion de body y params con Zod.

## Scripts

```bash
npm run dev
npm run typecheck
npm run build
npm start
```
