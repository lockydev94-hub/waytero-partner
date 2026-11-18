// ============================================================
// WAYTERO PARTNER — LOCK STORE
// A screen lock in front of a still-valid session. Tokens are untouched by a
// lock; unlocking returns the partner to the page they were on.
//
// `lastActivityTs` is persisted so refreshing the tab cannot buy a fresh idle
// window. `sessionExpiresAt` is the server's absolute 12-hour bound, and
// `serverOffsetMs` corrects a wrong laptop clock when comparing against it.
// ============================================================
import { create } from "zustand";
import type { SessionConfig } from "../types/auth";

const PERSIST_KEY = "pp_lock";
const PERSIST_ACTIVITY_EVERY_MS = 2_000;

interface PersistedLock {
  isLocked: boolean;
  lockedAt: string | null;
  lastActivityTs: number;
  sessionConfig: SessionConfig | null;
}

interface LockStore extends PersistedLock {
  serverOffsetMs: number;
  idleRemainingMs: number;

  setSessionConfig: (config: SessionConfig) => void;
  setIdleRemaining: (ms: number) => void;
  markActivity: (ts?: number) => void;
  lock: () => void;
  unlock: () => void;
  startSession: () => void;
}

function readPersisted(): PersistedLock {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedLock>;
      return {
        isLocked: Boolean(parsed.isLocked),
        lockedAt: typeof parsed.lockedAt === "string" ? parsed.lockedAt : null,
        lastActivityTs:
          typeof parsed.lastActivityTs === "number" ? parsed.lastActivityTs : now,
        sessionConfig: parsed.sessionConfig ?? null,
      };
    }
  } catch {
    /* corrupt or unavailable storage — start fresh */
  }
  return { isLocked: false, lockedAt: null, lastActivityTs: now, sessionConfig: null };
}

let lastPersistTs = 0;

function persist(state: PersistedLock, force = false) {
  const now = Date.now();
  if (!force && now - lastPersistTs < PERSIST_ACTIVITY_EVERY_MS) return;
  lastPersistTs = now;
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota — in-memory lock still works */
  }
}

export const useLockStore = create<LockStore>((set, get) => {
  const initial = readPersisted();

  const write = (patch: Partial<LockStore>, force = false) => {
    set(patch);
    const s = get();
    persist(
      {
        isLocked: s.isLocked,
        lockedAt: s.lockedAt,
        lastActivityTs: s.lastActivityTs,
        sessionConfig: s.sessionConfig,
      },
      force
    );
  };

  return {
    ...initial,
    serverOffsetMs: 0,
    idleRemainingMs: (initial.sessionConfig?.idle_minutes ?? 5) * 60_000,

    setSessionConfig: (config) => {
      const serverNowMs = new Date(config.server_now).getTime();
      const serverOffsetMs = Number.isFinite(serverNowMs)
        ? serverNowMs - Date.now()
        : 0;
      write({ sessionConfig: config, serverOffsetMs }, true);
    },

    setIdleRemaining: (ms) => set({ idleRemainingMs: ms }),

    markActivity: (ts) => {
      const now = ts ?? Date.now();
      if (now <= get().lastActivityTs) return;
      write({ lastActivityTs: now });
    },

    lock: () => {
      if (get().isLocked) return;
      write(
        {
          isLocked: true,
          lockedAt: new Date().toISOString(),
          lastActivityTs: Date.now(),
        },
        true
      );
    },

    unlock: () => {
      write({ isLocked: false, lockedAt: null, lastActivityTs: Date.now() }, true);
    },

    startSession: () => {
      // A new sign-in must not inherit the previous account's PIN state or
      // 12-hour deadline while the fresh policy request is still in flight.
      write(
        {
          isLocked: false,
          lockedAt: null,
          lastActivityTs: Date.now(),
          sessionConfig: null,
          serverOffsetMs: 0,
          idleRemainingMs: 5 * 60_000,
        },
        true
      );
    },
  };
});

/** Server-corrected clock, used for the absolute session deadline. */
export function trustedNowMs(): number {
  return Date.now() + useLockStore.getState().serverOffsetMs;
}

/** Drop lock state entirely (logout / session clear). */
export function clearLockState() {
  useLockStore.getState().startSession();
}
