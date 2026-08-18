// ============================================================
// WAYTERO PARTNER PORTAL — AUDIO + RINGTONE HELPER
// Doc Ref: BRD Part 7 §155 — Realtime channel
//
// Browsers gate audio playback behind a user gesture. Until the user
// clicks/taps/types somewhere, AudioContext is "suspended" and HTML
// <audio> elements play muted or not at all. We solve this by:
//   1. Lazily creating a singleton AudioContext on first user gesture.
//   2. Resuming it (which fires the browser's "click to enable audio"
//      exception-free path) the moment the user interacts.
//   3. Providing a playRingtone() helper that loops the partner
//      portal's public/sound/ringtone.mp3 until stopRingtone() is
//      called (when the partner accepts/rejects or the deadline
//      expires).
//
// The helper also exposes a notification-permission banner — call
// notificationStatus() to learn whether push is granted/denied/default
// and surface a "Turn on notifications" UI accordingly.
// ============================================================

let _audioCtx: AudioContext | null = null;
let _ringtoneEl: HTMLAudioElement | null = null;
let _userGestureLatch = false;
let _retryUnlock: (() => void) | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_audioCtx) return _audioCtx;
  const Ctor = (window.AudioContext ||
    // Safari prefix
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Ctor) return null;
  try {
    _audioCtx = new Ctor();
  } catch {
    _audioCtx = null;
  }
  return _audioCtx;
}

/**
 * Call this once on app mount. It installs listeners that try to
 * unlock the AudioContext the first time the user clicks, touches,
 * presses a key, or scrolls. After the first successful unlock the
 * listeners detach themselves.
 */
export function installAudioUnlocker(): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (_userGestureLatch) return () => undefined;

  const tryUnlock = () => {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {
        /* some browsers reject until a real gesture — try again next click */
      });
    }
    _userGestureLatch = true;
    EVENTS.forEach((e) =>
      window.removeEventListener(e, tryUnlock, { capture: true } as any)
    );
  };

  const EVENTS = ["click", "touchstart", "keydown", "pointerdown", "scroll"] as const;
  EVENTS.forEach((e) =>
    window.addEventListener(e, tryUnlock, { capture: true, passive: true } as any)
  );

  return () => {
    EVENTS.forEach((e) =>
      window.removeEventListener(e, tryUnlock, { capture: true } as any)
    );
  };
}

/**
 * Manually nudge the AudioContext — call this from the user-facing
 * "Enable notifications" button so the click is guaranteed to count
 * as a gesture even if no other interaction happened first.
 */
export async function unlockAudioOnce(): Promise<void> {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch { /* ignore */ }
  }
  _userGestureLatch = true;
}

// ── Ringtone ──────────────────────────────────────────────────────

const RINGTONE_SRC = "/sound/ringtone.mp3";

/**
 * Retry a blocked play() on the next user gesture.
 *
 * FIX (ringtone not ringing on the first booking): when a WS event
 * arrives before the user has ever interacted with the page, el.play()
 * is rejected by autoplay policy. Previously the error was swallowed
 * and the ringtone never rang. Now we keep the element and retry the
 * moment the user clicks / taps / presses a key — the first booking of
 * a session rings as soon as the partner touches the page.
 */
function scheduleRetryOnGesture(): void {
  if (_retryUnlock) return; // already waiting on a gesture
  const EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

  const retry = () => {
    _retryUnlock = null;
    const el = _ringtoneEl;
    if (!el) return;
    el.play().catch(() => {
      /* give up silently — user chose not to enable audio */
    });
  };

  EVENTS.forEach((e) =>
    window.addEventListener(e, retry, { capture: true, once: true } as any)
  );
  _retryUnlock = () => {
    EVENTS.forEach((e) =>
      window.removeEventListener(e, retry, { capture: true } as any)
    );
  };
}

/**
 * Start playing the partner-portal's ringtone. Loops until
 * stopRingtone() is called. Safe to call repeatedly — calling while
 * already playing is a no-op.
 */
export async function playRingtone(): Promise<void> {
  if (typeof window === "undefined") return;

  // Make sure audio is unlocked before we try to play — otherwise the
  // first playRingtone() in a fresh tab is silent and the user thinks
  // nothing is happening.
  await unlockAudioOnce();

  if (_ringtoneEl) {
    // Already playing — just make sure it's at the top of its loop.
    if (_ringtoneEl.paused) {
      try { await _ringtoneEl.play(); } catch { /* ignore */ }
    }
    return;
  }

  const el = new Audio(RINGTONE_SRC);
  el.loop = true;
  el.preload = "auto";
  el.volume = 0.7;
  _ringtoneEl = el;
  try {
    await el.play();
  } catch (err) {
    // Autoplay blocked — keep the element and retry on the next user
    // gesture so the ringtone still fires when the partner interacts.
    scheduleRetryOnGesture();
    throw err;
  }
}

export function stopRingtone(): void {
  if (_retryUnlock) {
    _retryUnlock();
    _retryUnlock = null;
  }
  if (!_ringtoneEl) return;
  try {
    _ringtoneEl.pause();
    _ringtoneEl.currentTime = 0;
  } catch { /* noop */ }
  _ringtoneEl = null;
}

export function isRingtonePlaying(): boolean {
  return !!_ringtoneEl && !_ringtoneEl.paused;
}

// ── Notification permission helper ───────────────────────────────

export function notificationStatus(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}

/**
 * Show a browser-level notification even if the page is in the
 * background. Falls back to a no-op if permission isn't granted.
 * Used as a backup when the WS connection drops and FCM isn't
 * configured — better than silence.
 */
export function showLocalNotification(title: string, options?: NotificationOptions): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      ...options,
    });
  } catch {
    /* ignore — some browsers throw if called too often */
  }
}
