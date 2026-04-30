import { FormEvent, useMemo, useState, useEffect } from 'react';
import { Clock, MessageSquare, Paperclip, Search, Send, UserCheck } from 'lucide-react';
import { api, loadRequests, updateRequestStatus } from '../api';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import type { RequestTicket, User } from '../types';

const ticketStates = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'resuelto', label: 'Resuelto' },
  { value: 'rechazado', label: 'Rechazado' }
];

export function RequestsPage({ user }: { user: User }) {
  const [subject, setSubject] = useState('');
  const [area, setArea] = useState('Secretaria');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [tickets, setTickets] = useState<RequestTicket[]>([]);
  const canManageRequests = user.permissions.includes('requests:manage');

  useEffect(() => {
    loadRequests().then(setTickets).catch(() => setTickets([]));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!subject.trim()) return;
    const { data } = await api.post<RequestTicket>('/requests', { subject, area });
    setTickets((current) => [data, ...current]);
    setSubject('');
  }

  async function handleStatus(id: string, nextStatus: string) {
    const updated = await updateRequestStatus(id, nextStatus);
    setTickets((current) => current.map((ticket) => ticket.id === id ? updated : ticket));
  }

  const decoratedTickets = useMemo(() => tickets.map((ticket, index) => ({
    ...ticket,
    responsible: canManageRequests ? user.name : 'Mesa de ayuda',
    comments: index % 3,
    attachments: index % 2,
    history: ['Creado', ticket.status === 'nuevo' ? 'Pendiente de revisión' : 'Actualizado'].join(' · ')
  })), [canManageRequests, tickets, user.name]);
  const filtered = decoratedTickets.filter((ticket) => {
    const normalized = query.trim().toLowerCase();
    const matchesQuery = !normalized || [ticket.subject, ticket.requester, ticket.area, ticket.responsible].some((value) => value.toLowerCase().includes(normalized));
    return matchesQuery && (!status || ticket.status === status);
  });

  return (
    <div className="page-stack tickets-page">
      <PageHeader eyebrow="Solicitudes" title="Tickets administrativos" description="Seguimiento de solicitudes con estados, responsable, comentarios, adjuntos e historial." />

      <section className="ticket-summary">
        <article><Clock size={19} /><strong>{tickets.filter((ticket) => ticket.status === 'nuevo').length}</strong><span>Nuevos</span></article>
        <article><UserCheck size={19} /><strong>{tickets.filter((ticket) => ticket.status === 'en_proceso').length}</strong><span>En proceso</span></article>
        <article><MessageSquare size={19} /><strong>{decoratedTickets.reduce((sum, ticket) => sum + ticket.comments, 0)}</strong><span>Comentarios</span></article>
        <article><Paperclip size={19} /><strong>{decoratedTickets.reduce((sum, ticket) => sum + ticket.attachments, 0)}</strong><span>Adjuntos</span></article>
      </section>

      <section className="request-layout">
        <form className="request-form" onSubmit={handleSubmit} noValidate>
          <h2>Nueva solicitud</h2>
          <label>
            Asunto
            <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ej: Certificado alumno regular" />
          </label>
          <label>
            Área
            <select value={area} onChange={(event) => setArea(event.target.value)}>
              <option>Secretaria</option>
              <option>Administracion</option>
              <option>Convivencia Escolar</option>
              <option>Soporte TI</option>
            </select>
          </label>
          <button className="primary-button" type="submit" disabled={!subject.trim()}><Send size={17} /> Enviar ticket</button>
        </form>

        <section className="panel">
          <div className="ticket-toolbar">
            <label className="admin-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ticket, solicitante, área o responsable" /></label>
            <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option>{ticketStates.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          </div>
          <DataTable
            rows={filtered}
            columns={[
              { header: 'Ticket', render: (row) => <strong>{row.subject}</strong> },
              { header: 'Solicitante', render: (row) => row.requester },
              { header: 'Área', render: (row) => row.area },
              { header: 'Responsable', render: (row) => row.responsible },
              { header: 'Historial', render: (row) => row.history },
              { header: 'Estado', render: (row) => <StatusBadge value={row.status} /> },
              ...(canManageRequests ? [{
                header: 'Gestión',
                render: (row: RequestTicket) => (
                  <select value={row.status} onChange={(event) => handleStatus(row.id, event.target.value)}>
                    {ticketStates.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                )
              }] : [])
            ]}
          />
        </section>
      </section>
    </div>
  );
}
