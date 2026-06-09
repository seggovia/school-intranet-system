import type { CSSProperties } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Calendar,
  ClipboardCheck,
  Eye,
  GraduationCap,
  Heart,
  HelpCircle,
  Menu,
  School,
  Shield,
  TrendingUp,
  Users,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const colors = {
  dark: '#0f172a',
  teal: '#0f766e',
  tealDark: '#134e4a',
  tealDeep: '#042f2e',
  muted: '#64748b',
  border: '#e2e8f0',
  light: '#f8fafc'
};

const features: Array<{ icon: LucideIcon; title: string; description: string }> = [
  {
    icon: BookOpen,
    title: 'Libro de calificaciones',
    description: 'Registro de notas por evaluación con promedio ponderado, períodos académicos y alertas de rendimiento.'
  },
  {
    icon: ClipboardCheck,
    title: 'Control de asistencia',
    description: 'Registro diario por sección y asignatura con tendencia semanal y justificaciones.'
  },
  {
    icon: Bell,
    title: 'Comunicados institucionales',
    description: 'Mensajes segmentados por rol con confirmación de lectura real y prioridades.'
  },
  {
    icon: Calendar,
    title: 'Horario institucional',
    description: 'Vista por bloques con detección automática de conflictos de sala y docente.'
  },
  {
    icon: Users,
    title: 'Portal del apoderado',
    description: 'Seguimiento académico de hijos con notas, asistencia y anotaciones en tiempo real.'
  },
  {
    icon: HelpCircle,
    title: 'Tickets administrativos',
    description: 'Solicitudes con historial de estados, comentarios y notificaciones automáticas.'
  }
];

const roles: Array<{ icon: LucideIcon; title: string; description: string }> = [
  {
    icon: Shield,
    title: 'Administrador',
    description: 'Gestión total de usuarios, estructura escolar y auditoría del sistema.'
  },
  {
    icon: TrendingUp,
    title: 'Director',
    description: 'Supervisión académica, reportes y indicadores institucionales.'
  },
  {
    icon: Eye,
    title: 'Inspector',
    description: 'Control de asistencia, alertas y gestión de solicitudes.'
  },
  {
    icon: GraduationCap,
    title: 'Docente',
    description: 'Libro de calificaciones, asistencia, materiales y comunicados.'
  },
  {
    icon: BookOpen,
    title: 'Estudiante',
    description: 'Portal personal con notas, horario, materiales y comunicados.'
  },
  {
    icon: Heart,
    title: 'Apoderado',
    description: 'Seguimiento de rendimiento y asistencia de hijos vinculados.'
  }
];

const stats = ['1.172 Estudiantes', '86 Docentes', '24/7 Autoservicio', '100% Digital'];
const footerLinks = ['Panel', 'Académico', 'Horario', 'Asistencia', 'Comunicados'];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  function scrollToFeatures() {
    document.getElementById('modulos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <Link to="/" style={styles.brand}>
            <span style={styles.logoMark}><School size={25} /></span>
            <strong style={styles.brandText}>Sistema de Intranet Colegio</strong>
          </Link>
          <Link to="/login" style={styles.navButton} className="landing-nav-button-inline">Ingresar al sistema</Link>
          <button
            type="button"
            style={styles.mobileMenuButton}
            className="landing-mobile-menu-button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? 'Cerrar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          {menuOpen && (
            <nav style={styles.mobileMenu} className="landing-mobile-menu" aria-label="Navegacion movil">
              <Link to="/login" style={styles.mobileMenuLink} onClick={() => setMenuOpen(false)}>Ingresar al sistema</Link>
            </nav>
          )}
        </div>
      </header>

      {showAnnouncement && (
        <section style={styles.announcementBar}>
          <div style={styles.announcementInner}>
            <span style={styles.announcementText}>
              🎓 Sistema de demostración — Credenciales: demo1234 para todos los roles
            </span>
            <button
              type="button"
              style={styles.announcementClose}
              onClick={() => setShowAnnouncement(false)}
              aria-label="Cerrar anuncio"
            >
              <X size={18} />
            </button>
          </div>
        </section>
      )}

      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>Gestión escolar moderna, todo en un solo lugar</h1>
            <p style={styles.heroSubtitle}>
              Plataforma institucional para docentes, estudiantes, apoderados y administración. Notas, asistencia,
              comunicados y más.
            </p>
            <div style={styles.heroActions}>
              <Link to="/login" style={styles.primaryHeroButton}>Ingresar al sistema</Link>
              <button type="button" onClick={scrollToFeatures} style={styles.secondaryHeroButton}>Ver módulos</button>
            </div>
            <div style={styles.statsRow} className="landing-hero-stats">
              {stats.map((item) => (
                <span key={item} style={styles.statItem}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="modulos" style={styles.section}>
        <div style={styles.sectionInner}>
          <div style={styles.sectionHeading}>
            <h2 style={styles.sectionTitle}>Todo lo que necesita su institución</h2>
            <p style={styles.sectionSubtitle}>Módulos integrados para la operación académica completa</p>
          </div>
          <div style={styles.featureGrid} className="landing-feature-grid">
            {features.map((feature) => (
              <article key={feature.title} style={styles.featureCard}>
                <span style={styles.cardIcon}><feature.icon size={24} /></span>
                <h3 style={styles.cardTitle}>{feature.title}</h3>
                <p style={styles.cardText}>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={{ ...styles.section, background: colors.light }}>
        <div style={styles.sectionInner}>
          <div style={styles.sectionHeading}>
            <h2 style={styles.sectionTitle}>Una plataforma, múltiples roles</h2>
            <p style={styles.sectionSubtitle}>Cada usuario accede solo a lo que necesita</p>
          </div>
          <div style={styles.roleGrid}>
            {roles.map((role) => (
              <article key={role.title} style={styles.roleCard}>
                <span style={styles.roleIcon}><role.icon size={22} /></span>
                <div>
                  <h3 style={styles.roleTitle}>{role.title}</h3>
                  <p style={styles.roleText}>{role.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={styles.cta}>
        <div style={styles.ctaInner}>
          <h2 style={styles.ctaTitle}>¿Listo para comenzar?</h2>
          <p style={styles.ctaSubtitle}>Accede con tus credenciales institucionales. Credenciales demo disponibles.</p>
          <Link to="/login" style={styles.ctaButton}>Ingresar al sistema</Link>
          <small style={styles.ctaSmall}>¿Problemas de acceso? Contacta a tu administrador institucional.</small>
        </div>
      </section>

      <footer style={styles.footer}>
        <div style={styles.footerTop}>
          <div style={styles.footerColumn}>
            <div style={styles.footerBrand}>
              <span style={styles.footerLogo}><School size={23} /></span>
              <div>
                <strong>Sistema de Intranet Colegio</strong>
              </div>
            </div>
            <p style={styles.footerText}>
              Sistema de gestión académica para instituciones educativas. Plataforma diseñada para apoyar la administración,
              docentes, estudiantes y apoderados en una experiencia moderna y centralizada.
            </p>
          </div>

          <div style={styles.footerColumn}>
            <h3 style={styles.footerColumnTitle}>Módulos</h3>
            <div style={styles.footerLinkList}>
              <a href="#modulos" style={styles.footerLink}>Panel</a>
              <a href="#modulos" style={styles.footerLink}>Académico</a>
              <a href="#modulos" style={styles.footerLink}>Comunicados</a>
              <a href="#modulos" style={styles.footerLink}>Tickets</a>
              <a href="#modulos" style={styles.footerLink}>Horario</a>
            </div>
          </div>

          <div style={styles.footerColumn}>
            <h3 style={styles.footerColumnTitle}>Stack técnico</h3>
            <div style={styles.badgeRow}>
              <span style={{ ...styles.techBadge, background: '#61dafb', color: '#0f172a' }}>React</span>
              <span style={{ ...styles.techBadge, background: '#6cc24a' }}>Node.js</span>
              <span style={{ ...styles.techBadge, background: '#007acc' }}>TypeScript</span>
              <span style={{ ...styles.techBadge, background: '#2d3748' }}>Prisma</span>
              <span style={{ ...styles.techBadge, background: '#00758f' }}>MySQL</span>
              <span style={{ ...styles.techBadge, background: '#2496ed' }}>Docker</span>
            </div>
          </div>
        </div>
        <div style={styles.footerBottom}>
          © 2026 Sistema de Intranet Escolar · Proyecto de portafolio · Desarrollado con React + Node.js + TypeScript
        </div>
      </footer>
      <style>{`
        @media (max-width: 768px) {
          .landing-nav-button-inline {
            display: none !important;
          }

          .landing-mobile-menu-button {
            display: inline-flex !important;
          }

          .landing-mobile-menu {
            display: grid !important;
          }

          .landing-hero-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .landing-feature-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#ffffff',
    color: colors.dark,
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    background: colors.dark,
    borderBottom: '1px solid rgba(255,255,255,0.08)'
  },
  headerInner: {
    width: 'min(1120px, calc(100% - 32px))',
    minHeight: 72,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap'
  },
  brand: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 12,
    color: '#ffffff',
    textDecoration: 'none',
    minWidth: 0
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ccfbf1',
    background: 'rgba(20, 184, 166, 0.16)',
    border: '1px solid rgba(204, 251, 241, 0.22)',
    flex: '0 0 auto'
  },
  brandText: {
    fontSize: 16,
    lineHeight: 1.25,
    overflowWrap: 'anywhere'
  },
  navButton: {
    color: '#ffffff',
    textDecoration: 'none',
    border: '1px solid rgba(255,255,255,0.28)',
    borderRadius: 8,
    padding: '10px 14px',
    fontWeight: 700,
    background: 'rgba(255,255,255,0.08)',
    whiteSpace: 'nowrap'
  },
  mobileMenuButton: {
    display: 'none',
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255,255,255,0.28)',
    borderRadius: 8,
    color: '#ffffff',
    background: 'rgba(255,255,255,0.08)',
    cursor: 'pointer'
  },
  mobileMenu: {
    display: 'none',
    width: '100%',
    padding: '0 0 12px'
  },
  mobileMenuLink: {
    minHeight: 44,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: '0 14px',
    color: '#ffffff',
    textDecoration: 'none',
    fontWeight: 800,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.18)'
  },
  hero: {
    width: '100%',
    background: `linear-gradient(135deg, ${colors.dark} 0%, ${colors.tealDeep} 48%, ${colors.tealDark} 100%)`,
    color: '#ffffff'
  },
  heroInner: {
    width: 'min(1120px, calc(100% - 32px))',
    margin: '0 auto',
    minHeight: 'calc(100vh - 72px)',
    padding: '72px 0 84px',
    display: 'flex',
    alignItems: 'center'
  },
  heroContent: {
    maxWidth: 860,
    display: 'flex',
    flexDirection: 'column',
    gap: 24
  },
  heroTitle: {
    margin: 0,
    fontSize: 'clamp(40px, 8vw, 76px)',
    lineHeight: 1,
    fontWeight: 850,
    letterSpacing: 0
  },
  heroSubtitle: {
    margin: 0,
    maxWidth: 760,
    fontSize: 20,
    lineHeight: 1.6,
    color: '#d1fae5'
  },
  heroActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap'
  },
  primaryHeroButton: {
    display: 'inline-flex',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: '0 20px',
    background: '#ffffff',
    color: colors.tealDark,
    textDecoration: 'none',
    fontWeight: 800
  },
  secondaryHeroButton: {
    minHeight: 48,
    borderRadius: 8,
    padding: '0 20px',
    border: '1px solid rgba(94, 234, 212, 0.72)',
    background: 'rgba(15, 118, 110, 0.22)',
    color: '#ccfbf1',
    fontWeight: 800,
    cursor: 'pointer'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 12,
    width: '100%',
    maxWidth: 880,
    paddingTop: 8
  },
  statItem: {
    borderRadius: 8,
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.09)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#f8fafc',
    fontWeight: 800,
    textAlign: 'center'
  },
  section: {
    padding: '76px 0',
    background: '#ffffff',
    scrollMarginTop: 84
  },
  sectionInner: {
    width: 'min(1120px, calc(100% - 32px))',
    margin: '0 auto'
  },
  sectionHeading: {
    maxWidth: 720,
    marginBottom: 34
  },
  sectionTitle: {
    margin: 0,
    fontSize: 'clamp(30px, 5vw, 44px)',
    lineHeight: 1.1,
    letterSpacing: 0,
    color: colors.dark
  },
  sectionSubtitle: {
    margin: '12px 0 0',
    color: colors.muted,
    fontSize: 18,
    lineHeight: 1.55
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 18
  },
  featureCard: {
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: 24,
    background: '#ffffff',
    minHeight: 220,
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.07)'
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ccfbf1',
    color: colors.tealDark,
    marginBottom: 18
  },
  cardTitle: {
    margin: 0,
    fontSize: 19,
    lineHeight: 1.25,
    color: colors.dark
  },
  cardText: {
    margin: '10px 0 0',
    color: colors.muted,
    lineHeight: 1.6
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 16
  },
  roleCard: {
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
    background: '#ffffff',
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: 20
  },
  roleIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ecfeff',
    color: colors.teal,
    flex: '0 0 auto'
  },
  roleTitle: {
    margin: 0,
    fontSize: 17,
    color: colors.dark
  },
  roleText: {
    margin: '7px 0 0',
    color: colors.muted,
    lineHeight: 1.55
  },
  cta: {
    background: colors.tealDeep,
    color: '#ffffff',
    padding: '76px 0'
  },
  ctaInner: {
    width: 'min(820px, calc(100% - 32px))',
    margin: '0 auto',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 18
  },
  ctaTitle: {
    margin: 0,
    fontSize: 'clamp(30px, 5vw, 46px)',
    lineHeight: 1.1,
    letterSpacing: 0
  },
  ctaSubtitle: {
    margin: 0,
    color: '#ccfbf1',
    fontSize: 18,
    lineHeight: 1.5
  },
  ctaButton: {
    minHeight: 48,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: '0 20px',
    background: '#ffffff',
    color: colors.tealDark,
    textDecoration: 'none',
    fontWeight: 800
  },
  ctaSmall: {
    color: '#99f6e4',
    lineHeight: 1.5
  },
  footer: {
    background: '#020617',
    color: '#ffffff'
  },
  footerTop: {
    width: 'min(1120px, calc(100% - 32px))',
    margin: '0 auto',
    padding: '40px 0 24px',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))',
    gap: 24,
    borderBottom: '1px solid rgba(255,255,255,0.08)'
  },
  footerInner: {
    width: 'min(1120px, calc(100% - 32px))',
    margin: '0 auto',
    padding: '34px 0',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 24,
    alignItems: 'center'
  },
  footerColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14
  },
  footerColumnTitle: {
    margin: 0,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 800
  },
  footerText: {
    margin: 0,
    color: '#cbd5e1',
    lineHeight: 1.8,
    fontSize: 15,
    maxWidth: 360
  },
  footerLinkList: {
    display: 'grid',
    gap: 10
  },
  footerLinkItem: {
    color: '#cbd5e1',
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: 15
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10
  },
  techBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    padding: '8px 14px',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: 13
  },
  footerBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  footerLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ccfbf1',
    background: 'rgba(20, 184, 166, 0.16)'
  },
  footerNav: {
    display: 'flex',
    justifyContent: 'center',
    gap: 14,
    flexWrap: 'wrap'
  },
  footerLinkItem: {
    color: '#cbd5e1',
    textDecoration: 'none',
    fontWeight: 700
  },
  footerStack: {
    margin: 0,
    color: '#94a3b8',
    textAlign: 'right',
    lineHeight: 1.5
  },
  footerBottom: {
    width: 'min(1120px, calc(100% - 32px))',
    margin: '0 auto',
    padding: '18px 0 24px',
    borderTop: '1px solid rgba(255,255,255,0.12)',
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center'
  },
  announcementBar: {
    width: '100%',
    background: '#0d9488',
    color: '#ffffff'
  },
  announcementInner: {
    width: 'min(1120px, calc(100% - 32px))',
    margin: '0 auto',
    padding: '12px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16
  },
  announcementText: {
    fontSize: 15,
    fontWeight: 600,
    textAlign: 'center'
  },
  announcementClose: {
    width: 36,
    height: 36,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.22)',
    background: 'rgba(255,255,255,0.12)',
    color: '#ffffff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  }
};
