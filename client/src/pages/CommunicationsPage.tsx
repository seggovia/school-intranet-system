import { Megaphone } from 'lucide-react';
import { loadAnnouncements } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { useAsyncData } from '../hooks';
import type { Announcement, User } from '../types';

export function CommunicationsPage({ user }: { user: User }) {
  const { data } = useAsyncData(loadAnnouncements, [] as Announcement[]);
  const canPublish = user.permissions.includes('communications:manage');

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Comunidad escolar</span>
          <h1>Comunicaciones</h1>
          <p>Publicaciones institucionales segmentadas para docentes, familias y estudiantes.</p>
        </div>
        {canPublish && <button className="primary-button">Nuevo comunicado</button>}
      </section>

      <section className="announcement-grid">
        {data.map((announcement) => (
          <article className="announcement-card" key={announcement.id}>
            <div className="announcement-top">
              <Megaphone size={20} />
              <StatusBadge value={announcement.priority} />
            </div>
            <h2>{announcement.title}</h2>
            <p>{announcement.body}</p>
            <footer>
              <span>{announcement.audience}</span>
              <span>{announcement.date}</span>
            </footer>
          </article>
        ))}
      </section>
    </div>
  );
}
