import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(error, errorInfo);
  }

  private reloadPage = () => {
    window.location.reload();
  };

  private goHome = () => {
    window.location.assign('/dashboard');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          color: 'var(--color-text)',
          background: 'var(--color-bg)',
        }}
      >
        <section
          role="alert"
          aria-live="assertive"
          style={{
            width: 'min(100%, 520px)',
            display: 'grid',
            gap: 16,
            padding: 28,
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            background: 'var(--color-card)',
            boxShadow: 'var(--shadow-card)',
            textAlign: 'center',
          }}
        >
          <AlertTriangle
            size={44}
            aria-hidden="true"
            style={{
              justifySelf: 'center',
              color: '#b45309',
            }}
          />
          <div style={{ display: 'grid', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15 }}>Algo salió mal</h1>
            <p style={{ margin: 0, color: 'var(--color-muted)', lineHeight: 1.55 }}>
              Ocurrió un error inesperado. Recarga la página o vuelve al inicio.
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <button type="button" className="primary-button" onClick={this.reloadPage}>
              Recargar página
            </button>
            <button type="button" className="secondary-button" onClick={this.goHome}>
              Ir al inicio
            </button>
          </div>
        </section>
      </main>
    );
  }
}
