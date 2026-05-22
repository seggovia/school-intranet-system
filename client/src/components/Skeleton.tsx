import type { ReactNode } from 'react';

type SkeletonLineProps = {
  width?: string | number;
  height?: string | number;
};

type SkeletonCardProps = {
  children: ReactNode;
};

export function SkeletonLine({ width = '100%', height = 16 }: SkeletonLineProps) {
  return (
    <div
      className="skeleton-pulse"
      style={{
        width,
        height,
        borderRadius: 4,
        background: 'var(--color-border)'
      }}
    />
  );
}

export function SkeletonCard({ children }: SkeletonCardProps) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 8,
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)'
      }}
    >
      {children}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <>
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 16
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index}>
            <SkeletonLine height={60} />
          </SkeletonCard>
        ))}
      </section>
      <style>{`
        @keyframes skeleton-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
        .skeleton-pulse { animation: skeleton-pulse 1.5s ease-in-out infinite }
      `}</style>
    </>
  );
}
