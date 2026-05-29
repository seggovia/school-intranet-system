import { BookOpen, Clock, GraduationCap, MapPin, User, Users, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { getSubjectColor, getSubjectStatus } from '../utils/scheduleColors';
import type { ScheduleCalendarEvent } from '../types';

type Props = {
  event: ScheduleCalendarEvent & {
    subjectName?: string;
    teacherName?: string;
    roomName?: string;
    sectionName?: string;
    courseName?: string;
    startTime?: string;
    endTime?: string;
  };
  onClose: () => void;
};

function timeFromDate(value: string) {
  return new Date(value).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function getTimes(event: Props['event']) {
  return {
    startTime: event.startTime ?? event.startsAt ?? timeFromDate(event.start),
    endTime: event.endTime ?? event.endsAt ?? timeFromDate(event.end),
  };
}

const statusLabels = {
  active: '🟢 EN CURSO',
  upcoming: '⏳ PRÓXIMA',
  finished: '✅ FINALIZADA',
  future: '🕒 FUTURA',
};

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
      <span style={{ color: '#64748b', display: 'inline-flex' }}>{icon}</span>
      <div>
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 14, color: '#111827', fontWeight: 600 }}>{value || 'Sin información'}</div>
      </div>
    </div>
  );
}

function ActionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        display: 'block',
        padding: '10px 12px',
        borderRadius: 8,
        background: '#f8fafc',
        color: '#0f172a',
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: 700,
        border: '1px solid #e2e8f0',
      }}
    >
      {children}
    </Link>
  );
}

export function ScheduleEventDetail({ event, onClose }: Props) {
  const { startTime, endTime } = getTimes(event);
  const subjectName = event.subjectName ?? event.subject;
  const teacherName = event.teacherName ?? event.teacher;
  const roomName = event.roomName ?? event.room;
  const sectionName = event.sectionName ?? event.section;
  const courseName = event.courseName ?? event.course;
  const color = getSubjectColor(subjectName);
  const status = getSubjectStatus(startTime, endTime);

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.35)', zIndex: 499 }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de ${subjectName}`}
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100vh',
          width: 320,
          zIndex: 500,
          background: '#ffffff',
          boxShadow: '-20px 0 40px rgba(15, 23, 42, 0.22)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <header style={{ position: 'relative', background: color.bg, color: color.text, padding: '28px 20px 22px' }}>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 32,
              height: 32,
              border: 0,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.16)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
          <BookOpen size={30} />
          <h2 style={{ margin: '14px 0 10px', fontSize: 24, lineHeight: 1.15 }}>{subjectName}</h2>
          <span style={{ display: 'inline-flex', borderRadius: 999, padding: '5px 9px', background: 'rgba(255,255,255,0.18)', fontSize: 12, fontWeight: 800 }}>
            {statusLabels[status]}
          </span>
        </header>

        <div style={{ padding: 20, flex: 1 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#111827' }}>Información</h3>
          <InfoRow icon={<Clock size={18} />} label="Horario" value={`${startTime} - ${endTime}`} />
          <InfoRow icon={<MapPin size={18} />} label="Sala" value={roomName} />
          <InfoRow icon={<User size={18} />} label="Profesor" value={teacherName} />
          <InfoRow icon={<Users size={18} />} label="Sección" value={sectionName} />
          <InfoRow icon={<GraduationCap size={18} />} label="Curso" value={courseName} />

          <h3 style={{ margin: '22px 0 10px', fontSize: 14, color: '#111827' }}>Acciones</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            <ActionLink to="/asistencia">Ver asistencia</ActionLink>
            <ActionLink to="/academico">Ver materiales</ActionLink>
            <ActionLink to="/calificaciones">Ver calificaciones</ActionLink>
            <ActionLink to="/dashboard">Ir al panel</ActionLink>
          </div>
        </div>
      </aside>
    </>
  );
}
