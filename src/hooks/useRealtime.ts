// ============================================================
// WAYTERO PARTNER PORTAL — REALTIME WEBSOCKET HOOK
// Doc Ref: BRD Part 7 §155 — Realtime channel
//
// One WebSocket per browser tab. Authenticated via the JWT in
// localStorage; reconnects with exponential backoff (capped at 30s).
//
// Exposes:
//   - status: 'connecting' | 'open' | 'closed'
//   - lastEvent: the most recent server message (or null)
//   - send(payload): client -> server message (rarely used today)
//   - subscribe(event, handler): add a typed listener; returns the
//     unsubscribe function. The hook keeps a Set<handler> per event
//     so multiple components can listen to the same channel.
//
// Server -> client envelope:
//   { event: <string>, data: <object>, ts: <ISO> }
//
// Notable server events this portal listens to:
//   BOOKING_PARTNER_RESPONDED       another tab accepted/rejected/timed out
//   BOOKING_ADMIN_REFRESH           admin changed something; refetch
//   PARTNER_ASSIGNMENT_REQUESTED    admin assigned a new cab (popup trigger)
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore } from "../store/authStore";
import { API_BASE_URL, TOKEN_KEYS } from "../services/api";

function currentAccessToken(): string | null {
  // Tokens live in localStorage (set by authStore.setAuth and rewritten
  // by the axios refresh interceptor). Read fresh on every connect.
  return localStorage.getItem(TOKEN_KEYS.ACCESS);
}

export type WSStatus = "idle" | "connecting" | "open" | "closed";

export interface WSMessage<T = unknown> {
  event: string;
  data: T;
  ts: string;
}

type Handler<T = unknown> = (msg: WSMessage<T>) => void;

function wsBaseUrl(): string {
  // Convert http(s)://host/api/v1  ->  ws(s)://host
  const api = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return api.replace(/^http/, "ws");
}

export interface UseRealtimeOptions {
  /** Auto-reconnect when the tab regains focus after a long sleep. */
  reconnectOnFocus?: boolean;
  /** Only connect when the user is authenticated. Default true. */
  requireAuth?: boolean;
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const { reconnectOnFocus = true, requireAuth = true } = options;
  // Track auth state via the store so we react to login / logout without
  // a separate listener.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [status, setStatus] = useState<WSStatus>("idle");
  const [lastEvent, setLastEvent] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<Handler>>>(new Map());
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectDelayRef = useRef<number>(1000); // backoff base
  const pingTimerRef = useRef<number | null>(null);
  const isUnmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (isUnmountedRef.current) return;
    // Always read the freshest token from localStorage — the axios
    // refresh interceptor rewrites it asynchronously.
    const token = currentAccessToken();
    if (requireAuth && !token) {
      // No token yet — stay idle; the effect will re-run when auth settles.
      setStatus("idle");
      return;
    }

    setStatus("connecting");
    // Defer the actual WebSocket construction until after the page has
    // finished loading. Browsers abort any in-flight handshake when the
    // document is still loading, producing noisy "connection interrupted"
    // errors on every reload.
    const open = () => {
      if (isUnmountedRef.current) return;
      const url = `${wsBaseUrl()}/ws?token=${encodeURIComponent(token ?? "")}`;
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        // Invalid URL or protocol mismatch — schedule a retry.
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("open");
        reconnectDelayRef.current = 1000; // reset backoff on success
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as WSMessage;
          if (msg && typeof msg === "object" && msg.event) {
            if (msg.event === "ping") {
              try { ws.send(JSON.stringify({ type: "pong" })); } catch { /* socket may be gone */ }
              return;
            }
            if (msg.event === "pong") return;
            setLastEvent(msg);
            const set = handlersRef.current.get(msg.event);
            if (set) {
              set.forEach((h) => {
                try { h(msg); } catch (err) { console.error("ws.handler_err event=", msg.event, err); }
              });
            }
          }
        } catch {
          // ignore non-JSON
        }
      };

      ws.onerror = () => {
        // Browser fires error before close; let onclose handle reconnect.
      };

      ws.onclose = () => {
        setStatus("closed");
        if (wsRef.current === ws) wsRef.current = null;
        if (isUnmountedRef.current) return;
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(delay * 2, 30_000);
      reconnectTimerRef.current = window.setTimeout(connect, delay);
    };

    if (document.readyState === "complete") {
      open();
    } else {
      const onLoad = () => {
        window.removeEventListener("load", onLoad);
        open();
      };
      window.addEventListener("load", onLoad, { once: true });
    }
  }, [requireAuth]);

  // (re)connect when the auth state flips
  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      // Drop any open socket — user logged out.
      if (wsRef.current) {
        try { wsRef.current.onclose = null; wsRef.current.close(); } catch { /* noop */ }
        wsRef.current = null;
      }
      setStatus("idle");
      return;
    }
    // Token just landed (initial auth) — establish (or re-establish)
    // the socket. Existing socket stays open while we're connected.
    if (status === "open" || status === "connecting") return;
    connect();
  }, [isAuthenticated, connect, requireAuth, status]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (pingTimerRef.current) {
      window.clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null; // suppress reconnect
      try { wsRef.current.close(); } catch { /* noop */ }
      wsRef.current = null;
    }
    setStatus("closed");
  }, []);

  // Client-side keepalive — every 20s send a ping. The server replies
  // with a pong but we ignore it; the real purpose is to detect a dead
  // socket from our side so the onclose path can reconnect.
  useEffect(() => {
    if (status !== "open") return;
    pingTimerRef.current = window.setInterval(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      try { ws.send(JSON.stringify({ type: "ping" })); } catch { /* ignore */ }
    }, 20_000);
    return () => {
      if (pingTimerRef.current) {
        window.clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
    };
  }, [status]);

  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      disconnect();
    };
  }, [disconnect]);

  // When the tab comes back to the foreground after being hidden for a
  // while, force a reconnect. Browsers may silently drop idle sockets.
  useEffect(() => {
    if (!reconnectOnFocus) return;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (requireAuth && !currentAccessToken()) return;
      if (status !== "open") {
        disconnect();
        reconnectDelayRef.current = 1000;
        connect();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [connect, disconnect, reconnectOnFocus, requireAuth, status]);

  const send = useCallback((payload: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  const subscribe = useCallback(
    <T = unknown,>(event: string, handler: Handler<T>) => {
      let set = handlersRef.current.get(event);
      if (!set) {
        set = new Set();
        handlersRef.current.set(event, set);
      }
      set.add(handler as Handler);
      return () => {
        const s = handlersRef.current.get(event);
        if (s) {
          s.delete(handler as Handler);
          if (s.size === 0) handlersRef.current.delete(event);
        }
      };
    },
    []
  );

  return { status, lastEvent, send, subscribe };
}
