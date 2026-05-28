import { useCallback, useEffect, useState } from 'react';
import { api, loadMyNotifications, markAllMyNotificationsRead, markMyNotificationRead, sessionStorageKey } from './api';
import type { AuthSession, UserNotification } from './types';

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

function getAccessToken() {
  const raw = localStorage.getItem(sessionStorageKey);
  if (!raw) return '';
  try {
    return (JSON.parse(raw) as AuthSession).accessToken ?? '';
  } catch {
    return '';
  }
}

function notificationStreamUrl(token: string) {
  const baseUrl = String(api.defaults.baseURL ?? '/api').replace(/\/$/, '');
  return `${baseUrl}/notifications/stream?token=${encodeURIComponent(token)}`;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lastRealtimeNotification, setLastRealtimeNotification] = useState<UserNotification | null>(null);
  const [pollingFallback, setPollingFallback] = useState(false);
  const [streamRetry, setStreamRetry] = useState(0);

  const refresh = useCallback(async () => {
    const data = await loadMyNotifications();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
    return data;
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    if (!('EventSource' in window)) {
      setPollingFallback(true);
      return undefined;
    }
    const token = getAccessToken();
    if (!token) {
      setPollingFallback(true);
      return undefined;
    }

    let retryTimer: number | undefined;
    const source = new EventSource(notificationStreamUrl(token));
    source.onopen = () => setPollingFallback(false);
    source.onmessage = (event) => {
      try {
        const next = JSON.parse(event.data) as UserNotification;
        setNotifications((current) => {
          const exists = current.some((item) => item.id === next.id);
          if (!exists && !next.readAt) {
            setUnreadCount((count) => count + 1);
            setLastRealtimeNotification(next);
          }
          return [next, ...current.filter((item) => item.id !== next.id)].slice(0, 20);
        });
      } catch {
        // Ignore malformed SSE messages and keep the stream open.
      }
    };
    source.onerror = (event) => {
      console.warn('Notification stream disconnected. Retrying in 5 seconds.', event);
      source.close();
      setPollingFallback(true);
      retryTimer = window.setTimeout(() => setStreamRetry((current) => current + 1), 5000);
    };

    return () => {
      if (retryTimer) window.clearTimeout(retryTimer);
      source.close();
    };
  }, [streamRetry]);

  useEffect(() => {
    if (!pollingFallback) return undefined;
    const timer = window.setInterval(() => refresh().catch(() => undefined), 60000);
    return () => window.clearInterval(timer);
  }, [pollingFallback, refresh]);

  const markRead = useCallback(async (id: string) => {
    setBusy(true);
    try {
      await markMyNotificationRead(id);
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setBusy(true);
    try {
      await markAllMyNotificationsRead();
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return {
    notifications,
    unreadCount,
    busy,
    lastRealtimeNotification,
    refresh,
    markRead,
    markAllRead
  };
}
