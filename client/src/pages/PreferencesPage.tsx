import { useEffect, useState } from 'react';
import { Bell, CheckCircle2, Languages, Monitor, Moon, Shield, Sun } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import type { User } from '../types';

type PreferenceState = {
  theme: 'system' | 'light' | 'dark';
  emailNotifications: boolean;
  academicNotifications: boolean;
  ticketNotifications: boolean;
  language: 'es-CL';
};

const defaultPreferences: PreferenceState = {
  theme: 'system',
  emailNotifications: true,
  academicNotifications: true,
  ticketNotifications: true,
  language: 'es-CL'
};

function preferenceKey(userId: string) {
  return `school-user-preferences:${userId}`;
}

export function PreferencesPage({ user }: { user: User }) {
  const [preferences, setPreferences] = useState<PreferenceState>(() => {
    const raw = localStorage.getItem(preferenceKey(user.id));
    return raw ? { ...defaultPreferences, ...(JSON.parse(raw) as Partial<PreferenceState>) } : defaultPreferences;
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    localStorage.setItem(preferenceKey(user.id), JSON.stringify(preferences));
    setSaved(true);
    const timer = window.setTimeout(() => setSaved(false), 1600);
    return () => window.clearTimeout(timer);
  }, [preferences, user.id]);

  return (
    <div className="page-stack preferences-page">
      <PageHeader eyebrow="Cuenta" title="Preferencias" description="Configura opciones personales disponibles para tu sesión. Algunas opciones quedan preparadas para futura integración." />

      {saved && <div className="admin-notice success"><CheckCircle2 size={16} />Preferencias guardadas localmente.</div>}

      <section className="preferences-grid">
        <article className="panel preference-card">
          <header><div><span className="eyebrow">Tema visual</span><h2>Apariencia</h2></div><Monitor size={20} /></header>
          <div className="preference-options">
            <button className={preferences.theme === 'system' ? 'active' : ''} onClick={() => setPreferences((current) => ({ ...current, theme: 'system' }))}><Monitor size={17} />Sistema</button>
            <button className={preferences.theme === 'light' ? 'active' : ''} onClick={() => setPreferences((current) => ({ ...current, theme: 'light' }))}><Sun size={17} />Claro</button>
            <button className={preferences.theme === 'dark' ? 'active' : ''} onClick={() => setPreferences((current) => ({ ...current, theme: 'dark' }))}><Moon size={17} />Oscuro</button>
          </div>
          <p>La selección queda almacenada para esta cuenta en este navegador. El tema global se integrará cuando exista soporte visual completo.</p>
        </article>

        <article className="panel preference-card">
          <header><div><span className="eyebrow">Notificaciones</span><h2>Avisos básicos</h2></div><Bell size={20} /></header>
          <label><input type="checkbox" checked={preferences.emailNotifications} onChange={(event) => setPreferences((current) => ({ ...current, emailNotifications: event.target.checked }))} /> Recibir avisos por correo cuando esté disponible</label>
          <label><input type="checkbox" checked={preferences.academicNotifications} onChange={(event) => setPreferences((current) => ({ ...current, academicNotifications: event.target.checked }))} /> Notificar cambios académicos importantes</label>
          <label><input type="checkbox" checked={preferences.ticketNotifications} onChange={(event) => setPreferences((current) => ({ ...current, ticketNotifications: event.target.checked }))} /> Notificar avances de solicitudes</label>
        </article>

        <article className="panel preference-card">
          <header><div><span className="eyebrow">Idioma</span><h2>Localización</h2></div><Languages size={20} /></header>
          <label>Idioma de interfaz
            <select value={preferences.language} onChange={() => setPreferences((current) => ({ ...current, language: 'es-CL' }))}>
              <option value="es-CL">Español (Chile)</option>
            </select>
          </label>
          <p>Selector preparado para futura internacionalización. Actualmente la interfaz funciona en español.</p>
        </article>

        <article className="panel preference-card">
          <header><div><span className="eyebrow">Seguridad</span><h2>Sesión</h2></div><Shield size={20} /></header>
          <div className="preference-account">
            <span><strong>Usuario</strong>{user.name}</span>
            <span><strong>Correo</strong>{user.email}</span>
            <span><strong>Rol activo</strong>{user.primaryRole}</span>
          </div>
        </article>
      </section>
    </div>
  );
}
