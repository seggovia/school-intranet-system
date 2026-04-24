import { Shield, Users } from 'lucide-react';
import { loadCourses, loadSubjects } from '../api';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import { useAsyncData } from '../hooks';
import type { Course, Subject, User } from '../types';

export function AdminPage({ user }: { user: User }) {
  const courses = useAsyncData(loadCourses, [] as Course[]);
  const subjects = useAsyncData(loadSubjects, [] as Subject[]);

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Administracion" title="Operacion escolar" description="Gestiona usuarios, roles, cursos, secciones, asignaturas, horarios, documentos, solicitudes y eventos." />

      <section className="kpi-grid">
        <article className="kpi-card"><Shield size={22} /><span>Rol actual</span><strong>{user.primaryRole}</strong><small>Acciones segun permisos</small></article>
        <article className="kpi-card"><Users size={22} /><span>Cursos visibles</span><strong>{courses.data.length}</strong><small>Secciones academicas configuradas</small></article>
      </section>

      <section className="workspace-grid">
        <article className="panel">
          <h2>Gestion de cursos</h2>
          <DataTable rows={courses.data} columns={[{ header: 'Curso', render: (row) => row.name }, { header: 'Docente', render: (row) => row.teacher }, { header: 'Sala', render: (row) => row.room }, { header: 'Estudiantes', render: (row) => row.students }]} />
        </article>
        <article className="panel">
          <h2>Gestion de asignaturas</h2>
          <DataTable rows={subjects.data} columns={[{ header: 'Codigo', render: (row) => row.code }, { header: 'Asignatura', render: (row) => row.name }, { header: 'Docentes', render: (row) => row.teachers.join(', ') || 'Sin asignar' }]} />
        </article>
      </section>
    </div>
  );
}
