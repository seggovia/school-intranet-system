import { AlertTriangle } from 'lucide-react';
import type { NormalizedApiError } from '../api-error';

export function ApiErrorModal({ error, onClose }: { error: NormalizedApiError; onClose: () => void }) {
  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="api-error-modal">
        <AlertTriangle size={28} />
        <div>
          <h2>{error.title}</h2>
          <p>{error.message}</p>
        </div>
        <footer>
          <button type="button" className="primary-button" onClick={onClose}>Entendido</button>
        </footer>
      </section>
    </div>
  );
}
