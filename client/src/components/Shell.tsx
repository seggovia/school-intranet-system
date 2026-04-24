import { BarChart3, Bell, BookOpen, CalendarDays, ClipboardCheck, FileText, GraduationCap, HelpCircle, LogOut, Menu, School, Search, Shield, Star } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import type { User } from '../types';
import { RoleBadge } from './RoleBadge';

const navItems = [
  { to: '/', label: 'Panel', icon: BarChart3, roles: ['admin', 'director', 'teacher', 'student', 'guardian', 'inspector'] },
  { to: '/academico', label: 'Academico', icon: GraduationCap, roles: ['admin', 'director', 'teacher', 'student', 'guardian', 'inspector'] },
  { to: '/asistencia', label: 'Asistencia', icon: ClipboardCheck, roles: ['admin', 'director', 'teacher', 'student', 'guardian', 'inspector'] },
  { to: '/calificaciones', label: 'Calificaciones', icon: Star, roles: ['admin', 'director', 'teacher', 'student', 'guardian'] },
  { to: '/comunicaciones', label: 'Comunicados', icon: Bell, roles: ['admin', 'director', 'teacher', 'student', 'guardian', 'inspector'] },
  { to: '/documentos', label: 'Documentos', icon: FileText, roles: ['admin', 'director', 'teacher', 'student', 'guardian', 'inspector'] },
  { to: '/solicitudes', label: 'Solicitudes', icon: HelpCircle, roles: ['admin', 'director', 'teacher', 'student', 'guardian', 'inspector'] },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays, roles: ['admin', 'director', 'teacher', 'student', 'guardian', 'inspector'] },
  { to: '/admin', label: 'Administracion', icon: Shield, roles: ['admin', 'director', 'inspector'] }
];

export function Shell({ user, onLogout, children }: { user: User; onLogout: () => void; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={clsx('sidebar', open && 'sidebar-open')}>
        <div className="brand">
          <div className="brand-mark">
            <School size={24} />
          </div>
          <div>
            <strong>Sistema de Intranet Escolar</strong>
            <span>Gestion interna</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navegacion principal">
          {navItems.filter((item) => item.roles.includes(user.primaryRole)).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setOpen(false)}>
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <BookOpen size={20} />
          <strong>Plan lector</strong>
          <span>72% de avance institucional</span>
          <div className="progress">
            <span style={{ width: '72%' }} />
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setOpen((value) => !value)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <div className="search-box">
            <Search size={18} />
            <input placeholder="Buscar estudiantes, documentos o comunicados" />
          </div>
          <div className="profile-chip">
            <span>{user.avatar}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.department}</small>
            </div>
          </div>
          <RoleBadge role={user.primaryRole} />
          <button className="icon-button" onClick={onLogout} aria-label="Cerrar sesion">
            <LogOut size={19} />
          </button>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
