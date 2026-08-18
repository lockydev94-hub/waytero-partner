// ============================================================
// WAYTERO PARTNER PORTAL — REALTIME PROVIDER
// Doc Ref: BRD Part 7 §155 — Realtime channel
//
// Owns:
//   - the singleton WebSocket connection (via useRealtime)
//   - the FCM web-push registration
//   - the in-app notification inbox cache (TanStack Query under the
//     hood is owned by useNotificationInbox; this provider just
//     invalidates that cache when a WS event arrives)
//
// Surfaces a `pendingBooking` slot that DashboardLayout / the global
// AcceptRejectPopup listens to. Three server events fill it:
//
//   PARTNER_ASSIGNMENT_REQUESTED      — admin assigned a CAB to this
//                                       partner (10-min accept window).
//   PARTNER_HOTEL_BOOKING_REQUESTED   — customer booked one of this
//                                       partner's hotels (fixed assign).
//   PARTNER_TOUR_BOOKING_REQUESTED    — customer booked one of this
//                                       partner's tour packages (fixed
//                                       assign).
//
// The popup renders Accept/Reject; a live countdown is shown for CAB
// only (hotel/tour have no acceptance deadline). Provider clears the
// slot when the admin reassigns / another tab responds.
// ============================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useAuthStore } from "../store/authStore";
import { useRealtime, type WSMessage } from "../hooks/useRealtime";
import { registerWebPush } from "../services/firebasePush";
import {
  installAudioUnlocker,
  playRingtone,
  stopRingtone,
  showLocalNotification,
} from "../utils/audio";

export type ServiceType = "CAB" | "HOTEL" | "TOUR";

export interface PendingBooking {
  service_type: ServiceType;
  /** Service-level id: cab booking id / hotel reservation id / tour booking id. */
  booking_id: number;
  master_booking_id: number;
  /** Human-readable booking number shown in the popup. */
  booking_number: string;
  /** CAB only — acceptance window deadline; null for hotel/tour. */
  acceptance_deadline?: string | null;
  // ── CAB ──
  pickup_location?: string;
  pickup_datetime?: string;
  // ── HOTEL ──
  hotel_name?: string;
  check_in_date?: string;
  check_out_date?: string;
  // ── TOUR ──
  package_name?: string;
  travel_start_date?: string;
  persons_count?: number;
  // ── all ──
  total_amount?: number;
}

interface RealtimeContextValue {
  /** True while the WebSocket is connected. */
  online: boolean;
  /** Set when a booking needs this partner to accept/reject. */
  pendingBooking: PendingBooking | null;
  /** Manually clear the popup (e.g. partner clicked "later"). */
  dismissPendingBooking: () => void;
  /** Invalidate the notifications inbox cache after a WS event. */
  bumpInboxVersion: () => void;
  /** Monotonically increasing counter incremented on any WS event. */
  inboxVersion: number;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
  const [inboxVersion, setInboxVersion] = useState(0);

  const bumpInboxVersion = useCallback(() => {
    setInboxVersion((v) => v + 1);
  }, []);

  const { status, subscribe } = useRealtime({ reconnectOnFocus: true });

  // Install the audio unlocker as soon as the user lands in the
  // dashboard so the first booking can ring. Idempotent — the
  // helper no-ops after the first successful unlock.
  useEffect(() => {
    const remove = installAudioUnlocker();
    return remove;
  }, []);

  const ringAndNotify = useCallback((title: string, body: string, tag: string) => {
    // Ring! The user-gesture unlocks were installed on mount, but we
    // still try to resume the AudioContext here in case the tab has
    // been idle long enough for the browser to re-suspend it. If
    // autoplay is blocked, audio.ts retries on the next gesture.
    playRingtone().catch(() => {
      /* ignored — popup + local notification still fire */
    });

    // Backup browser-level notification (works when the tab is
    // backgrounded but push permission is granted).
    showLocalNotification(title, { body, tag });
  }, []);

  // Subscribe to server events. We do this once at mount; the handlers
  // close over the setter functions so they always see the latest state.
  useEffect(() => {
    const offCab = subscribe<{
      cab_booking_number: string;
      master_booking_id: number;
      pickup_location?: string;
      pickup_datetime?: string;
      acceptance_deadline: string;
      cab_status?: string;
    }>(
      "PARTNER_ASSIGNMENT_REQUESTED",
      (msg) => {
        const d = msg.data;
        if (!d || !d.cab_booking_number) return;
        setPendingBooking({
          service_type: "CAB",
          booking_id: d.master_booking_id,
          master_booking_id: d.master_booking_id,
          booking_number: d.cab_booking_number,
          acceptance_deadline: d.acceptance_deadline,
          pickup_location: d.pickup_location ?? "",
          pickup_datetime: d.pickup_datetime ?? "",
        });
        bumpInboxVersion();
        ringAndNotify(
          "New cab booking assigned",
          `${d.cab_booking_number} — ${d.pickup_location ?? "pickup set"}`,
          `assignment-${d.cab_booking_number}`
        );
      }
    );

    const offHotel = subscribe<Record<string, unknown> & { reservation_id?: number; reservation_number?: string }>(
      "PARTNER_HOTEL_BOOKING_REQUESTED",
      (msg) => {
        const d = msg.data;
        if (!d || !d.reservation_id) return;
        setPendingBooking({
          service_type: "HOTEL",
          booking_id: Number(d.reservation_id),
          master_booking_id: Number(d.master_booking_id ?? d.reservation_id),
          booking_number: String(d.reservation_number ?? d.reservation_id),
          hotel_name: d.hotel_name ? String(d.hotel_name) : undefined,
          check_in_date: d.check_in_date ? String(d.check_in_date) : undefined,
          check_out_date: d.check_out_date ? String(d.check_out_date) : undefined,
          total_amount: d.total_amount != null ? Number(d.total_amount) : undefined,
        });
        bumpInboxVersion();
        ringAndNotify(
          "New hotel booking",
          `${d.reservation_number ?? ""} — ${d.hotel_name ?? "new reservation"}`,
          `hotel-${d.reservation_id}`
        );
      }
    );

    const offTour = subscribe<Record<string, unknown> & { tour_booking_id?: number; tour_booking_number?: string }>(
      "PARTNER_TOUR_BOOKING_REQUESTED",
      (msg) => {
        const d = msg.data;
        if (!d || !d.tour_booking_id) return;
        setPendingBooking({
          service_type: "TOUR",
          booking_id: Number(d.tour_booking_id),
          master_booking_id: Number(d.master_booking_id ?? d.tour_booking_id),
          booking_number: String(d.tour_booking_number ?? d.tour_booking_id),
          package_name: d.package_name ? String(d.package_name) : undefined,
          travel_start_date: d.travel_start_date ? String(d.travel_start_date) : undefined,
          persons_count: d.persons_count != null ? Number(d.persons_count) : undefined,
          total_amount: d.total_amount != null ? Number(d.total_amount) : undefined,
        });
        bumpInboxVersion();
        ringAndNotify(
          "New tour booking",
          `${d.tour_booking_number ?? ""} — ${d.package_name ?? "new booking"}`,
          `tour-${d.tour_booking_id}`
        );
      }
    );

    const offResponded = subscribe("BOOKING_PARTNER_RESPONDED", () => {
      // Any other partner tab accepted/rejected/timed out — clear our
      // pending popup + stop the ringtone so it doesn't keep looping
      // after the partner already responded in another tab.
      setPendingBooking((prev) => {
        if (prev) stopRingtone();
        return null;
      });
      bumpInboxVersion();
    });

    const offAdminRefresh = subscribe("BOOKING_ADMIN_REFRESH", () => {
      bumpInboxVersion();
    });

    return () => {
      offCab();
      offHotel();
      offTour();
      offResponded();
      offAdminRefresh();
    };
  }, [subscribe, bumpInboxVersion, ringAndNotify]);

  // Stop ringtone when the popup is dismissed manually (the partner
  // clicked "View Details" or X-ed out without accepting/rejecting).
  const dismissPendingBooking = useCallback(() => {
    setPendingBooking((prev) => {
      if (prev) stopRingtone();
      return null;
    });
  }, []);

  // Register FCM web push when the user becomes authenticated.
  // Best-effort: if the browser doesn't support it or the admin hasn't
  // configured Firebase, this is a no-op.
  const fcmTriedRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated) {
      fcmTriedRef.current = false;
      return;
    }
    if (fcmTriedRef.current) return;
    fcmTriedRef.current = true;
    // Defer slightly so we don't compete with the WS handshake.
    const t = window.setTimeout(() => {
      registerWebPush().catch(() => {
        /* ignore — push is optional */
      });
    }, 3000);
    return () => window.clearTimeout(t);
  }, [isAuthenticated, userId]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      online: status === "open",
      pendingBooking,
      dismissPendingBooking,
      bumpInboxVersion,
      inboxVersion,
    }),
    [status, pendingBooking, dismissPendingBooking, bumpInboxVersion, inboxVersion]
  );

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  );
}

export function useRealtimeContext(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error("useRealtimeContext must be used inside <RealtimeProvider>");
  }
  return ctx;
}
