import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 96px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 520,
          textAlign: 'center',
          padding: 32
        }}
      >
        <div
          style={{
            color: 'var(--color-primary, #0d9488)',
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1,
            marginBottom: 16
          }}
        >
          404
        </div>
        <h1
          style={{
            margin: '0 0 12px',
            color: 'var(--color-text)',
            fontSize: 28,
            fontWeight: 700
          }}
        >
          Página no encontrada
        </h1>
        <p
          style={{
            margin: '0 0 24px',
            color: 'var(--color-muted)',
            fontSize: 16,
            lineHeight: 1.6
          }}
        >
          La página que buscas no existe o fue movida.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={{
            border: 0,
            borderRadius: 8,
            background: 'var(--color-primary, #0d9488)',
            color: '#fff',
            padding: '12px 18px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Volver al inicio
        </button>
      </section>
    </main>
  );
}
