import { FormEvent, useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { api, loadRequests, updateRequestStatus } from '../api';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import type { RequestTicket, User } from '../types';

export function RequestsPage({ user }: { user: User }) {
  const [subject, setSubject] = useState('');
  const [area, setArea] = useState('Secretaria');
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

  async function handleStatus(id: string, status: string) {
    const updated = await updateRequestStatus(id, status);
    setTickets((current) => current.map((ticket) => ticket.id === id ? updated : ticket));
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Autoservicio</span>
          <h1>Solicitudes administrativas</h1>
          <p>Seguimiento de certificados, reservas, soporte y requerimientos internos.</p>
        </div>
      </section>

      <section className="request-layout">
        <form className="request-form" onSubmit={handleSubmit}>
          <h2>Nueva solicitud</h2>
          <label>
            Asunto
            <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ej: Certificado alumno regular" />
          </label>
          <label>
            Area
            <select value={area} onChange={(event) => setArea(event.target.value)}>
              <option>Secretaria</option>
              <option>Administracion</option>
              <option>Convivencia Escolar</option>
              <option>Soporte TI</option>
            </select>
          </label>
          <button className="primary-button" type="submit"><Send size={17} /> Enviar</button>
        </form>

        <section className="panel">
          <h2>Historial</h2>
          <DataTable
            rows={tickets}
            columns={[
              { header: 'Asunto', render: (row) => row.subject },
              { header: 'Solicitante', render: (row) => row.requester },
              { header: 'Area', render: (row) => row.area },
              { header: 'Fecha', render: (row) => row.createdAt },
              { header: 'Estado', render: (row) => <StatusBadge value={row.status} /> },
              ...(canManageRequests ? [{
                header: 'Gestion',
                render: (row: RequestTicket) => (
                  <select value={row.status} onChange={(event) => handleStatus(row.id, event.target.value)}>
                    <option value="nuevo">Nuevo</option>
                    <option value="en_proceso">En proceso</option>
                    <option value="resuelto">Resuelto</option>
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
