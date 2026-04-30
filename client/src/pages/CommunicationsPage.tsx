import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, FileUp, Megaphone, Search, Send, Users } from 'lucide-react';
import { loadAnnouncements } from '../api';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useAsyncData } from '../hooks';
import type { Announcement, User } from '../types';

const communicationTypes = ['institucional', 'curso', 'asignatura', 'emergencia'];
const states = ['activo', 'programado', 'archivado'];

export function CommunicationsPage({ user }: { user: User }) {
  const { data } = useAsyncData(loadAnnouncements, [] as Announcement[]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const canPublish = user.permissions.includes('communications:manage');
  const rows = useMemo(() => data.map((announcement, index) => ({
    ...announcement,
    type: communicationTypes[index % communicationTypes.length],
    recipients: announcement.audience,
    status: states[index % states.length],
    readRate: [92, 78, 88, 64][index % 4]
  })), [data]);
  const filtered = rows.filter((announcement) => {
    const normalized = query.trim().toLowerCase();
    const matchesQuery = !normalized || [announcement.title, announcement.body, announcement.recipients, announcement.author].some((value) => value.toLowerCase().includes(normalized));
    return matchesQuery && (!type || announcement.type === type) && (!priority || announcement.priority === priority) && (!status || announcement.status === status);
  });

  return (
    <div className="page-stack communications-page">
      <PageHeader
        eyebrow="Comunicaciones"
        title="Comunicados institucionales"
        description="Comunicaciones segmentadas por tipo, destinatarios, prioridad, confirmación de lectura y estado."
        actions={canPublish && <button className="primary-button"><Send size={17} /> Nuevo comunicado</button>}
      />

      <section className="communication-summary">
        <article><Megaphone size={19} /><strong>{rows.length}</strong><span>Comunicados</span></article>
        <article><AlertTriangle size={19} /><strong>{rows.filter((item) => item.type === 'emergencia').length}</strong><span>Emergencias</span></article>
        <article><Users size={19} /><strong>{Math.round(rows.reduce((sum, item) => sum + item.readRate, 0) / Math.max(rows.length, 1))}%</strong><span>Lectura promedio</span></article>
        <article><CalendarClock size={19} /><strong>{rows.filter((item) => item.status === 'programado').length}</strong><span>Programados</span></article>
      </section>

      <section className="panel communication-filters">
        <label className="admin-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, destinatario o autor" /></label>
        <select value={type} onChange={(event) => setType(event.target.value)}><option value="">Todos los tipos</option>{communicationTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">Todas las prioridades</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="critica">Crítica</option></select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option>{states.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      </section>

      <section className="panel">
        <DataTable
          rows={filtered}
          columns={[
            { header: 'Comunicado', render: (row) => <strong>{row.title}</strong> },
            { header: 'Tipo', render: (row) => <StatusBadge value={row.type} /> },
            { header: 'Destinatarios', render: (row) => row.recipients },
            { header: 'Prioridad', render: (row) => <StatusBadge value={row.priority} /> },
            { header: 'Lectura', render: (row) => <span className="read-confirmation"><CheckCircle2 size={15} /> {row.readRate}%</span> },
            { header: 'Adjuntos', render: () => <span className="read-confirmation"><FileUp size={15} /> 0</span> },
            { header: 'Estado', render: (row) => <StatusBadge value={row.status} /> }
          ]}
        />
      </section>
    </div>
  );
}
