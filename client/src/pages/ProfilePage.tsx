import { BookOpen, CalendarDays, CheckCircle2, GraduationCap, KeyRound, LogOut, Mail, Shield, UserRound, Users } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { api, changeMyPassword, loadMyProfile, updateMyPreferences, updateMyProfile } from '../api';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useAsyncData } from '../hooks';
import type { UserProfileData } from '../types';

type FieldErrors = Partial<Record<'name' | 'lastName' | 'currentPassword' | 'newPassword' | 'confirmPassword', string>>;
type AcademicPeriodOption = { id: string; name: string; year: number; startDate: string; endDate: string; isActive: boolean };

const emptyProfile: UserProfileData = {
  id: '',
  name: '',
  email: '',
  avatar: '',
  department: '',
  roles: [],
  roleLabels: [],
  isActive: false,
  timezone: '',
  lastAccess: '',
  createdAt: null,
  updatedAt: null,
  personal: { name: '', lastName: '' },
  courses: [],
  subjects: [],
  linkedStudents: [],
  guardians: [],
  academicSummary: { average: 0, attendance: 100, courses: 0, subjects: 0 },
  security: { userId: '', emailVerified: true, passwordManagedLocally: true, lastPasswordResetRequest: null },
  preferences: { theme: 'system', language: 'es', notifications: { email: true, academic: true, tickets: true } }
};

export function ProfilePage({ onLogout }: { onLogout: () => void }) {
  const { data: profile, loading, error, reload } = useAsyncData(loadMyProfile, emptyProfile);
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [periods, setPeriods] = useState<AcademicPeriodOption[]>([]);
  const [reportPeriod, setReportPeriod] = useState('');
  const [quickPrefs, setQuickPrefs] = useState({ email: true, academic: true, tickets: true });

  useEffect(() => {
    setName(profile.personal?.name ?? profile.name.split(' ').slice(0, -1).join(' '));
    setLastName(profile.personal?.lastName ?? profile.name.split(' ').at(-1) ?? '');
    setQuickPrefs({
      email: profile.preferences?.notifications.email ?? true,
      academic: profile.preferences?.notifications.academic ?? true,
      tickets: profile.preferences?.notifications.tickets ?? true
    });
  }, [profile]);

  useEffect(() => {
    if (!profile.roles.includes('student')) return;
    api.get<AcademicPeriodOption[]>('/periods').then((response) => {
      const activePeriods = response.data.filter((item) => item.isActive);
      setPeriods(activePeriods);
      setReportPeriod((current) => current || activePeriods[0]?.id || '');
    }).catch(() => undefined);
  }, [profile.roles]);

  if (loading) return <LoadingState label="Cargando perfil..." />;
  if (error) return <ErrorState />;
  if (!profile.id) return <EmptyState title="Perfil no disponible" />;

  function validateProfile() {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = 'El nombre es requerido.';
    if (!lastName.trim()) next.lastName = 'El apellido es requerido.';
    setErrors(next);
    return !Object.keys(next).length;
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!validateProfile()) return;
    setSavingProfile(true);
    try {
      await updateMyProfile({ name: name.trim(), lastName: lastName.trim() });
      await reload();
      setNotice('Perfil actualizado correctamente.');
    } catch {
      setErrors({ name: 'No se pudo actualizar el perfil.' });
    } finally {
      setSavingProfile(false);
    }
  }

  function validatePassword() {
    const next: FieldErrors = {};
    if (!passwords.currentPassword) next.currentPassword = 'La contraseña actual es requerida.';
    if (passwords.newPassword.length < 6) next.newPassword = 'La nueva contraseña debe tener al menos 6 caracteres.';
    if (!passwords.confirmPassword) next.confirmPassword = 'Confirma la nueva contraseña.';
    else if (passwords.newPassword !== passwords.confirmPassword) next.confirmPassword = 'Las contraseñas no coinciden.';
    setErrors(next);
    return !Object.keys(next).length;
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (!validatePassword()) return;
    setSavingPassword(true);
    try {
      await changeMyPassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setNotice('Contraseña actualizada correctamente.');
    } catch {
      setErrors({ currentPassword: 'La contraseña actual no es correcta.' });
    } finally {
      setSavingPassword(false);
    }
  }

  async function togglePref(key: keyof typeof quickPrefs) {
    const next = { ...quickPrefs, [key]: !quickPrefs[key] };
    setQuickPrefs(next);
    await updateMyPreferences({ theme: profile.preferences?.theme ?? 'system', language: profile.preferences?.language ?? 'es', notifications: next }).catch(() => undefined);
  }

  async function downloadReportCard() {
    setDownloadingReport(true);
    try {
      const response = await api.get<Blob>('/reports/student/me/report-card', {
        params: reportPeriod ? { periodId: reportPeriod } : undefined,
        responseType: 'blob'
      });
      const disposition = response.headers['content-disposition'] ?? '';
      const filename = /filename="?([^"]+)"?/i.exec(disposition)?.[1] ?? 'boletin.pdf';
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setNotice('Boletin descargado correctamente.');
    } catch {
      setNotice('No se pudo descargar el boletin.');
    } finally {
      setDownloadingReport(false);
    }
  }

  return (
    <div className="page-stack profile-page">
      {notice && <div className="admin-notice success" onClick={() => setNotice('')}><span>{notice}</span></div>}
      <section className="profile-hero professional">
        <div className="profile-avatar-large">{profile.avatar || profile.name.slice(0, 2).toUpperCase()}</div>
        <div>
          <span className="eyebrow">Perfil institucional</span>
          <h1>{profile.name}</h1>
          <p>{profile.department || 'Comunidad academica'}</p>
        </div>
        <button className="danger-button" onClick={onLogout}><LogOut size={17} />Cerrar sesión</button>
      </section>

      <section className="profile-card-grid">
        <article className="profile-info-card"><Mail size={20} /><span>Correo</span><strong>{profile.email}</strong><small>El correo requiere un flujo especial para cambiarse.</small></article>
        <article className="profile-info-card"><Shield size={20} /><span>Rol</span><strong>{(profile.roleLabels?.length ? profile.roleLabels : profile.roles).join(', ')}</strong><small>No editable desde perfil.</small></article>
        <article className="profile-info-card"><CheckCircle2 size={20} /><span>Estado</span><strong>{profile.isActive ? 'Cuenta activa' : 'Cuenta inactiva'}</strong></article>
        <article className="profile-info-card"><CalendarDays size={20} /><span>Última actividad</span><strong>{profile.lastAccess ? new Date(profile.lastAccess).toLocaleString('es-CL') : 'Sin registro'}</strong></article>
      </section>

      <section className="profile-layout">
        <form className="section-card profile-form" onSubmit={saveProfile} noValidate>
          <header><h2>Datos personales</h2><UserRound size={20} /></header>
          <label>Nombre<input value={name} onChange={(event) => setName(event.target.value)} className={errors.name ? 'input-error' : undefined} />{errors.name && <span className="field-error">{errors.name}</span>}</label>
          <label>Apellido<input value={lastName} onChange={(event) => setLastName(event.target.value)} className={errors.lastName ? 'input-error' : undefined} />{errors.lastName && <span className="field-error">{errors.lastName}</span>}</label>
          <button className="primary-button" disabled={savingProfile}>{savingProfile ? 'Guardando...' : 'Guardar cambios'}</button>
        </form>

        <form className="section-card profile-form" onSubmit={savePassword} noValidate>
          <header><h2>Cambiar contraseña</h2><KeyRound size={20} /></header>
          <label>Contraseña actual<input type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} className={errors.currentPassword ? 'input-error' : undefined} />{errors.currentPassword && <span className="field-error">{errors.currentPassword}</span>}</label>
          <label>Nueva contraseña<input type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} className={errors.newPassword ? 'input-error' : undefined} />{errors.newPassword && <span className="field-error">{errors.newPassword}</span>}</label>
          <label>Confirmar contraseña<input type="password" value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} className={errors.confirmPassword ? 'input-error' : undefined} />{errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}</label>
          <button className="primary-button" disabled={savingPassword}>{savingPassword ? 'Actualizando...' : 'Actualizar contraseña'}</button>
        </form>
      </section>

      <section className="profile-card-grid academic-summary-grid">
        <article className="profile-info-card"><GraduationCap size={20} /><span>Promedio</span><strong>{profile.academicSummary?.average ?? 0}</strong></article>
        <article className="profile-info-card"><CheckCircle2 size={20} /><span>Asistencia</span><strong>{profile.academicSummary?.attendance ?? 100}%</strong></article>
        <article className="profile-info-card"><Users size={20} /><span>Cursos/secciones</span><strong>{profile.academicSummary?.courses ?? profile.courses.length}</strong></article>
        <article className="profile-info-card"><BookOpen size={20} /><span>Asignaturas</span><strong>{profile.academicSummary?.subjects ?? profile.subjects.length}</strong></article>
      </section>

      {profile.roles.includes('student') && (
        <section className="section-card profile-section">
          <header><h2>Boletin academico</h2><GraduationCap size={20} /></header>
          {periods.length > 1 && (
            <label>Periodo
              <select value={reportPeriod} onChange={(event) => setReportPeriod(event.target.value)}>
                {periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
              </select>
            </label>
          )}
          <button type="button" className="primary-button" onClick={downloadReportCard} disabled={downloadingReport}>
            {downloadingReport ? 'Descargando...' : 'Descargar boletin'}
          </button>
        </section>
      )}

      <section className="profile-layout">
        <ProfileList title="Curso / sección" empty="Sin curso o sección asociada" rows={profile.courses.map((course) => `${course.name} · ${course.classroom} · ${course.students} estudiantes`)} />
        <ProfileList title="Asignaturas asociadas" empty="Sin asignaturas asociadas" rows={profile.subjects.map((subject) => `${subject.name} (${subject.code}) · ${subject.section}`)} />
        <ProfileList title="Apoderados vinculados" empty="Sin apoderados vinculados" rows={(profile.guardians ?? []).map((guardian) => `${guardian.name} · ${guardian.relationship}`)} />
        <ProfileList title="Estudiantes vinculados" empty="Sin estudiantes vinculados" rows={profile.linkedStudents.map((student) => `${student.name} · ${student.relationship}`)} />
      </section>

      <section className="profile-layout">
        <section className="section-card profile-section">
          <header><h2>Preferencias rápidas</h2></header>
          <div className="quick-preferences">
            <label><input type="checkbox" checked={quickPrefs.email} onChange={() => togglePref('email')} /> Notificaciones por correo</label>
            <label><input type="checkbox" checked={quickPrefs.academic} onChange={() => togglePref('academic')} /> Alertas académicas</label>
            <label><input type="checkbox" checked={quickPrefs.tickets} onChange={() => togglePref('tickets')} /> Solicitudes y tickets</label>
          </div>
        </section>
        <section className="section-card profile-section">
          <header><h2>Seguridad</h2></header>
          <div className="security-list">
            <span><b>Cuenta verificada</b>{profile.security?.emailVerified ? '✓' : 'Pendiente'}</span>
            <span><b>Contraseña establecida</b>{profile.security?.passwordManagedLocally ? '✓' : 'No disponible'}</span>
          </div>
        </section>
      </section>
      <style>{`
        @media (max-width: 768px) {
          .profile-page .profile-layout {
            grid-template-columns: 1fr;
          }

          .profile-page .academic-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .profile-page .quick-preferences label {
            flex-wrap: wrap;
            word-break: break-word;
            overflow-wrap: break-word;
          }
        }
      `}</style>
    </div>
  );
}

function ProfileList({ title, rows, empty }: { title: string; rows: string[]; empty: string }) {
  return (
    <section className="section-card profile-section">
      <header><h2>{title}</h2></header>
      <div className="profile-list">
        {rows.map((row) => <span key={row}>{row}</span>)}
        {!rows.length && <EmptyState title={empty} description="Cuando exista información asociada a tu cuenta aparecerá aquí." />}
      </div>
    </section>
  );
}
