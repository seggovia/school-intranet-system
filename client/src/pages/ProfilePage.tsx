import { BookOpen, CalendarDays, GraduationCap, Mail, MapPin, Shield, UserRound, Users } from 'lucide-react';
import { loadMyProfile } from '../api';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useAsyncData } from '../hooks';

const emptyProfile = {
  id: '',
  name: '',
  email: '',
  avatar: '',
  department: '',
  roles: [],
  timezone: '',
  lastAccess: '',
  courses: [],
  subjects: [],
  linkedStudents: []
};

export function ProfilePage() {
  const { data: profile, loading, error } = useAsyncData(loadMyProfile, emptyProfile);

  if (loading) return <LoadingState label="Cargando perfil..." />;
  if (error) return <ErrorState />;
  if (!profile.id) return <EmptyState title="Perfil no disponible" />;

  return (
    <div className="page-stack">
      <section className="profile-hero">
        <div className="profile-avatar-large">{profile.avatar || profile.name.slice(0, 2).toUpperCase()}</div>
        <div>
          <span className="eyebrow">Perfil institucional</span>
          <h1>{profile.name}</h1>
          <p>{profile.department || 'Comunidad academica'}</p>
        </div>
      </section>

      <section className="profile-card-grid">
        <article className="profile-info-card"><Mail size={20} /><span>Correo</span><strong>{profile.email}</strong></article>
        <article className="profile-info-card"><Shield size={20} /><span>Rol</span><strong>{profile.roles.join(', ')}</strong></article>
        <article className="profile-info-card"><MapPin size={20} /><span>Zona horaria</span><strong>{profile.timezone}</strong></article>
        <article className="profile-info-card"><CalendarDays size={20} /><span>Ultimo acceso</span><strong>{new Date(profile.lastAccess).toLocaleString('es-CL')}</strong></article>
      </section>

      <section className="section-card profile-section">
        <header><h2>Cursos asociados</h2></header>
        <div className="profile-list">
          {profile.courses.map((course) => (
            <span key={course.id}><Users size={18} /> <b>{course.name}</b> {course.classroom} · {course.students} estudiantes</span>
          ))}
          {!profile.courses.length && <span>Sin cursos asociados.</span>}
        </div>
      </section>

      <section className="section-card profile-section">
        <header><h2>Asignaturas asociadas</h2></header>
        <div className="profile-list">
          {profile.subjects.map((subject) => (
            <span key={`${subject.id}-${subject.section}`}><BookOpen size={18} /> <b>{subject.name}</b> {subject.code} · {subject.section}</span>
          ))}
          {!profile.subjects.length && <span>Sin asignaturas asociadas.</span>}
        </div>
      </section>

      {profile.linkedStudents.length > 0 && (
        <section className="section-card profile-section">
          <header><h2>Estudiantes vinculados</h2></header>
          <div className="profile-list">
            {profile.linkedStudents.map((student) => (
              <span key={student.id}><GraduationCap size={18} /> <b>{student.name}</b> {student.relationship}</span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
