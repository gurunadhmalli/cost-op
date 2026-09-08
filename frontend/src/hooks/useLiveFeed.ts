import { useEffect, useRef, useState } from 'react';

/**
 * Subscribes to the backend's /ws/live push channel (backend/app/api/live.py).
 * Every few seconds (SIMULATOR_INTERVAL_SECONDS in backend/.env) the live
 * simulator (backend/app/simulator/live_feed.py) appends new sensor readings
 * and, when one crosses the anomaly threshold, a fresh anomaly/root
 * cause/recommendation — this hook just tells the caller "something
 * happened, go refetch" rather than duplicating that data itself, so pages
 * keep using the same api.ts calls they already had.
 *
 * Reconnects automatically if the backend isn't up yet or restarts.
 */
export function useLiveFeed(onTick: (event: any) => void) {
  const [isLive, setIsLive] = useState(false);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws/live`);

      ws.onopen = () => setIsLive(true);

      ws.onmessage = (event) => {
        try {
          onTickRef.current(JSON.parse(event.data));
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        setIsLive(false);
        if (!cancelled) reconnectTimer = setTimeout(connect, 5000);
      };

      ws.onerror = () => ws?.close();
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  return { isLive };
}
