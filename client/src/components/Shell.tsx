import { BarChart3, Bell, CalendarDays, Check, CheckCheck, ChevronDown, ClipboardCheck, FileText, GraduationCap, HelpCircle, LogOut, Menu, School, Search, Shield, Star, UserCircle, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useNotifications } from '../hooks';
import type { User } from '../types';
import { RoleBadge } from './RoleBadge';

const navItems = [
  { to: '/', label: 'Panel', icon: BarChart3, roles: ['admin', 'director', 'teacher', 'student', 'guardian', 'inspector'] },
  { to: '/academico', label: 'Academico', icon: GraduationCap, roles: ['admin', 'director', 'teacher', 'student', 'guardian', 'inspector'] },
  { to: '/horario', label: 'Horario', icon: CalendarDays, roles: ['admin', 'director', 'teacher', 'student', 'guardian', 'inspector'] },
  { to: '/asistencia', label: 'Asistencia', icon: ClipboardCheck, roles: ['admin', 'director', 'teacher', 'student', 'guardian', 'inspector'] },
  { to: '/comunicaciones', label: 'Comunicados', icon: Bell, roles: ['admin', 'director', 'teacher', 'student', 'guardian', 'inspector'] },
  { to: '/solicitudes', label: 'Solicitudes', icon: HelpCircle, roles: ['admin', 'director', 'teacher', 'student', 'guardian', 'inspector'] },
  { to: '/admin', label: 'Administracion', icon: Shield, roles: ['admin', 'director', 'inspector'] }
];

export function Shell({ user, onLogout, children }: { user: User; onLogout: () => void; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { notifications, unreadCount, busy: notificationsBusy, lastRealtimeNotification, refresh, markRead, markAllRead } = useNotifications();
  const [notificationToast, setNotificationToast] = useState('');
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (!notificationRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    if (profileOpen || notificationsOpen) document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [profileOpen, notificationsOpen]);

  useEffect(() => {
    if (!lastRealtimeNotification) return undefined;
    setNotificationToast(lastRealtimeNotification.title);
    const timer = window.setTimeout(() => setNotificationToast(''), 3600);
    return () => window.clearTimeout(timer);
  }, [lastRealtimeNotification]);

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

        <button className="icon-button mobile-only shell-mobile-menu-button" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Cerrar menu' : 'Abrir menu'} aria-expanded={open}>
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
          <div className="notification-center" ref={notificationRef}>
            <button
              type="button"
              className="notification-button"
              onClick={() => {
                setNotificationsOpen((value) => !value);
                setProfileOpen(false);
                refresh().catch(() => undefined);
              }}
              aria-label="Abrir notificaciones"
              aria-expanded={notificationsOpen}
            >
              <Bell size={19} />
              {unreadCount > 0 && <span>{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>
            {notificationsOpen && (
              <div className="notification-dropdown">
                <header>
                  <div>
                    <strong>Notificaciones</strong>
                    <small>{unreadCount ? `${unreadCount} sin leer` : 'Todo al día'}</small>
                  </div>
                  <button type="button" onClick={markAllRead} disabled={!unreadCount || notificationsBusy}><CheckCheck size={16} />Marcar todas</button>
                </header>
                <div className="notification-list">
                  {notifications.slice(0, 10).map((item) => (
                    <article key={item.id} className={clsx('notification-item', !item.readAt && 'unread')}>
                      <div>
                        <span>{notificationTypeLabel(item.type)}</span>
                        <strong>{item.title}</strong>
                        <p>{item.message}</p>
                        <small>{new Date(item.createdAt).toLocaleString('es-CL')}</small>
                      </div>
                      {!item.readAt && <button type="button" onClick={() => markRead(item.id)} disabled={notificationsBusy} aria-label="Marcar como leída"><Check size={16} /></button>}
                    </article>
                  ))}
                  {!notifications.length && (
                    <div className="notification-empty">
                      <Bell size={22} />
                      <strong>Sin notificaciones</strong>
                      <span>No hay novedades pendientes por revisar.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div ref={profileMenuRef}>
          <button
            className="profile-menu-button"
            onClick={() => {
              setProfileOpen((value) => !value);
              setNotificationsOpen(false);
            }}
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
              <NavLink to="/horario" role="menuitem" onClick={() => setProfileOpen(false)}><CalendarDays size={18} /> Calendario</NavLink>
              <NavLink to="/documentos" role="menuitem" onClick={() => setProfileOpen(false)}><FileText size={18} /> Documentos</NavLink>
              <NavLink to="/preferencias" role="menuitem" onClick={() => setProfileOpen(false)}>
                <Shield size={18} />
                Preferencias
              </NavLink>
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
        </div>
      </header>
      {notificationToast && <div className="admin-notice success" onClick={() => setNotificationToast('')}>Nueva notificación: {notificationToast}</div>}

      <div className="main-area">
        <main className="content">{children}</main>
      </div>
      <style>{`
        @media (max-width: 820px) {
          .institution-header {
            grid-template-columns: minmax(0, 1fr) auto auto;
            padding: 10px 12px;
            position: relative;
            z-index: 1001;
          }

          .shell-mobile-menu-button {
            display: inline-flex !important;
            grid-column: 2;
            grid-row: 1;
            order: 2;
          }

          .institution-header .institution-user {
            grid-column: 3;
            grid-row: 1;
            order: 3;
          }

          .institution-header .institution-search {
            display: none !important;
          }

          .institution-header .nav-list {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1000;
            display: none;
            grid-template-columns: 1fr;
            align-items: stretch;
            justify-content: start;
            width: 100vw;
            height: 100vh;
            max-height: 100vh;
            overflow-y: auto;
            padding: 70px 16px 24px;
            background: #0f172a;
          }

          .institution-header .nav-list.nav-list-open {
            display: grid;
          }

          .institution-header .nav-list a {
            justify-content: flex-start;
            min-height: 44px;
            padding: 0 8px;
            font-size: 1rem;
          }

          .institution-header .nav-list a span {
            display: inline;
          }
        }
      `}</style>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function notificationTypeLabel(type: string) {
  if (type === 'announcement') return 'Comunicado';
  if (type === 'request') return 'Solicitud';
  if (type === 'grade') return 'Calificación';
  if (type === 'attendance') return 'Asistencia';
  return 'Sistema';
}
