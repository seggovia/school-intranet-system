import { DoorOpen, Users } from 'lucide-react';

export function SectionCard({ name, teacher, classroom, students, subjects }: { name: string; teacher: string; classroom: string; students: number; subjects?: string[] }) {
  return (
    <article className="section-card">
      <div>
        <h2>{name}</h2>
        <span>{teacher}</span>
      </div>
      <p><DoorOpen size={16} /> {classroom}</p>
      <p><Users size={16} /> {students} estudiantes</p>
      {subjects?.length ? <div className="chip-list">{subjects.slice(0, 4).map((subject) => <span key={subject}>{subject}</span>)}</div> : null}
    </article>
  );
}
