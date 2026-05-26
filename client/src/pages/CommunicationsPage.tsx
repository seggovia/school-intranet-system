import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Eye, FileUp, Megaphone, Search, Send, Users, X } from 'lucide-react';
import { loadAnnouncements, loadMyDashboard, markAnnouncementRead } from '../api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState, LoadingState } from '../components/States';
import { useAsyncData } from '../hooks';
import type { Announcement, RoleDashboard, User } from '../types';

const emptyDashboard: RoleDashboard = { role: 'student', profile: { id: '', name: '', email: '', roles: [] }, stats: [], sections: [], linkedStudents: [], announcements: [], documents: [] };
const priorities = ['normal', 'alta', 'critica'];
const types = ['institucional', 'curso', 'familias', 'docentes', 'emergencia'];
const states = ['no_leido', 'leido'];
const PAGE_SIZE = 10;

type CommunicationRow = Announcement & {
  type: string;
  recipients: string;
  status: 'leido' | 'no_leido';
  attachments: Array<{ name: string; url: string }>;
};

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function inferType(item: Announcement) {
  const text = normalize(`${item.title} ${item.audience} ${item.body}`);
  if (item.priority === 'critica' || text.includes('emergencia') || text.includes('evacuacion')) return 'emergencia';
  if (text.includes('docente') || text.includes('profesor')) return 'docentes';
  if (text.includes('familia') || text.includes('apoderado')) return 'familias';
  if (text.includes('estudiantes') || /\d/.test(text)) return 'curso';
  return 'institucional';
}

function audienceMatches(item: Announcement, user: User, dashboard: RoleDashboard) {
  if (['admin', 'director', 'inspector'].includes(user.primaryRole)) return true;
  const audience = normalize(item.audience);
  if (audience.includes('toda') || audience.includes('comunidad')) return true;
  if (user.primaryRole === 'student') {
    return audience.includes('estudiante') || dashboard.sections.some((section) => audience.includes(normalize(section.name)));
  }
  if (user.primaryRole === 'guardian') {
    return audience.includes('familia') || audience.includes('apoderado') || dashboard.linkedStudents.some((student) => audience.includes(normalize(student.name)));
  }
  if (user.primaryRole === 'teacher') {
    return audience.includes('docente') || audience.includes('profesor') || dashboard.sections.some((section) => audience.includes(normalize(section.name)));
  }
  return false;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Leido';
  return `Leido ${new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))}`;
}

export function CommunicationsPage({ user }: { user: User }) {
  const announcements = useAsyncData(loadAnnouncements, [] as Announcement[]);
  const dashboard = useAsyncData(loadMyDashboard, emptyDashboard);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [readOverrides, setReadOverrides] = useState<Record<string, Partial<Announcement>>>({});
  const [readingIds, setReadingIds] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<CommunicationRow | null>(null);
  const [page, setPage] = useState(1);
  const canPublish = user.permissions.includes('communications:manage');
  const isAdmin = ['admin', 'director', 'inspector'].includes(user.primaryRole);

  const rows: CommunicationRow[] = useMemo(() => announcements.data
    .filter((item) => audienceMatches(item, user, dashboard.data))
    .map((item) => {
      const merged: Announcement = { ...item, ...readOverrides[item.id] };
      return {
        ...merged,
        type: inferType(merged),
        recipients: merged.audience,
        status: merged.readByUser ? 'leido' : 'no_leido',
        attachments: []
      };
    }), [announcements.data, dashboard.data, readOverrides, user]);

  const filtered = rows.filter((item) => {
    const text = normalize(query.trim());
    const matchesQuery = !text || [item.title, item.body, item.recipients, item.author].some((value) => normalize(value).includes(text));
    return matchesQuery
      && (!type || item.type === type)
      && (!priority || item.priority === priority)
      && (!status || item.status === status)
      && (!date || item.date === date);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const readRate = rows.length ? Math.round((rows.filter((item) => item.status === 'leido').length / rows.length) * 100) : 0;
  const registeredReadRate = rows.length ? Math.round(rows.reduce((total, item) => total + (item.readPercentage ?? 0), 0) / rows.length) : 0;

  useEffect(() => { setPage(1); }, [date, priority, query, status, type]);

  async function markRead(id: string) {
    if (readingIds.has(id)) return;
    const previous = readOverrides[id];
    const optimisticReadAt = new Date().toISOString();
    setReadingIds((current) => new Set(current).add(id));
    setReadOverrides((current) => ({
      ...current,
      [id]: { ...current[id], readByUser: true, readAt: current[id]?.readAt ?? optimisticReadAt }
    }));
    try {
      const updated = await markAnnouncementRead(id);
      setReadOverrides((current) => ({ ...current, [id]: updated }));
      setSelected((current) => current?.id === id ? { ...current, ...updated, status: 'leido' } : current);
    } catch {
      setReadOverrides((current) => {
        const next = { ...current };
        if (previous) next[id] = previous;
        else delete next[id];
        return next;
      });
    } finally {
      setReadingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  function openDetail(row: CommunicationRow) {
    setSelected(row);
    if (row.status === 'no_leido') void markRead(row.id);
  }

  return (
    <div className="page-stack communications-page">
      <PageHeader
        eyebrow="Comunicaciones"
        title="Comunicados institucionales"
        description="Comunicaciones segmentadas por rol, prioridad, destinatarios y estado de lectura."
        actions={canPublish && <button className="primary-button"><Send size={17} /> Nuevo comunicado</button>}
      />

      {(announcements.loading || dashboard.loading) && <LoadingState label="Cargando comunicados..." />}

      <section className="communication-summary">
        <article><Megaphone size={19} /><strong>{rows.length}</strong><span>Visibles para tu rol</span></article>
        <article><AlertTriangle size={19} /><strong>{rows.filter((item) => item.priority === 'critica').length}</strong><span>Criticos</span></article>
        <article><Users size={19} /><strong>{isAdmin ? registeredReadRate : readRate}%</strong><span>{isAdmin ? 'Lectura registrada' : 'Leidos'}</span></article>
        <article><CalendarClock size={19} /><strong>{rows.filter((item) => item.status === 'no_leido').length}</strong><span>No leidos</span></article>
      </section>

      <section className="panel communication-filters">
        <label className="admin-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por titulo, destinatario, autor o contenido" /></label>
        <select value={type} onChange={(event) => setType(event.target.value)}><option value="">Todos los tipos</option>{types.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">Todas las prioridades</option>{priorities.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option>{states.map((item) => <option key={item} value={item}>{item === 'leido' ? 'Leido' : 'No leido'}</option>)}</select>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Fecha" />
      </section>

      <section className="communication-list">
        {paginated.map((row) => (
          <article key={row.id} className={`communication-card ${row.status}`}>
            <header>
              <div>
                <span className="eyebrow">{row.type}</span>
                <h2>{row.title}</h2>
              </div>
              <StatusBadge value={row.priority} />
            </header>
            <p>{row.body}</p>
            <div className="communication-meta">
              <span><Users size={15} />{row.recipients}</span>
              <span><CalendarClock size={15} />{formatDate(row.date)}</span>
              <span><CheckCircle2 size={15} />{row.status === 'leido' ? formatDateTime(row.readAt) : 'No leido'}</span>
              {isAdmin && <span><Eye size={15} />{row.readPercentage ?? 0}% lectura</span>}
            </div>
            <footer>
              <button className="secondary-button" type="button" onClick={() => openDetail(row)}><Eye size={16} />Ver detalle</button>
              {row.status === 'leido'
                ? <span className="badge badge-normal"><CheckCircle2 size={15} />Leido</span>
                : <button className="primary-button" type="button" onClick={() => void markRead(row.id)} disabled={readingIds.has(row.id)}><CheckCircle2 size={16} />Marcar leido</button>}
            </footer>
          </article>
        ))}
        {!filtered.length && <section className="panel"><EmptyState title="Sin comunicados" description="No hay comunicados que coincidan con tu rol o con los filtros seleccionados." /></section>}
      </section>
      <div className="assignment-pager">
        <button className="secondary-button" type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
        <span>Página {currentPage} de {totalPages}</span>
        <button className="secondary-button" type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Siguiente</button>
      </div>

      {selected && <CommunicationDetailModal row={selected} isAdmin={isAdmin} onClose={() => setSelected(null)} />}
      <style>{`
        @media (max-width: 768px) {
          .communications-page .communication-list,
          .communications-page .communication-card {
            width: 100%;
          }

          .communications-page .communication-filters {
            grid-template-columns: 1fr;
          }

          .communications-page .communication-filters > *,
          .communications-page .communication-card footer > * {
            width: 100%;
          }

          .communications-page .communication-card footer {
            align-items: stretch;
            flex-direction: column;
          }

          .communications-page .communication-card footer button,
          .communications-page .communication-card footer .badge {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

function CommunicationDetailModal({ row, isAdmin, onClose }: { row: CommunicationRow; isAdmin: boolean; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="communication-detail-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header>
          <div><span className="eyebrow">{row.type}</span><h2>{row.title}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </header>
        <div className="communication-detail-meta">
          <span><Users size={16} /><strong>Destinatarios</strong>{row.recipients}</span>
          <span><CalendarClock size={16} /><strong>Fecha</strong>{formatDate(row.date)}</span>
          <span><AlertTriangle size={16} /><strong>Prioridad</strong>{row.priority}</span>
          {isAdmin && <span><Eye size={16} /><strong>Lectura</strong>{row.readPercentage ?? 0}% registrada</span>}
          <span><CheckCircle2 size={16} /><strong>Estado</strong>{row.status === 'leido' ? formatDateTime(row.readAt) : 'No leido'}</span>
        </div>
        <p>{row.body}</p>
        <section className="communication-attachments">
          <h3>Adjuntos</h3>
          {row.attachments.length ? row.attachments.map((item) => <a key={item.url} href={item.url}><FileUp size={16} />{item.name}</a>) : <EmptyState title="Sin adjuntos" description="Este comunicado no tiene archivos asociados." />}
        </section>
      </section>
    </div>
  );
}
