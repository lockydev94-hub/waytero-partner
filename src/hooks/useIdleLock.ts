// ============================================================
// WAYTERO PARTNER — USE IDLE LOCK
// Publishes the remaining idle window (for the header chip) and fires once
// when it reaches zero. `lastActivityTs` comes from the persisted lock store,
// so a refresh cannot grant a fresh five minutes.
// ============================================================
import { useEffect, useRef } from "react";
import { useLockStore } from "../stores/lockStore";
import { postPartnerSessionMessage } from "./usePartnerSessionChannel";

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "click",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
] as const;

const BROADCAST_EVERY_MS = 1_000;

interface IdleLockOptions {
  timeoutMs: number;
  enabled: boolean;
  onIdle: () => void;
}

export function useIdleLock({ timeoutMs, enabled, onIdle }: IdleLockOptions) {
  const firedRef = useRef(false);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    firedRef.current = false;
    if (!enabled) {
      useLockStore.getState().setIdleRemaining(timeoutMs);
      return;
    }

    let lastBroadcast = 0;
    const markActivity = () => {
      const now = Date.now();
      useLockStore.getState().markActivity(now);
      if (now - lastBroadcast >= BROADCAST_EVERY_MS) {
        lastBroadcast = now;
        postPartnerSessionMessage({ type: "activity", ts: now });
      }
    };

    const check = () => {
      const state = useLockStore.getState();
      const remaining = Math.max(0, timeoutMs - (Date.now() - state.lastActivityTs));
      state.setIdleRemaining(remaining);
      if (remaining === 0 && !firedRef.current) {
        firedRef.current = true;
        onIdleRef.current();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        check();
        markActivity();
      }
    };

    check();
    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, markActivity, { passive: true })
    );
    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = window.setInterval(check, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, markActivity));
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [timeoutMs, enabled]);
}
