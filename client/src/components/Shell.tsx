import { BarChart3, Bell, CalendarDays, ChevronDown, ClipboardCheck, FileText, GraduationCap, HelpCircle, LogOut, Menu, School, Search, Shield, Star, UserCircle, X } from 'lucide-react';
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
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className={clsx('app-shell', open && 'mobile-nav-open')}>
      <header className="institution-header">
        <div className="brand">
          <div className="brand-mark">
            <School size={24} />
          </div>
          <div>
            <strong>Sistema de Intranet Colegio</strong>
            <span>Gestion interna</span>
          </div>
        </div>

        <button className="icon-button mobile-only" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Cerrar menu' : 'Abrir menu'}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={clsx('nav-list', open && 'nav-list-open')} aria-label="Navegacion principal">
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

        <div className="institution-search">
          <Search size={18} />
          <input placeholder="Buscar estudiantes, documentos o comunicados" />
        </div>

        <div className="institution-user">
          <button
            className="profile-menu-button"
            onClick={() => setProfileOpen((value) => !value)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            aria-label="Abrir menu de perfil"
          >
            <span>{user.avatar}</span>
            <ChevronDown size={16} />
          </button>
          {profileOpen && (
            <div className="profile-menu" role="menu">
              <div className="profile-menu-header">
                <span>{user.avatar}</span>
                <div>
                  <strong>{user.name}</strong>
                  <small>{user.department}</small>
                </div>
              </div>
              <RoleBadge role={user.primaryRole} />
              <div className="profile-menu-divider" />
              <NavLink to="/perfil" role="menuitem" onClick={() => setProfileOpen(false)}>
                <UserCircle size={18} />
                Perfil
              </NavLink>
              <NavLink to="/calificaciones" role="menuitem" onClick={() => setProfileOpen(false)}><Star size={18} /> Calificaciones</NavLink>
              <NavLink to="/calendario" role="menuitem" onClick={() => setProfileOpen(false)}><CalendarDays size={18} /> Calendario</NavLink>
              <NavLink to="/documentos" role="menuitem" onClick={() => setProfileOpen(false)}><FileText size={18} /> Documentos</NavLink>
              <button type="button" role="menuitem" onClick={() => setProfileOpen(false)}>
                <Shield size={18} />
                Preferencias
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileOpen(false);
                  onLogout();
                }}
              >
                <LogOut size={18} />
                Cerrar sesion
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="main-area">
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
