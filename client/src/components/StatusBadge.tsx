import clsx from 'clsx';

export function StatusBadge({ value }: { value: string }) {
  return <span className={clsx('badge', `badge-${value}`)}>{value.replace('_', ' ')}</span>;
}
