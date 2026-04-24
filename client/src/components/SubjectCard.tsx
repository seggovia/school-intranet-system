import { BookOpen, CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MySubject } from '../types';

export function SubjectCard({ subject }: { subject: MySubject }) {
  return (
    <article className="subject-card">
      <div className="subject-icon"><BookOpen size={20} /></div>
      <h2>{subject.name}</h2>
      <span>{subject.section}</span>
      <p><CalendarClock size={15} /> {subject.schedules.length} bloques programados</p>
      <Link className="text-link" to={`/subjects/${subject.id}`}>Abrir asignatura</Link>
    </article>
  );
}
