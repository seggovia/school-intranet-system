# Sistema de Intranet Escolar

Sistema de intranet escolar desarrollado con arquitectura full‑stack,
diseñado para gestionar procesos académicos, comunicación institucional
y acceso diferenciado por roles.

------------------------------------------------------------------------

# Estado del proyecto

🚧 Proyecto en desarrollo.

Actualmente incluye:

-   Autenticación con JWT y refresh tokens rotativos
-   Sistema de roles y permisos (RBAC)
-   Paneles diferenciados por rol
-   Gestión de cursos, asignaturas y secciones
-   Asistencia y calificaciones
-   Comunicados y documentos
-   Sistema de solicitudes
-   Calendario escolar
-   Docker Compose con frontend, backend y base de datos

## Mejoras futuras

-   Subida real de archivos para materiales
-   Descarga de documentos desde almacenamiento persistente
-   Formularios completos para crear evaluaciones y materiales
-   Mejor organización visual por unidades de asignatura
-   Pruebas automatizadas backend
-   Documentación API con Swagger/OpenAPI

------------------------------------------------------------------------

# Stack Tecnológico

## Frontend

-   React
-   Vite
-   TypeScript
-   React Router
-   Recharts
-   Axios

## Backend

-   Node.js
-   Express
-   TypeScript
-   Prisma ORM
-   MySQL

## Autenticación

-   JWT
-   Refresh tokens rotativos
-   bcrypt
-   RBAC (Role Based Access Control)

## Infraestructura

-   Docker
-   Docker Compose

------------------------------------------------------------------------

# Arquitectura

Los módulos backend siguen una estructura por capas:

routes -\> controller -\> service -\> repository -\> Prisma/MySQL

Principios:

-   Los controladores manejan solo request/response.
-   Los servicios contienen la lógica de negocio.
-   Los repositorios son la única capa que accede a Prisma.
-   Las entradas se validan con Zod.
-   Las rutas usan autenticación, roles y permisos.

------------------------------------------------------------------------

# Estructura del proyecto

school-intranet-system
│
├── client        # Frontend React
│
├── server        # Backend Node + Express
│   ├── modules
│   ├── prisma
│   └── middlewares
│
├── docker-compose.yml
└── README.md


------------------------------------------------------------------------

# Docker

Ejecutar el sistema completo:

docker compose up --build

Servicios:

-   school-intranet-mysql
-   school-intranet-backend
-   school-intranet-frontend

Base de datos:

MySQL: school_intranet

Accesos:

Backend http://localhost:4000\
Frontend http://localhost:5173

------------------------------------------------------------------------

# Cuentas Demo

Todas las cuentas usan la clave:

demo1234

  Rol             Correo
  --------------- --------------------------------
  Administrador   admin@school-intranet.test
  Director        director@school-intranet.test
  Docente         teacher@school-intranet.test
  Estudiante      student@school-intranet.test
  Apoderado       guardian@school-intranet.test
  Inspector       inspector@school-intranet.test

------------------------------------------------------------------------

# Funcionalidades por rol

## Administrador / Director

-   Gestión de usuarios y roles
-   Gestión de cursos, secciones y asignaturas
-   Comunicados institucionales
-   Documentos
-   Calendario institucional
-   Indicadores del sistema

## Docente

-   Cursos asignados
-   Nómina de estudiantes
-   Registro de asistencia
-   Ingreso de calificaciones
-   Evaluaciones
-   Materiales de asignatura

## Estudiante

-   Asignaturas
-   Horario
-   Calificaciones
-   Asistencia
-   Materiales
-   Documentos
-   Calendario escolar

## Apoderado

-   Estudiantes vinculados
-   Calificaciones
-   Asistencia
-   Comunicados
-   Documentos
-   Solicitudes

## Inspector

-   Seguimiento de asistencia
-   Registro de estudiantes
-   Solicitudes
-   Calendario

------------------------------------------------------------------------

# Resumen API

## Auth

/api/auth/login\
/api/auth/refresh\
/api/auth/logout

## Espacio del usuario

/api/me/dashboard\
/api/me/subjects\
/api/me/schedule\
/api/me/grades\
/api/me/attendance

## Otros módulos

/api/users\
/api/courses\
/api/subjects\
/api/sections\
/api/assessments\
/api/grades\
/api/attendance\
/api/announcements\
/api/notifications\
/api/documents\
/api/requests\
/api/events\
/api/schedules\
/api/health

------------------------------------------------------------------------

# Seguridad

-   Contraseñas hasheadas con bcrypt
-   Access tokens JWT de corta duración
-   Refresh tokens almacenados hasheados
-   Rotación automática de refresh tokens
-   Logout invalida el refresh token
-   Rutas protegidas por autenticación
-   Operaciones restringidas por roles
-   Validación de datos con Zod

------------------------------------------------------------------------

# Scripts

npm run dev\
npm run typecheck\
npm run build\
npm start

------------------------------------------------------------------------

# Licencia

Proyecto creado con fines educativos.
