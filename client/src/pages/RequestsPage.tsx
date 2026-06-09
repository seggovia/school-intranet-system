import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Eye, MessageSquare, Search, Send, UserCheck, X } from 'lucide-react';
import { api, loadRequests, updateRequestStatus } from '../api';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/States';
import { StatusBadge } from '../components/StatusBadge';
import type { RequestTicket, User } from '../types';

const ticketStates = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'resuelto', label: 'Resuelto' },
  { value: 'cerrado', label: 'Cerrado' },
  { value: 'rechazado', label: 'Rechazado' }
] as const;
const areas = ['Secretaria', 'Administracion', 'Convivencia Escolar', 'Soporte TI'];
const priorities = ['normal', 'alta', 'urgente'] as const;
const DESCRIPTION_LIMIT = 2000;
const DESCRIPTION_WARNING_LIMIT = 1800;

type TicketStatus = typeof ticketStates[number]['value'];
type TicketPriority = typeof priorities[number];
type TicketListItem = RequestTicket & {
  description?: string | null;
  priority?: TicketPriority;
  closedAt?: string | null;
  commentsCount?: number;
};
type TicketComment = { id: string; author: string; body: string; createdAt: string };
type TicketStatusLog = { id: string; fromStatus: string; toStatus: string; changedBy: string; createdAt: string };
type TicketDetail = TicketListItem & {
  comments: TicketComment[];
  statusLogs: TicketStatusLog[];
};

function statusLabel(value: string) {
  return ticketStates.find((item) => item.value === value)?.label ?? value;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function priorityStyle(priority: TicketPriority) {
  if (priority === 'urgente') return { background: '#fee2e2', color: '#991b1b' };
  if (priority === 'alta') return { background: '#fef3c7', color: '#92400e' };
  return { background: '#e7eef5', color: '#334155' };
}

function characterCounterColor(length: number) {
  if (length > DESCRIPTION_LIMIT) return '#dc2626';
  if (length > DESCRIPTION_WARNING_LIMIT) return '#d97706';
  return 'var(--color-muted)';
}

export function RequestsPage({ user }: { user: User }) {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
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
  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canManageRequests = user.permissions.includes('requests:manage');
  const pageSize = 8;
  const descriptionOverLimit = description.length > DESCRIPTION_LIMIT;

  useEffect(() => {
    loadRequests().then((data) => setTickets(data as TicketListItem[])).catch(() => setTickets([])).finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => tickets.map((ticket) => ({ ...ticket, priority: ticket.priority ?? 'normal' })), [tickets]);
  const requesterOptions = useMemo(() => Array.from(new Set(rows.map((ticket) => ticket.requester))).sort(), [rows]);
  const filtered = rows.filter((ticket) => {
    const normalized = query.trim().toLowerCase();
    const matchesQuery = !normalized || [ticket.subject, ticket.description ?? '', ticket.requester, ticket.area].some((value) => value.toLowerCase().includes(normalized));
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

  async function loadDetail(id: string) {
    setDetailLoading(true);
    try {
      const { data } = await api.get<TicketDetail>(`/requests/${id}`);
      setSelected(data);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError('');
    if (subject.trim().length < 4) return setError('El asunto debe tener al menos 4 caracteres.');
    if (descriptionOverLimit) return setError('La descripcion no puede superar 2000 caracteres.');
    setSubmitting(true);
    try {
      const { data } = await api.post<TicketListItem>('/requests', { subject: subject.trim(), area, description: description.trim() || undefined, priority });
      setTickets((current) => [data, ...current]);
      setSubject('');
      setDescription('');
      setPriority('normal');
      setFormOpen(false);
    } catch {
      setError('No se pudo crear la solicitud. Revisa los datos e intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatus(ticket: TicketListItem, nextStatus: string) {
    const updated = await updateRequestStatus(ticket.id, nextStatus);
    setTickets((current) => current.map((item) => item.id === ticket.id ? { ...item, ...(updated as TicketListItem) } : item));
    if (selected?.id === ticket.id) await loadDetail(ticket.id);
  }

  async function addComment(ticket: TicketDetail) {
    if (comment.trim().length < 1) return;
    const { data } = await api.post<TicketComment>(`/requests/${ticket.id}/comments`, { body: comment.trim() });
    setSelected((current) => current ? { ...current, comments: [...current.comments, data] } : current);
    setTickets((current) => current.map((item) => item.id === ticket.id ? { ...item, commentsCount: (item.commentsCount ?? 0) + 1 } : item));
    setComment('');
  }

  return (
    <div className="page-stack tickets-page">
      <PageHeader eyebrow="Solicitudes" title="Tickets administrativos" description="Seguimiento de solicitudes con estados, responsables, comentarios e historial." />
      {loading && <LoadingState label="Cargando solicitudes..." />}

      <section className="ticket-summary">
        <article><Clock size={19} /><strong>{rows.filter((ticket) => ticket.status === 'nuevo').length}</strong><span>Nuevos</span></article>
        <article><UserCheck size={19} /><strong>{rows.filter((ticket) => ticket.status === 'en_proceso').length}</strong><span>En proceso</span></article>
        <article><MessageSquare size={19} /><strong>{rows.reduce((sum, ticket) => sum + (ticket.commentsCount ?? 0), 0)}</strong><span>Comentarios</span></article>
        <article><AlertTriangle size={19} /><strong>{rows.filter((ticket) => ticket.priority === 'urgente').length}</strong><span>Urgentes</span></article>
      </section>

      <section className="request-layout">
        <div className={`request-form-panel ${formOpen ? 'mobile-open' : ''}`}>
        <form className="request-form" onSubmit={handleSubmit} noValidate>
          <header className="request-form-header">
            <h2>Nueva solicitud</h2>
            <button className="icon-button request-form-close" type="button" onClick={() => setFormOpen(false)} aria-label="Cerrar formulario"><X size={18} /></button>
          </header>
          {error && <p className="form-error">{error}</p>}
          <label>Asunto<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ej: Certificado alumno regular" /></label>
          <label>Area<select value={area} onChange={(event) => setArea(event.target.value)}>{areas.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Prioridad<select value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)}>{priorities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>
            Descripcion
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe el motivo, contexto y cualquier fecha relevante." rows={5} />
            <span className="character-counter" style={{ color: characterCounterColor(description.length) }}>{description.length} / {DESCRIPTION_LIMIT} caracteres</span>
          </label>
          <button className="primary-button" type="submit" disabled={submitting || descriptionOverLimit}>
            {submitting
              ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 6 }} />Enviando...</>
              : <><Send size={17} /> Enviar ticket</>}
          </button>
        </form>
        </div>

        <section className="panel ticket-workspace">
          <div className="ticket-toolbar">
            <label className="admin-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ticket, solicitante o area" /></label>
            <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option>{ticketStates.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}><option value="">Todas las areas</option>{areas.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="">Todas las prioridades</option>{priorities.map((item) => <option key={item}>{item}</option>)}</select>
            {canManageRequests && <select value={requesterFilter} onChange={(event) => setRequesterFilter(event.target.value)}><option value="">Todos los solicitantes</option>{requesterOptions.map((item) => <option key={item}>{item}</option>)}</select>}
          </div>

          <div className="ticket-list">
            {visible.map((ticket) => (
              <article key={ticket.id} className="ticket-card">
                <div><strong>{ticket.subject}</strong><small>{ticket.requester} - {ticket.area} - {ticket.createdAt}</small></div>
                <span className={`priority-badge ${ticket.priority}`} style={priorityStyle(ticket.priority)}>{ticket.priority}</span>
                <span>{ticket.commentsCount ?? 0} comentarios</span>
                <StatusBadge value={ticket.status} />
                <div className="ticket-actions">
                  <button className="secondary-button" type="button" onClick={() => void loadDetail(ticket.id)}><Eye size={16} />Ver detalle</button>
                  {canManageRequests && <select value={ticket.status} onChange={(event) => void handleStatus(ticket, event.target.value)}>{ticketStates.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>}
                </div>
              </article>
            ))}
            {!visible.length && <EmptyState icon={<MessageSquare size={48} />} title="Sin solicitudes" description="No hay tickets que coincidan con los filtros. Crea una nueva solicitud o ajusta la busqueda." />}
          </div>
          <div className="assignment-pager">
            <button className="secondary-button" type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
            <span>Pagina {currentPage} de {totalPages}</span>
            <button className="secondary-button" type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Siguiente</button>
          </div>
        </section>
      </section>
      <button className="primary-button new-request-fab" type="button" onClick={() => setFormOpen(true)}>
        + Nueva solicitud
      </button>

      {detailLoading && <LoadingState label="Cargando detalle..." />}
      {selected && (
        <TicketDetailModal
          ticket={selected}
          comment={comment}
          canManage={canManageRequests}
          onComment={setComment}
          onAddComment={() => void addComment(selected)}
          onStatus={(nextStatus) => void handleStatus(selected, nextStatus)}
          onClose={() => setSelected(null)}
        />
      )}
      <style>{`
        .request-form-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .request-form-header h2 {
          margin: 0;
        }

        .request-form-close,
        .new-request-fab {
          display: none;
        }

        .tickets-page .character-counter {
          display: block;
          margin-top: 6px;
          font-size: 12px;
          text-align: right;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .tickets-page .request-layout {
            grid-template-columns: 1fr;
          }

          .tickets-page .ticket-workspace {
            width: 100%;
          }

          .tickets-page .request-form-panel {
            display: none;
          }

          .tickets-page .request-form-panel.mobile-open {
            position: fixed;
            inset: auto 0 0;
            z-index: 60;
            display: block;
            padding: 12px;
            background: rgba(15, 23, 42, 0.38);
          }

          .tickets-page .request-form-panel.mobile-open .request-form {
            max-height: calc(100vh - 48px);
            overflow: auto;
            border-radius: 14px 14px 0 0;
          }

          .tickets-page .request-form-close {
            display: inline-flex;
          }

          .tickets-page .new-request-fab {
            position: fixed;
            right: 18px;
            bottom: 18px;
            z-index: 50;
            display: inline-flex;
            min-height: 46px;
            padding: 0 16px;
            box-shadow: 0 16px 35px rgba(15, 23, 42, 0.24);
          }

          .tickets-page .ticket-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .tickets-page .ticket-toolbar > * {
            width: 100%;
          }

          .tickets-page .ticket-card {
            grid-template-columns: 1fr;
          }

          .tickets-page .ticket-actions {
            justify-content: stretch;
          }

          .tickets-page .ticket-actions > * {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

function TicketDetailModal({ ticket, comment, canManage, onComment, onAddComment, onStatus, onClose }: { ticket: TicketDetail; comment: string; canManage: boolean; onComment: (value: string) => void; onAddComment: () => void; onStatus: (status: string) => void; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="ticket-detail-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header><div><span className="eyebrow">Ticket administrativo</span><h2>{ticket.subject}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></header>
        <div className="ticket-detail-grid">
          <span><strong>Estado</strong><StatusBadge value={ticket.status} /></span>
          <span><strong>Solicitante</strong>{ticket.requester}</span>
          <span><strong>Area</strong>{ticket.area}</span>
          <span><strong>Prioridad</strong><em className={`priority-badge ${ticket.priority}`} style={priorityStyle(ticket.priority ?? 'normal')}>{ticket.priority ?? 'normal'}</em></span>
          <span><strong>Fecha</strong>{ticket.createdAt}</span>
          {ticket.closedAt && <span><strong>Cierre</strong>{formatDateTime(ticket.closedAt)}</span>}
        </div>
        <section><h3>Descripcion</h3><p>{ticket.description || 'Sin descripcion registrada.'}</p></section>
        {canManage && <label>Cambiar estado<select value={ticket.status} onChange={(event) => onStatus(event.target.value)}>{ticketStates.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
        <section className="ticket-comments"><h3>Comentarios</h3>{ticket.comments.map((item) => <article key={item.id}><strong>{item.author}</strong><span>{formatDateTime(item.createdAt)}</span><p>{item.body}</p></article>)}{!ticket.comments.length && <EmptyState title="Sin comentarios" description="Agrega un comentario para dejar trazabilidad." />}<textarea value={comment} onChange={(event) => onComment(event.target.value)} placeholder="Escribe un comentario del ticket" rows={3} /><button className="primary-button" type="button" onClick={onAddComment}><MessageSquare size={16} />Comentar</button></section>
        <section className="ticket-history"><h3>Historial</h3>{ticket.statusLogs.map((item) => <span key={item.id}><CalendarClock size={15} /><strong>{statusLabel(item.fromStatus)} a {statusLabel(item.toStatus)}</strong>{formatDateTime(item.createdAt)} - {item.changedBy}</span>)}{!ticket.statusLogs.length && <span><CalendarClock size={15} /><strong>Solicitud creada</strong>{ticket.createdAt} - {ticket.requester}</span>}</section>
      </section>
    </div>
  );
}
