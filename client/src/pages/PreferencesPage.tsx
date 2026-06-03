import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Accessibility, Bell, CheckCircle2, Languages, Monitor, Moon, Shield, Sun } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { updateMyPreferences } from '../api';
import { normalizeApiError } from '../api-error';
import { getStoredLanguage, languageStorageKey, resolveSupportedLanguage, type SupportedLanguage } from '../i18n';
import { useTheme, type ThemePreference } from '../theme';
import type { User, UserPreferences } from '../types';

type PreferenceState = {
  theme: ThemePreference;
  emailNotifications: boolean;
  academicNotifications: boolean;
  ticketNotifications: boolean;
  language: SupportedLanguage;
};

const defaultPreferences: PreferenceState = {
  theme: 'system',
  emailNotifications: true,
  academicNotifications: true,
  ticketNotifications: true,
  language: 'es'
};

const reduceMotionStorageKey = 'reduce-motion';
const largeTextStorageKey = 'large-text';

function preferenceKey(userId: string) {
  return `school-user-preferences:${userId}`;
}

function toUserPreferences(preferences: PreferenceState): UserPreferences {
  return {
    theme: preferences.theme,
    language: preferences.language,
    notifications: {
      email: preferences.emailNotifications,
      academic: preferences.academicNotifications,
      tickets: preferences.ticketNotifications
    }
  };
}

export function PreferencesPage({ user }: { user: User }) {
  const { i18n, t } = useTranslation();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem(reduceMotionStorageKey) === 'true');
  const [largeText, setLargeText] = useState(() => localStorage.getItem(largeTextStorageKey) === 'true');
  const [preferences, setPreferences] = useState<PreferenceState>(() => {
    const raw = localStorage.getItem(preferenceKey(user.id));
    return raw
      ? { ...defaultPreferences, ...(JSON.parse(raw) as Partial<PreferenceState>), theme, language: getStoredLanguage() }
      : { ...defaultPreferences, theme, language: getStoredLanguage() };
  });
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
    localStorage.setItem(reduceMotionStorageKey, String(reduceMotion));
  }, [reduceMotion]);

  useEffect(() => {
    document.documentElement.classList.toggle('large-text', largeText);
    localStorage.setItem(largeTextStorageKey, String(largeText));
  }, [largeText]);

  useEffect(() => {
    setPreferences((current) => (current.theme === theme ? current : { ...current, theme }));
  }, [theme]);

  useEffect(() => {
    const currentLanguage = resolveSupportedLanguage(i18n.resolvedLanguage ?? i18n.language);
    localStorage.setItem(languageStorageKey, currentLanguage);
    setPreferences((current) => (current.language === currentLanguage ? current : { ...current, language: currentLanguage }));
  }, [i18n.language, i18n.resolvedLanguage]);

  useEffect(() => {
    localStorage.setItem(preferenceKey(user.id), JSON.stringify(preferences));
    setSaved(true);
    const timer = window.setTimeout(() => setSaved(false), 1600);
    return () => window.clearTimeout(timer);
  }, [preferences, user.id]);

  async function persistPreferences(nextPreferences: PreferenceState) {
    try {
      await updateMyPreferences(toUserPreferences(nextPreferences));
      setSaveError(null);
    } catch (error) {
      const normalized = normalizeApiError(error);
      setSaveError(`${normalized.title}: ${normalized.message}`);
    }
  }

  function savePreferences(nextPreferences: PreferenceState) {
    setPreferences(nextPreferences);
    localStorage.setItem(preferenceKey(user.id), JSON.stringify(nextPreferences));
    void persistPreferences(nextPreferences);
  }

  function handleThemeChange(nextTheme: ThemePreference) {
    setTheme(nextTheme);
    savePreferences({ ...preferences, theme: nextTheme });
  }

  function handleLanguageChange(nextLanguage: SupportedLanguage) {
    localStorage.setItem(languageStorageKey, nextLanguage);
    void i18n.changeLanguage(nextLanguage);
    savePreferences({ ...preferences, language: nextLanguage });
  }

  function handleAccessibilityChange(preference: 'reduceMotion' | 'largeText', enabled: boolean) {
    if (preference === 'reduceMotion') {
      setReduceMotion(enabled);
    } else {
      setLargeText(enabled);
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div className="page-stack preferences-page">
      <PageHeader eyebrow={t('preferences.header.eyebrow')} title={t('preferences.header.title')} description={t('preferences.header.description')} />

      {saved && <div className="admin-notice success"><CheckCircle2 size={16} />{t('preferences.saved')}</div>}
      {saveError && <div className="admin-notice error">{saveError}</div>}

      <section className="preferences-grid">
        <article className="panel preference-card">
          <header><div><span className="eyebrow">{t('preferences.theme.eyebrow')}</span><h2>Apariencia</h2></div><Monitor size={20} /></header>
          <label><input type="checkbox" checked={resolvedTheme === 'dark'} onChange={(event) => handleThemeChange(event.target.checked ? 'dark' : 'light')} /> Tema oscuro</label>
          <div className="preference-options">
            <button className={theme === 'system' ? 'active' : ''} onClick={() => handleThemeChange('system')}><Monitor size={17} />{t('preferences.theme.system')}</button>
            <button className={theme === 'light' ? 'active' : ''} onClick={() => handleThemeChange('light')}><Sun size={17} />{t('preferences.theme.light')}</button>
            <button className={theme === 'dark' ? 'active' : ''} onClick={() => handleThemeChange('dark')}><Moon size={17} />{t('preferences.theme.dark')}</button>
          </div>
          <p>{t('preferences.theme.description', { mode: t(resolvedTheme === 'dark' ? 'preferences.theme.resolvedDark' : 'preferences.theme.resolvedLight') })}</p>
        </article>

        <article className="panel preference-card">
          <header><div><span className="eyebrow">Lectura y movimiento</span><h2>Accesibilidad</h2></div><Accessibility size={20} /></header>
          <label><input type="checkbox" checked={reduceMotion} onChange={(event) => handleAccessibilityChange('reduceMotion', event.target.checked)} /> Reducir animaciones</label>
          <label><input type="checkbox" checked={largeText} onChange={(event) => handleAccessibilityChange('largeText', event.target.checked)} /> Texto más grande</label>
          <p>Ajusta la interfaz para una lectura más cómoda y con menos movimiento.</p>
        </article>

        <article className="panel preference-card">
          <header><div><span className="eyebrow">{t('preferences.notifications.eyebrow')}</span><h2>{t('preferences.notifications.title')}</h2></div><Bell size={20} /></header>
          <label><input type="checkbox" checked={preferences.emailNotifications} onChange={(event) => savePreferences({ ...preferences, emailNotifications: event.target.checked })} /> {t('preferences.notifications.email')}</label>
          <label><input type="checkbox" checked={preferences.academicNotifications} onChange={(event) => savePreferences({ ...preferences, academicNotifications: event.target.checked })} /> {t('preferences.notifications.academic')}</label>
          <label><input type="checkbox" checked={preferences.ticketNotifications} onChange={(event) => savePreferences({ ...preferences, ticketNotifications: event.target.checked })} /> {t('preferences.notifications.tickets')}</label>
        </article>

        <article className="panel preference-card">
          <header><div><span className="eyebrow">{t('preferences.language.eyebrow')}</span><h2>{t('preferences.language.title')}</h2></div><Languages size={20} /></header>
          <label>{t('preferences.language.label')}
            <select value={preferences.language} onChange={(event) => handleLanguageChange(event.target.value as SupportedLanguage)}>
              <option value="es">{t('preferences.language.es')}</option>
              <option value="en">{t('preferences.language.en')}</option>
            </select>
          </label>
          <p>{t('preferences.language.description')}</p>
        </article>

        <article className="panel preference-card">
          <header><div><span className="eyebrow">{t('preferences.security.eyebrow')}</span><h2>{t('preferences.security.title')}</h2></div><Shield size={20} /></header>
          <div className="preference-account">
            <span><strong>{t('preferences.security.user')}</strong>{user.name}</span>
            <span><strong>{t('preferences.security.email')}</strong>{user.email}</span>
            <span><strong>{t('preferences.security.role')}</strong>{user.primaryRole}</span>
          </div>
        </article>
      </section>
    </div>
  );
}
