// ============================================================
// WAYTERO PARTNER PORTAL — TOPBAR SERVICE
// Fetches live data for top bar: wallet balance + booking counts
// Endpoint: GET /partners/me/bookings/counts
// Wallet balance comes from dashboard or wallet service
// ============================================================
import apiClient from "./api";

export interface BookingCounts {
  actionable: number;             // needs action (PENDING_PARTNER_ACCEPTANCE/ASSIGNED/DRIVER_ASSIGNED/STARTED)
  pending_acceptance: number;    // PENDING_PARTNER_ACCEPTANCE — admin is waiting on partner
  pending_driver: number;        // ASSIGNED — driver not yet set
  in_progress: number;           // DRIVER_ASSIGNED + STARTED
  total_active: number;          // all non-terminal
}

export const topbarService = {
  getBookingCounts: (): Promise<BookingCounts> =>
    apiClient.get("/partners/me/bookings/counts").then((r) => r.data),
};
