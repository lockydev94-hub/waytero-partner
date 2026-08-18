// ============================================================
// WAYTERO PARTNER PORTAL — FIREBASE WEB PUSH REGISTRATION
// Doc Ref: BRD Part 7 §155 — Push channel
//
// Loads the Firebase Web SDK on demand and returns a registration
// helper that:
//   1. Asks the browser for Notification permission.
//   2. Initialises the Firebase app with the web config the backend
//      exposes via the FIREBASE row in api_integrations.
//   3. Gets a registration token from FCM (works even without a
//      service worker for now — the SW registration is added in the
//      partner portal index.html for full push delivery).
//
// We deliberately do NOT bundle firebase/app + firebase/messaging via
// npm — the SDK ships >200KB gz and isn't needed until the user opts
// into push. Instead we lazy-inject <script> tags and let the global
// `firebase` namespace register.
//
// If the user denies permission, returns null. If the backend has no
// FIREBASE row, returns null. Callers must handle the null case.
import apiClient from "./api";
import { notificationService } from "./notification.service";

export interface FirebaseWebConfig {
  apiKey?: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

interface FirebaseAppLite {
  name: string;
}
interface FirebaseMessagingLite {
  getToken: (opts?: { vapidKey?: string }) => Promise<string>;
}
interface FirebaseNamespace {
  initializeApp: (cfg: FirebaseWebConfig, name?: string) => FirebaseAppLite;
  apps: FirebaseAppLite[];
  messaging: (() => FirebaseMessagingLite) | undefined;
}

declare global {
  interface Window {
    firebase?: FirebaseNamespace;
    __firebaseLoading?: Promise<void>;
  }
}

const FIREBASE_APP_VERSION = "10.13.2";
const SCRIPT_ID = "waytero-firebase-web-sdk";

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(SCRIPT_ID + ":" + src)) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[data-firebase-src="${src}"]`);
    if (existing) {
      if (window.firebase) resolve();
      else existing.addEventListener("load", () => resolve());
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.defer = true;
    s.dataset.firebaseSrc = src;
    s.id = SCRIPT_ID + ":" + src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

async function ensureFirebaseLoaded(): Promise<FirebaseNamespace | null> {
  if (typeof window === "undefined") return null;
  if (window.firebase && window.firebase.messaging) return window.firebase;
  if (window.__firebaseLoading) {
    await window.__firebaseLoading;
  } else {
    window.__firebaseLoading = (async () => {
      await loadScriptOnce(
        `https://www.gstatic.com/firebasejs/${FIREBASE_APP_VERSION}/firebase-app-compat.js`
      );
      await loadScriptOnce(
        `https://www.gstatic.com/firebasejs/${FIREBASE_APP_VERSION}/firebase-messaging-compat.js`
      );
    })();
    await window.__firebaseLoading;
  }
  return window.firebase ?? null;
}

export async function fetchFirebaseWebConfig(): Promise<FirebaseWebConfig | null> {
  try {
    // Route through the shared axios client so the Vite dev proxy and the
    // Bearer-token interceptor apply. The public endpoint returns ONLY the
    // browser-side FCM web config fields — the server private_key never
    // leaves the backend (Security Hardening S5).
    const res = await apiClient.get<{
      configured: boolean;
      config: Record<string, string> | null;
    }>("/public/firebase-config");
    const { configured, config } = res.data ?? {};
    if (!configured || !config || !config.project_id) return null;
    return {
      apiKey: config.api_key,
      authDomain: config.auth_domain,
      projectId: config.project_id,
      storageBucket: config.storage_bucket,
      messagingSenderId: config.messaging_sender_id,
      appId: config.app_id,
    };
  } catch {
    return null;
  }
}

let _activeApp: FirebaseAppLite | null = null;

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
 * Lazy-register a push subscription with FCM. Idempotent: re-calling
 * after a token refresh just updates the stored token on the server.
 *
 * Returns the FCM registration token on success, or null if push isn't
 * available / was declined / FCM isn't configured on the server.
 */
export async function registerWebPush(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const perm = await requestNotificationPermission();
  if (perm !== "granted") return null;

  const config = await fetchFirebaseWebConfig();
  if (!config) return null;

  const fb = await ensureFirebaseLoaded();
  if (!fb || !fb.messaging) return null;

  // Initialise the app once.
  if (!_activeApp) {
    try {
      _activeApp = fb.initializeApp(config, "waytero-web");
    } catch {
      // Re-init after hot reload — reuse the existing app.
      _activeApp = fb.apps[0] ?? null;
    }
  }
  const messaging = fb.messaging();
  let token: string;
  try {
    token = await messaging.getToken();
  } catch {
    return null;
  }
  if (!token) return null;

  try {
    await notificationService.registerFcmToken(token, "WEB");
  } catch {
    /* server registration failed — token still works in-browser, just not synced */
  }
  return token;
}

/** Tear down FCM and tell the server to forget the token. */
export async function unregisterWebPush(token: string): Promise<void> {
  try {
    await notificationService.deactivateFcmToken(token);
  } catch {
    /* ignore */
  }
}
