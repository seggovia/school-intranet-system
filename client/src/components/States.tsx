import { AlertCircle, Inbox } from 'lucide-react';

export function LoadingState({ label = 'Cargando informacion...' }: { label?: string }) {
  return <div className="skeleton-row">{label}</div>;
}

export function ErrorState({ label = 'No se pudo cargar esta informacion.' }: { label?: string }) {
  return <div className="alert"><AlertCircle size={16} /> {label}</div>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="empty-state">
      <Inbox size={22} />
      <strong>{title}</strong>
      {description && <span>{description}</span>}
    </div>
  );
}
