import { Download, FileCheck2 } from 'lucide-react';
import { loadDocuments, loadMySubjects } from '../api';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { useAsyncData } from '../hooks';
import type { DocumentItem, MySubject, User } from '../types';

export function DocumentsPage({ user }: { user: User }) {
  const { data } = useAsyncData(loadDocuments, [] as DocumentItem[]);
  const subjects = useAsyncData(loadMySubjects, [] as MySubject[]);
  const canManageDocuments = user.permissions.includes('documents:manage');
  const materials = subjects.data.flatMap((subject) => subject.materials.map((material) => ({ ...material, subject: subject.name })));

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Gestion documental</span>
          <h1>Biblioteca interna</h1>
          <p>Normativas, protocolos y documentos operativos versionados.</p>
        </div>
        <div className="action-row">
          {canManageDocuments && <button className="secondary-button" onClick={() => window.alert('Funcionalidad de subida disponible próximamente. Contacta al administrador del sistema.')}><FileCheck2 size={18} /> Subir documento institucional</button>}
        </div>
      </section>

      <section className="panel">
        <h2>Documentos institucionales</h2>
        <DataTable
          rows={data}
          columns={[
            { header: 'Documento', render: (row) => row.title },
            { header: 'Categoria', render: (row) => row.category },
            { header: 'Responsable', render: (row) => row.owner },
            { header: 'Actualizado', render: (row) => row.updatedAt },
            { header: 'Estado', render: (row) => <StatusBadge value={row.status} /> },
            { header: 'Accion', render: () => <button className="icon-button" aria-label="Descargar"><Download size={17} /></button> }
          ]}
        />
      </section>

      <section className="panel">
        <h2>Materiales de asignaturas</h2>
        <DataTable
          rows={materials}
          columns={[
            { header: 'Material', render: (row) => row.title },
            { header: 'Asignatura', render: (row) => row.subject },
            { header: 'Responsable', render: (row) => row.owner },
            { header: 'Actualizado', render: (row) => row.updatedAt },
            { header: 'Accion', render: (row) => <a className="icon-button" aria-label="Descargar" href={row.fileUrl ?? '#'}><Download size={17} /></a> }
          ]}
        />
      </section>
    </div>
  );
}
