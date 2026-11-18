// ============================================================
// WAYTERO PARTNER — SESSION MANAGER (policy engine)
// Mirrors the admin portal:
//   1. Idle → lock behind the partner's MPIN when one is set. Without a PIN
//      there is nothing to unlock with, so idle still performs a full logout.
//   2. Absolute → the server caps a dashboard session at 12 hours. The client
//      signs out at that instant even if the tab was locked or asleep.
// Both are synced across open tabs through BroadcastChannel.
// ============================================================
import { ReactNode, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { useLockStore, trustedNowMs } from "../../stores/lockStore";
import { useIdleLock } from "../../hooks/useIdleLock";
import { useSessionConfig } from "../../hooks/useSessionConfig";
import {
  postPartnerSessionMessage,
  usePartnerSessionChannel,
} from "../../hooks/usePartnerSessionChannel";
import { useSessionValidation } from "../../hooks/useSessionValidation";
import { clearSession } from "../../services/api";
import LockScreen from "../layout/LockScreen";

const IDLE_FALLBACK_MINUTES = 5;

function ActiveSessionManager({ children }: { children: ReactNode }) {
  const isLocked = useLockStore((s) => s.isLocked);
  const config = useLockStore((s) => s.sessionConfig);

  useSessionValidation();
  const { refresh } = useSessionConfig(true);

  usePartnerSessionChannel((message) => {
    if (message.type === "activity") {
      useLockStore.getState().markActivity(message.ts);
    } else if (message.type === "lock") {
      useLockStore.getState().lock();
    } else {
      useLockStore.getState().unlock();
      void refresh();
    }
  });

  const lockMode = Boolean(config?.has_mpin);
  const timeoutMs = (config?.idle_minutes ?? IDLE_FALLBACK_MINUTES) * 60_000;

  useIdleLock({
    timeoutMs,
    enabled: !isLocked,
    onIdle: () => {
      if (lockMode) {
        useLockStore.getState().lock();
        postPartnerSessionMessage({ type: "lock" });
      } else {
        clearSession("/login?reason=inactivity");
      }
    },
  });

  const sessionExpiresAt = config?.session_expires_at ?? null;
  useEffect(() => {
    if (!sessionExpiresAt) return;
    const deadline = new Date(sessionExpiresAt).getTime();
    if (!Number.isFinite(deadline)) return;
    const tick = () => {
      if (deadline - trustedNowMs() <= 0) {
        clearSession("/login?reason=session-expired");
      }
    };
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [sessionExpiresAt]);

  if (isLocked) return <LockScreen />;
  return <>{children}</>;
}

export default function SessionManager({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <>{children}</>;
  return <ActiveSessionManager>{children}</ActiveSessionManager>;
}
