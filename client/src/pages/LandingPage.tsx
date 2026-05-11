import type { CSSProperties } from 'react';
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
  School,
  Shield,
  TrendingUp,
  Users
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
  function scrollToFeatures() {
    document.getElementById('modulos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <Link to="/" style={styles.brand}>
            <span style={styles.logoMark}><School size={25} /></span>
            <strong style={styles.brandText}>Sistema de Intranet Colegio</strong>
          </Link>
          <Link to="/login" style={styles.navButton}>Ingresar al sistema</Link>
        </div>
      </header>

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
            <div style={styles.statsRow}>
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
          <div style={styles.featureGrid}>
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
        <div style={styles.footerInner}>
          <div style={styles.footerBrand}>
            <span style={styles.footerLogo}><School size={23} /></span>
            <div>
              <strong>Sistema de Intranet Colegio</strong>
              <small>Gestión interna</small>
            </div>
          </div>
          <nav style={styles.footerNav} aria-label="Navegación de acceso">
            {footerLinks.map((item) => (
              <Link key={item} to="/login" style={styles.footerLink}>{item}</Link>
            ))}
          </nav>
          <p style={styles.footerStack}>React · Node.js · TypeScript · Prisma · MySQL</p>
        </div>
        <div style={styles.footerBottom}>© 2026 Sistema de Intranet Colegio. Proyecto de portafolio.</div>
      </footer>
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
  footerInner: {
    width: 'min(1120px, calc(100% - 32px))',
    margin: '0 auto',
    padding: '34px 0',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 24,
    alignItems: 'center'
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
  footerLink: {
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
    fontSize: 14
  }
};
