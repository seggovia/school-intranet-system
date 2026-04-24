import { useParams } from 'react-router-dom';
import { FileText, Megaphone, Upload } from 'lucide-react';
import { createAnnouncement, createDocument, loadMySubjects } from '../api';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import { StudentList } from '../components/StudentList';
import { EmptyState } from '../components/States';
import { Timetable } from '../components/Timetable';
import { useAsyncData } from '../hooks';
import type { MySubject, User } from '../types';

export function SubjectDetailPage({ user }: { user: User }) {
  const { id } = useParams();
  const { data } = useAsyncData(loadMySubjects, [] as MySubject[]);
  const subject = data.find((item) => item.id === id) ?? data[0];
  const canPublish = user.permissions.includes('communications:manage');
  const canManageDocuments = user.permissions.includes('documents:manage');

  async function publishUpdate() {
    if (!subject) return;
    await createAnnouncement({
      title: `Actualizacion de ${subject.name}`,
      audience: subject.section,
      priority: 'normal',
      body: `Nueva actualizacion de ${subject.name} para ${subject.section}.`
    });
  }

  async function addMaterial() {
    if (!subject) return;
    await createDocument({
      title: `Material de ${subject.name}`,
      category: subject.name,
      status: 'vigente',
      fileUrl: 'https://example.com/material-placeholder.pdf'
    });
  }

  if (!subject) return <EmptyState title="Asignatura no encontrada" description="No hay asignaturas visibles para tu rol." />;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={subject.section}
        title={subject.name}
        description={`Docente: ${subject.teacher}`}
        actions={<div className="action-row">{canPublish && <button className="secondary-button" onClick={publishUpdate}><Megaphone size={17} /> Comunicar</button>}{canManageDocuments && <button className="primary-button" onClick={addMaterial}><Upload size={17} /> Agregar material</button>}</div>}
      />

      <section className="workspace-grid">
        <article className="panel">
          <h2>Horario</h2>
          <Timetable items={subject.schedules} />
        </article>

        <article className="panel">
          <h2>Unidades y contenidos</h2>
          <div className="compact-list">
            {subject.units?.map((unit) => (
              <span key={unit.id}>{unit.title}: {unit.topics.join(', ')}</span>
            ))}
          </div>
        </article>
      </section>

      {['admin', 'director', 'teacher', 'inspector'].includes(user.primaryRole) && (
        <section className="panel">
          <h2>Estudiantes</h2>
          <StudentList students={subject.students} />
        </section>
      )}

      <section className="panel">
        <h2>Evaluaciones</h2>
        <DataTable
          rows={subject.assessments}
          columns={[
            { header: 'Evaluacion', render: (row) => row.title },
            { header: 'Fecha', render: (row) => row.date },
            { header: 'Notas', render: (row) => row.grades }
          ]}
        />
      </section>

      <section className="panel">
        <h2><FileText size={18} /> Materiales</h2>
        {subject.materials?.length ? (
          <DataTable rows={subject.materials} columns={[{ header: 'Titulo', render: (row) => row.title }, { header: 'Categoria', render: (row) => row.category }, { header: 'Estado', render: (row) => row.status }]} />
        ) : (
          <EmptyState title="Sin materiales" description="Aqui se puede asociar metadata de documentos antes de agregar almacenamiento real." />
        )}
      </section>
    </div>
  );
}
