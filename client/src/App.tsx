import { Navigate, Route, Routes } from 'react-router-dom';
import { useMemo, useState } from 'react';
import type { AuthSession } from './types';
import { logout, sessionStorageKey } from './api';
import { LoginPage } from './pages/LoginPage';
import { Shell } from './components/Shell';
import { DashboardPage } from './pages/DashboardPage';
import { AcademicsPage } from './pages/AcademicsPage';
import { CommunicationsPage } from './pages/CommunicationsPage';
import { CalendarPage } from './pages/CalendarPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { RequestsPage } from './pages/RequestsPage';
import { AttendancePage } from './pages/AttendancePage';
import { GradesPage } from './pages/GradesPage';
import { SubjectDetailPage } from './pages/SubjectDetailPage';
import { AdminPage } from './pages/AdminPage';

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
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Shell user={auth.user!} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/academico" element={<AcademicsPage user={auth.user!} />} />
        <Route path="/asistencia" element={<AttendancePage user={auth.user!} />} />
        <Route path="/calificaciones" element={<GradesPage user={auth.user!} />} />
        <Route path="/subjects/:id" element={<SubjectDetailPage user={auth.user!} />} />
        <Route path="/comunicaciones" element={<CommunicationsPage user={auth.user!} />} />
        <Route path="/calendario" element={<CalendarPage />} />
        <Route path="/documentos" element={<DocumentsPage user={auth.user!} />} />
        <Route path="/solicitudes" element={<RequestsPage user={auth.user!} />} />
        <Route path="/admin" element={<AdminPage user={auth.user!} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
