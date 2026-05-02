import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Eye, FileUp, Megaphone, Search, Send, Users, X } from 'lucide-react';
import { loadAnnouncements, loadMyDashboard } from '../api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState, LoadingState } from '../components/States';
import { useAsyncData } from '../hooks';
import type { Announcement, RoleDashboard, User } from '../types';

const emptyDashboard: RoleDashboard = { role: 'student', profile: { id: '', name: '', email: '', roles: [] }, stats: [], sections: [], linkedStudents: [], announcements: [], documents: [] };
const priorities = ['normal', 'alta', 'critica'];
const types = ['institucional', 'curso', 'familias', 'docentes', 'emergencia'];
const states = ['no_leido', 'leido'];

type CommunicationRow = Announcement & {
  type: string;
  recipients: string;
  status: 'leido' | 'no_leido';
  attachments: Array<{ name: string; url: string }>;
};

function storageKey(userId: string) {
  return `school-read-announcements:${userId}`;
}

function readSet(userId: string) {
  const raw = localStorage.getItem(storageKey(userId));
  return new Set(raw ? JSON.parse(raw) as string[] : []);
}

function saveReadSet(userId: string, ids: Set<string>) {
  localStorage.setItem(storageKey(userId), JSON.stringify(Array.from(ids)));
}

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

export function CommunicationsPage({ user }: { user: User }) {
  const announcements = useAsyncData(loadAnnouncements, [] as Announcement[]);
  const dashboard = useAsyncData(loadMyDashboard, emptyDashboard);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [readIds, setReadIds] = useState<Set<string>>(() => readSet(user.id));
  const [selected, setSelected] = useState<CommunicationRow | null>(null);
  const canPublish = user.permissions.includes('communications:manage');
  const isAdmin = ['admin', 'director', 'inspector'].includes(user.primaryRole);

  useEffect(() => saveReadSet(user.id, readIds), [readIds, user.id]);

  const rows: CommunicationRow[] = useMemo(() => announcements.data
    .filter((item) => audienceMatches(item, user, dashboard.data))
    .map((item) => ({
      ...item,
      type: inferType(item),
      recipients: item.audience,
      status: readIds.has(item.id) ? 'leido' : 'no_leido',
      attachments: []
    })), [announcements.data, dashboard.data, readIds, user]);

  const filtered = rows.filter((item) => {
    const text = normalize(query.trim());
    const matchesQuery = !text || [item.title, item.body, item.recipients, item.author].some((value) => normalize(value).includes(text));
    return matchesQuery
      && (!type || item.type === type)
      && (!priority || item.priority === priority)
      && (!status || item.status === status)
      && (!date || item.date === date);
  });
  const readRate = rows.length ? Math.round((rows.filter((item) => item.status === 'leido').length / rows.length) * 100) : 0;

  function markRead(id: string) {
    setReadIds((current) => new Set(current).add(id));
  }

  function openDetail(row: CommunicationRow) {
    setSelected(row);
    markRead(row.id);
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
        <article><AlertTriangle size={19} /><strong>{rows.filter((item) => item.priority === 'critica').length}</strong><span>Críticos</span></article>
        <article><Users size={19} /><strong>{readRate}%</strong><span>{isAdmin ? 'Lectura registrada' : 'Leídos'}</span></article>
        <article><CalendarClock size={19} /><strong>{rows.filter((item) => item.status === 'no_leido').length}</strong><span>No leídos</span></article>
      </section>

      <section className="panel communication-filters">
        <label className="admin-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, destinatario, autor o contenido" /></label>
        <select value={type} onChange={(event) => setType(event.target.value)}><option value="">Todos los tipos</option>{types.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">Todas las prioridades</option>{priorities.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option>{states.map((item) => <option key={item} value={item}>{item === 'leido' ? 'Leído' : 'No leído'}</option>)}</select>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Fecha" />
      </section>

      <section className="communication-list">
        {filtered.map((row) => (
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
              <span><CheckCircle2 size={15} />{row.status === 'leido' ? 'Leído' : 'No leído'}</span>
              {isAdmin && <span><Eye size={15} />{readRate}% lectura</span>}
            </div>
            <footer>
              <button className="secondary-button" type="button" onClick={() => openDetail(row)}><Eye size={16} />Ver detalle</button>
              {row.status === 'no_leido' && <button className="primary-button" type="button" onClick={() => markRead(row.id)}><CheckCircle2 size={16} />Marcar leído</button>}
            </footer>
          </article>
        ))}
        {!filtered.length && <section className="panel"><EmptyState title="Sin comunicados" description="No hay comunicados que coincidan con tu rol o con los filtros seleccionados." /></section>}
      </section>

      {selected && <CommunicationDetailModal row={selected} isAdmin={isAdmin} readRate={readRate} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CommunicationDetailModal({ row, isAdmin, readRate, onClose }: { row: CommunicationRow; isAdmin: boolean; readRate: number; onClose: () => void }) {
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
          {isAdmin && <span><Eye size={16} /><strong>Lectura</strong>{readRate}% registrada</span>}
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
