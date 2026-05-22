import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import type { AuthSession } from './types';
import { logout, sessionStorageKey } from './api';
import { LoginPage } from './pages/LoginPage';
import { LandingPage } from './pages/LandingPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { Shell } from './components/Shell';
import { DashboardPage } from './pages/DashboardPage';
import { AcademicsPage } from './pages/AcademicsPage';
import { MySubjectsPage } from './pages/MySubjectsPage';
import { CommunicationsPage } from './pages/CommunicationsPage';
import { CalendarPage } from './pages/CalendarPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { RequestsPage } from './pages/RequestsPage';
import { AttendancePage } from './pages/AttendancePage';
import { GradesPage } from './pages/GradesPage';
import { SubjectDetailPage } from './pages/SubjectDetailPage';
import { AdminPage } from './pages/AdminPage';
import { ProfilePage } from './pages/ProfilePage';
import { PreferencesPage } from './pages/PreferencesPage';
import { NotFoundPage } from './pages/NotFoundPage';

function RoleGuard({
  user,
  roles,
  children,
}: {
  user: { roles: string[] };
  roles: string[];
  children: React.ReactElement;
}) {
  const allowed = user.roles.some((r) => roles.includes(r));
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return children;
}

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const raw = localStorage.getItem(sessionStorageKey);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  });

  const auth = useMemo(() => ({ user: session?.user ?? null, isLoggedIn: Boolean(session?.user) }), [session]);

  function handleLogin(nextSession: AuthSession) {
    localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
    setSession(nextSession);
  }

  useEffect(() => {
    function expireSession() {
      localStorage.removeItem(sessionStorageKey);
      setSession(null);
    }
    window.addEventListener('school-session-expired', expireSession);
    return () => window.removeEventListener('school-session-expired', expireSession);
  }, []);

  async function handleLogout() {
    if (session?.refreshToken) {
      await logout(session.refreshToken).catch(() => undefined);
    }
    localStorage.removeItem(sessionStorageKey);
    setSession(null);
  }

  if (!auth.isLoggedIn) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Shell user={auth.user!} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/academico" element={<MySubjectsPage />} />
        <Route
          path="/gestion-academica"
          element={
            <RoleGuard user={auth.user!} roles={['admin', 'director', 'teacher']}>
              <AcademicsPage user={auth.user!} />
            </RoleGuard>
          }
        />
        <Route path="/horario" element={<CalendarPage user={auth.user!} />} />
        <Route
          path="/asistencia"
          element={
            <RoleGuard user={auth.user!} roles={['admin', 'director', 'teacher', 'inspector', 'student', 'guardian']}>
              <AttendancePage user={auth.user!} />
            </RoleGuard>
          }
        />
        <Route
          path="/calificaciones"
          element={
            <RoleGuard user={auth.user!} roles={['admin', 'director', 'teacher', 'inspector']}>
              <GradesPage user={auth.user!} />
            </RoleGuard>
          }
        />
        <Route path="/subjects/:id" element={<SubjectDetailPage user={auth.user!} />} />
        <Route path="/comunicaciones" element={<CommunicationsPage user={auth.user!} />} />
        <Route path="/calendario" element={<CalendarPage user={auth.user!} />} />
        <Route path="/documentos" element={<DocumentsPage user={auth.user!} />} />
        <Route path="/solicitudes" element={<RequestsPage user={auth.user!} />} />
        <Route
          path="/admin"
          element={
            <RoleGuard user={auth.user!} roles={['admin', 'director', 'inspector']}>
              <AdminPage user={auth.user!} />
            </RoleGuard>
          }
        />
        <Route path="/perfil" element={<ProfilePage onLogout={handleLogout} />} />
        <Route path="/preferencias" element={<PreferencesPage user={auth.user!} />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Shell>
  );
}
