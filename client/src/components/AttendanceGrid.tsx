import type { AttendanceStatus, SectionStudent } from '../types';

const options: { value: AttendanceStatus; label: string }[] = [
  { value: 'presente', label: 'Presente' },
  { value: 'ausente', label: 'Ausente' },
  { value: 'atrasado', label: 'Atrasado' },
  { value: 'justificado', label: 'Justificado' }
];

export function AttendanceGrid({ students, values, onChange }: { students: SectionStudent[]; values: Record<string, AttendanceStatus>; onChange: (studentId: string, status: AttendanceStatus) => void }) {
  return (
    <div className="attendance-grid">
      {students.map((student) => (
        <div className="attendance-row" key={student.id}>
          <strong>{student.name}</strong>
          <div className="segmented">
            {options.map((option) => (
              <button className={values[student.id] === option.value ? 'active' : ''} key={option.value} onClick={() => onChange(student.id, option.value)} type="button">
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
