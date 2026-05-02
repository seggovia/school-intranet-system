import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Eye, MessageSquare, Search, Send, UserCheck, X } from 'lucide-react';
import { api, loadRequests, updateRequestStatus } from '../api';
import { EmptyState, LoadingState } from '../components/States';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import type { RequestTicket, User } from '../types';

const ticketStates = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'resuelto', label: 'Resuelto' },
  { value: 'rechazado', label: 'Rechazado' }
] as const;
const areas = ['Secretaria', 'Administracion', 'Convivencia Escolar', 'Soporte TI'];
const priorities = ['baja', 'normal', 'alta', 'critica'] as const;

type TicketPriority = typeof priorities[number];
type TicketMeta = {
  description: string;
  priority: TicketPriority;
  responsible: string;
  comments: Array<{ id: string; author: string; body: string; date: string }>;
  history: Array<{ id: string; label: string; date: string; actor: string }>;
};
type TicketRow = RequestTicket & TicketMeta;

function metaKey() {
  return 'school-request-ticket-meta';
}

function loadMeta() {
  const raw = localStorage.getItem(metaKey());
  return raw ? JSON.parse(raw) as Record<string, TicketMeta> : {};
}

function saveMeta(meta: Record<string, TicketMeta>) {
  localStorage.setItem(metaKey(), JSON.stringify(meta));
}

function defaultMeta(ticket: RequestTicket): TicketMeta {
  return {
    description: '',
    priority: 'normal',
    responsible: 'Mesa de ayuda',
    comments: [],
    history: [{ id: `${ticket.id}-created`, label: 'Solicitud creada', date: ticket.createdAt, actor: ticket.requester }]
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function statusLabel(value: string) {
  return ticketStates.find((item) => item.value === value)?.label ?? value;
}

export function RequestsPage({ user }: { user: User }) {
  const [tickets, setTickets] = useState<RequestTicket[]>([]);
  const [meta, setMeta] = useState<Record<string, TicketMeta>>(() => loadMeta());
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [area, setArea] = useState('Secretaria');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [requesterFilter, setRequesterFilter] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [comment, setComment] = useState('');
  const [page, setPage] = useState(1);
  const canManageRequests = user.permissions.includes('requests:manage');
  const pageSize = 8;

  useEffect(() => {
    loadRequests().then(setTickets).catch(() => setTickets([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => saveMeta(meta), [meta]);

  const rows: TicketRow[] = useMemo(() => tickets.map((ticket) => ({ ...ticket, ...(meta[ticket.id] ?? defaultMeta(ticket)) })), [meta, tickets]);
  const requesterOptions = useMemo(() => Array.from(new Set(rows.map((ticket) => ticket.requester))).sort(), [rows]);
  const filtered = rows.filter((ticket) => {
    const normalized = query.trim().toLowerCase();
    const matchesQuery = !normalized || [ticket.subject, ticket.description, ticket.requester, ticket.area, ticket.responsible].some((value) => value.toLowerCase().includes(normalized));
    return matchesQuery
      && (!status || ticket.status === status)
      && (!areaFilter || ticket.area === areaFilter)
      && (!priorityFilter || ticket.priority === priorityFilter)
      && (!requesterFilter || ticket.requester === requesterFilter);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setPage(1); }, [areaFilter, priorityFilter, query, requesterFilter, status]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (subject.trim().length < 4) return setError('El asunto debe tener al menos 4 caracteres.');
    if (description.trim().length < 12) return setError('La descripción es obligatoria y debe explicar la solicitud.');
    try {
      const { data } = await api.post<RequestTicket>('/requests', { subject: subject.trim(), area });
      setTickets((current) => [data, ...current]);
      setMeta((current) => ({
        ...current,
        [data.id]: {
          description: description.trim(),
          priority,
          responsible: 'Mesa de ayuda',
          comments: [],
          history: [{ id: `${data.id}-created`, label: 'Solicitud creada', date: data.createdAt, actor: user.name }]
        }
      }));
      setSubject('');
      setDescription('');
      setPriority('normal');
    } catch {
      setError('No se pudo crear la solicitud. Revisa los datos e intenta nuevamente.');
    }
  }

  async function handleStatus(ticket: TicketRow, nextStatus: string) {
    const updated = await updateRequestStatus(ticket.id, nextStatus);
    setTickets((current) => current.map((item) => item.id === ticket.id ? updated : item));
    setMeta((current) => ({
      ...current,
      [ticket.id]: {
        ...(current[ticket.id] ?? defaultMeta(ticket)),
        responsible: canManageRequests ? user.name : ticket.responsible,
        history: [...(current[ticket.id]?.history ?? ticket.history), { id: `${ticket.id}-${Date.now()}`, label: `Estado cambiado a ${statusLabel(nextStatus)}`, date: today(), actor: user.name }]
      }
    }));
    if (selected?.id === ticket.id) setSelected({ ...ticket, ...updated, status: updated.status });
  }

  function addComment(ticket: TicketRow) {
    if (comment.trim().length < 3) return;
    const nextComment = { id: `${ticket.id}-comment-${Date.now()}`, author: user.name, body: comment.trim(), date: today() };
    setMeta((current) => ({
      ...current,
      [ticket.id]: {
        ...(current[ticket.id] ?? defaultMeta(ticket)),
        comments: [...ticket.comments, nextComment],
        history: [...ticket.history, { id: `${ticket.id}-history-${Date.now()}`, label: 'Comentario agregado', date: today(), actor: user.name }]
      }
    }));
    setSelected((current) => current ? { ...current, comments: [...current.comments, nextComment], history: [...current.history, { id: `${ticket.id}-history-${Date.now()}`, label: 'Comentario agregado', date: today(), actor: user.name }] } : current);
    setComment('');
  }

  return (
    <div className="page-stack tickets-page">
      <PageHeader eyebrow="Solicitudes" title="Tickets administrativos" description="Seguimiento de solicitudes con estados, responsables, comentarios e historial." />
      {loading && <LoadingState label="Cargando solicitudes..." />}

      <section className="ticket-summary">
        <article><Clock size={19} /><strong>{rows.filter((ticket) => ticket.status === 'nuevo').length}</strong><span>Nuevos</span></article>
        <article><UserCheck size={19} /><strong>{rows.filter((ticket) => ticket.status === 'en_proceso').length}</strong><span>En proceso</span></article>
        <article><MessageSquare size={19} /><strong>{rows.reduce((sum, ticket) => sum + ticket.comments.length, 0)}</strong><span>Comentarios</span></article>
        <article><AlertTriangle size={19} /><strong>{rows.filter((ticket) => ticket.priority === 'critica').length}</strong><span>Críticos</span></article>
      </section>

      <section className="request-layout">
        <form className="request-form" onSubmit={handleSubmit} noValidate>
          <h2>Nueva solicitud</h2>
          {error && <p className="form-error">{error}</p>}
          <label>Asunto<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ej: Certificado alumno regular" /></label>
          <label>Área<select value={area} onChange={(event) => setArea(event.target.value)}>{areas.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Prioridad<select value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)}>{priorities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe el motivo, contexto y cualquier fecha relevante." rows={5} /></label>
          <button className="primary-button" type="submit"><Send size={17} /> Enviar ticket</button>
        </form>

        <section className="panel ticket-workspace">
          <div className="ticket-toolbar">
            <label className="admin-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ticket, solicitante, área o responsable" /></label>
            <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option>{ticketStates.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}><option value="">Todas las áreas</option>{areas.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="">Todas las prioridades</option>{priorities.map((item) => <option key={item}>{item}</option>)}</select>
            {canManageRequests && <select value={requesterFilter} onChange={(event) => setRequesterFilter(event.target.value)}><option value="">Todos los solicitantes</option>{requesterOptions.map((item) => <option key={item}>{item}</option>)}</select>}
          </div>

          <div className="ticket-list">
            {visible.map((ticket) => (
              <article key={ticket.id} className="ticket-card">
                <div><strong>{ticket.subject}</strong><small>{ticket.requester} · {ticket.area} · {ticket.createdAt}</small></div>
                <span className={`priority-badge ${ticket.priority}`}>{ticket.priority}</span>
                <span>{ticket.responsible}</span>
                <StatusBadge value={ticket.status} />
                <div className="ticket-actions">
                  <button className="secondary-button" onClick={() => setSelected(ticket)}><Eye size={16} />Ver detalle</button>
                  {canManageRequests && <select value={ticket.status} onChange={(event) => handleStatus(ticket, event.target.value)}>{ticketStates.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>}
                </div>
              </article>
            ))}
            {!visible.length && <EmptyState title="Sin solicitudes" description="No hay tickets que coincidan con los filtros. Crea una nueva solicitud o ajusta la búsqueda." />}
          </div>
          <div className="assignment-pager">
            <button className="secondary-button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
            <span>Página {currentPage} de {totalPages}</span>
            <button className="secondary-button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Siguiente</button>
          </div>
        </section>
      </section>

      {selected && (
        <TicketDetailModal
          ticket={selected}
          comment={comment}
          canManage={canManageRequests}
          onComment={setComment}
          onAddComment={() => addComment(selected)}
          onStatus={(nextStatus) => handleStatus(selected, nextStatus)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function TicketDetailModal({ ticket, comment, canManage, onComment, onAddComment, onStatus, onClose }: { ticket: TicketRow; comment: string; canManage: boolean; onComment: (value: string) => void; onAddComment: () => void; onStatus: (status: string) => void; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="ticket-detail-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header><div><span className="eyebrow">Ticket administrativo</span><h2>{ticket.subject}</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></header>
        <div className="ticket-detail-grid">
          <span><strong>Estado</strong><StatusBadge value={ticket.status} /></span>
          <span><strong>Responsable</strong>{ticket.responsible}</span>
          <span><strong>Solicitante</strong>{ticket.requester}</span>
          <span><strong>Área</strong>{ticket.area}</span>
          <span><strong>Prioridad</strong><em className={`priority-badge ${ticket.priority}`}>{ticket.priority}</em></span>
          <span><strong>Fecha</strong>{ticket.createdAt}</span>
        </div>
        <section><h3>Descripción</h3><p>{ticket.description || 'Sin descripción registrada para este ticket antiguo.'}</p></section>
        {canManage && <label>Cambiar estado<select value={ticket.status} onChange={(event) => onStatus(event.target.value)}>{ticketStates.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
        <section className="ticket-comments"><h3>Comentarios</h3>{ticket.comments.map((item) => <article key={item.id}><strong>{item.author}</strong><span>{item.date}</span><p>{item.body}</p></article>)}{!ticket.comments.length && <EmptyState title="Sin comentarios" description="Agrega un comentario para dejar trazabilidad." />}<textarea value={comment} onChange={(event) => onComment(event.target.value)} placeholder="Escribe un comentario del ticket" rows={3} /><button className="primary-button" onClick={onAddComment}><MessageSquare size={16} />Comentar</button></section>
        <section className="ticket-history"><h3>Historial</h3>{ticket.history.map((item) => <span key={item.id}><CalendarClock size={15} /><strong>{item.label}</strong>{item.date} · {item.actor}</span>)}</section>
      </section>
    </div>
  );
}
