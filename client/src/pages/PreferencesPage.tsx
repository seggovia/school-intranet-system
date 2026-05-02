import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCircle2, Languages, Monitor, Moon, Shield, Sun } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { getStoredLanguage, languageStorageKey, resolveSupportedLanguage, type SupportedLanguage } from '../i18n';
import { useTheme, type ThemePreference } from '../theme';
import type { User } from '../types';

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

function preferenceKey(userId: string) {
  return `school-user-preferences:${userId}`;
}

export function PreferencesPage({ user }: { user: User }) {
  const { i18n, t } = useTranslation();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [preferences, setPreferences] = useState<PreferenceState>(() => {
    const raw = localStorage.getItem(preferenceKey(user.id));
    return raw
      ? { ...defaultPreferences, ...(JSON.parse(raw) as Partial<PreferenceState>), theme, language: getStoredLanguage() }
      : { ...defaultPreferences, theme, language: getStoredLanguage() };
  });
  const [saved, setSaved] = useState(false);

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

  function handleThemeChange(nextTheme: ThemePreference) {
    setTheme(nextTheme);
    setPreferences((current) => ({ ...current, theme: nextTheme }));
  }

  function handleLanguageChange(nextLanguage: SupportedLanguage) {
    localStorage.setItem(languageStorageKey, nextLanguage);
    void i18n.changeLanguage(nextLanguage);
    setPreferences((current) => ({ ...current, language: nextLanguage }));
  }

  return (
    <div className="page-stack preferences-page">
      <PageHeader eyebrow={t('preferences.header.eyebrow')} title={t('preferences.header.title')} description={t('preferences.header.description')} />

      {saved && <div className="admin-notice success"><CheckCircle2 size={16} />{t('preferences.saved')}</div>}

      <section className="preferences-grid">
        <article className="panel preference-card">
          <header><div><span className="eyebrow">{t('preferences.theme.eyebrow')}</span><h2>{t('preferences.theme.title')}</h2></div><Monitor size={20} /></header>
          <div className="preference-options">
            <button className={theme === 'system' ? 'active' : ''} onClick={() => handleThemeChange('system')}><Monitor size={17} />{t('preferences.theme.system')}</button>
            <button className={theme === 'light' ? 'active' : ''} onClick={() => handleThemeChange('light')}><Sun size={17} />{t('preferences.theme.light')}</button>
            <button className={theme === 'dark' ? 'active' : ''} onClick={() => handleThemeChange('dark')}><Moon size={17} />{t('preferences.theme.dark')}</button>
          </div>
          <p>{t('preferences.theme.description', { mode: t(resolvedTheme === 'dark' ? 'preferences.theme.resolvedDark' : 'preferences.theme.resolvedLight') })}</p>
        </article>

        <article className="panel preference-card">
          <header><div><span className="eyebrow">{t('preferences.notifications.eyebrow')}</span><h2>{t('preferences.notifications.title')}</h2></div><Bell size={20} /></header>
          <label><input type="checkbox" checked={preferences.emailNotifications} onChange={(event) => setPreferences((current) => ({ ...current, emailNotifications: event.target.checked }))} /> {t('preferences.notifications.email')}</label>
          <label><input type="checkbox" checked={preferences.academicNotifications} onChange={(event) => setPreferences((current) => ({ ...current, academicNotifications: event.target.checked }))} /> {t('preferences.notifications.academic')}</label>
          <label><input type="checkbox" checked={preferences.ticketNotifications} onChange={(event) => setPreferences((current) => ({ ...current, ticketNotifications: event.target.checked }))} /> {t('preferences.notifications.tickets')}</label>
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
