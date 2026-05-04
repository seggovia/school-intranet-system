import { useCallback, useEffect, useState } from 'react';

export function useAsyncData<T>(loader: () => Promise<T>, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const value = await loader();
      setData(value);
      setError(null);
      return value;
    } catch {
      setError('No se pudo cargar la informacion.');
      throw new Error('No se pudo cargar la informacion.');
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loader()
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) setError('No se pudo cargar la informacion.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loader]);

  return { data, loading, error, reload };
}
