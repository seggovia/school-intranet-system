import type { SectionStudent } from '../types';

export function StudentList({ students, selectedId, onSelect }: { students: SectionStudent[]; selectedId?: string; onSelect?: (student: SectionStudent) => void }) {
  return (
    <div className="student-list">
      {students.map((student) => (
        <button className={student.id === selectedId ? 'selected' : ''} key={student.id} onClick={() => onSelect?.(student)}>
          <strong>{student.name}</strong>
          <span>{student.course ?? student.enrollmentId}</span>
        </button>
      ))}
    </div>
  );
}
