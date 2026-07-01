import { useMemo, useState } from 'react';
import { Download, FileText, Link as LinkIcon, Video, FileCheck2 } from 'lucide-react';
import { loadDocuments, loadMySubjects } from '../api';
import { DataTable } from '../components/DataTable';
import { useAsyncData } from '../hooks';
import type { DocumentItem, MySubject, User } from '../types';

const materialTypeLabels = ['PDF', 'Video', 'Enlace', 'Archivo'] as const;
type MaterialType = (typeof materialTypeLabels)[number];

type SubjectMaterial = DocumentItem & { subject: string; type: MaterialType };

function inferMaterialType(material: DocumentItem): MaterialType {
  const title = material.title.toLowerCase();
  const url = material.fileUrl?.toLowerCase() ?? '';
  if (url.includes('youtube') || url.includes('vimeo') || title.includes('video')) return 'Video';
  if (url.startsWith('http') && !url.match(/\.(pdf|docx?|xlsx?|pptx?|ppt|zip|rar|jpg|jpeg|png|mp4|mov)(\?|$)/)) return 'Enlace';
  if (title.includes('pdf') || url.endsWith('.pdf') || title.includes('documento') || title.includes('guia') || title.includes('manual')) return 'PDF';
  return 'Archivo';
}

function materialIcon(type: MaterialType) {
  if (type === 'Video') return Video;
  if (type === 'Enlace') return LinkIcon;
  if (type === 'Archivo') return Download;
  return FileText;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

export function DocumentsPage({ user }: { user: User }) {
  const { data } = useAsyncData(loadDocuments, [] as DocumentItem[]);
  const subjects = useAsyncData(loadMySubjects, [] as MySubject[]);
  const canManageDocuments = user.permissions.includes('documents:manage');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const materials = useMemo<SubjectMaterial[]>(() => {
    return subjects.data
      .flatMap((subject) => subject.materials.map((material) => ({
        ...material,
        subject: subject.name,
        type: inferMaterialType(material)
      })))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [subjects.data]);

  const subjectOptions = useMemo(() => {
    return Array.from(new Set(subjects.data.map((subject) => subject.name))).sort();
  }, [subjects.data]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((material) => {
      const matchesSubject = !selectedSubject || material.subject === selectedSubject;
      const matchesType = !selectedType || material.type === selectedType;
      const matchesSearch = !searchTerm || material.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSubject && matchesType && matchesSearch;
    });
  }, [materials, selectedSubject, selectedType, searchTerm]);

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Gestion documental</span>
          <h1>Biblioteca interna</h1>
          <p>Normativas, protocolos y documentos operativos versionados.</p>
        </div>
        <div className="action-row">
          {canManageDocuments && (
            <button
              className="secondary-button"
              onClick={() => window.alert('Funcionalidad de subida disponible próximamente. Contacta al administrador del sistema.')}
            >
              <FileCheck2 size={18} /> Subir documento institucional
            </button>
          )}
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
            { header: 'Estado', render: (row) => <span>{row.status}</span> },
            {
              header: 'Acción',
              render: () => (
                <button className="icon-button" aria-label="Descargar">
                  <Download size={17} />
                </button>
              )
            }
          ]}
        />
      </section>

      <section className="panel">
        <h2>Materiales de asignaturas</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <label style={{ flex: '1 1 240px' }}>
              Buscar material
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por título"
                style={{ width: '100%', marginTop: '0.35rem' }}
              />
            </label>
            <label style={{ flex: '1 1 180px' }}>
              Tipo de material
              <select
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value)}
                style={{ width: '100%', marginTop: '0.35rem' }}
              >
                <option value="">Todos</option>
                {materialTypeLabels.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label style={{ flex: '1 1 180px' }}>
              Asignatura
              <select
                value={selectedSubject}
                onChange={(event) => setSelectedSubject(event.target.value)}
                style={{ width: '100%', marginTop: '0.35rem' }}
              >
                <option value="">Todas</option>
                {subjectOptions.map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {filteredMaterials.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {filteredMaterials.map((material) => {
              const Icon = materialIcon(material.type);
              return (
                <article
                  key={material.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '1rem',
                    padding: '1rem',
                    background: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    minHeight: '170px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 12, background: '#eef2ff', color: '#3730a3' }}>
                      <Icon size={18} />
                    </div>
                    <span
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: 9999,
                        background: '#f3f4f6',
                        color: '#374151',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {material.type}
                    </span>
                  </div>

                  <div>
                    <strong style={{ display: 'block', fontSize: '1rem', marginBottom: '0.35rem', lineHeight: 1.4 }}>
                      {material.title}
                    </strong>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>{material.subject}</p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <small style={{ color: '#6b7280' }}>{formatDate(material.updatedAt)}</small>
                    <a
                      className="secondary-button"
                      href={material.fileUrl ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Download size={16} /> Ver
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p>No hay materiales que coincidan con los filtros.</p>
        )}
      </section>
    </div>
  );
}
