// ============================================================
// WAYTERO PARTNER PORTAL — HOTEL BOOKING SERVICE
// Doc Ref: BRD Part 4 §57-92 — Hotel Booking Lifecycle
// Endpoints: /partners/me/hotel-bookings/...
// ============================================================
import apiClient from "./api";
import type { BookingOfferInfo, BookingCouponInfo } from "./booking.service";

// ── List item ────────────────────────────────────────────────

export interface HotelBookingListItem {
  id: number;
  reservation_number: string;
  master_booking_id: number;
  hotel_id: number;
  hotel_name: string | null;
  hotel_code: string | null;
  city_name: string | null;
  customer_name: string | null;
  customer_mobile: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  nights: number;
  rooms_count: number;
  adults_count: number;
  total_amount: number;
  reservation_status: string;
  payment_collected_status: string;
  invoice_number: string | null;
  created_at: string;
}

export interface HotelBookingListResponse {
  items: HotelBookingListItem[];
  total: number;
  page: number;
  pages: number;
}

// ── Advance payment row ──────────────────────────────────────

export interface AdvanceRow {
  id: number;
  receipt_number: string;
  amount: number;
  refunded_amount: number;
  payment_mode: string;
  received_by: string;
  reference_number: string | null;
  notes: string | null;
  collected_at: string | null;
}

// ── Full detail ──────────────────────────────────────────────

export interface HotelBookingDetail {
  id: number;
  reservation_number: string;
  master_booking_id: number;
  hotel_id: number;
  hotel_name: string | null;
  hotel_address: string | null;
  room_category_name: string | null;
  room_type: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  nights: number;
  rooms_count: number;
  adults_count: number;
  children_count: number;
  extra_beds: number;
  special_requests: string | null;
  base_amount: number | null;
  taxes_amount: number | null;
  gst_percent: number | null;
  is_tax_invoice: boolean;
  // Platform-wide GST switch (system_configurations.GST_ENABLED). When false no
  // tax is charged at all, so the billing panel must omit the tax row entirely.
  gst_enabled: boolean;
  additional_charges: number | null;
  overtime_hours: number | null;
  overtime_charge: number | null;
  discount_amount: number | null;
  coupon_code: string | null;
  coupon_discount: number | null;
  offer?: BookingOfferInfo | null;
  coupon?: BookingCouponInfo | null;
  final_amount: number | null;
  actual_check_in_at: string | null;
  actual_check_out_at: string | null;
  /**
   * Platform-local re-projection of the stamps above. The partner is often
   * browsing from a different time zone than the property; the UI shows the
   * string the guest would read on the invoice so there's no off-by-one-day
   * confusion at the check-in desk.
   */
  check_in_at_local: string | null;
  check_out_at_local: string | null;
  /** IANA zone name (e.g. "Asia/Kolkata") the platform operates in. */
  platform_timezone: string | null;
  check_in_id_proof: string | null;
  reservation_status: string;
  hotel_confirmation_number: string | null;
  cancellation_reason: string | null;
  cancellation_charge: number | null;
  refund_amount: number | null;
  allocated_rooms: string | null;
  invoice_number: string | null;
  invoice_url: string | null;
  payment_collected_status: string;
  payment_collected_by: string | null;
  advance_payments: AdvanceRow[];
  total_advance_paid: number;
  balance_due: number;
  customer_name: string | null;
  customer_mobile: string | null;
  created_at: string;
}

export interface AvailableRoom {
  id: number;
  room_number: string;
  floor_number: string | null;
}

// ── Service ───────────────────────────────────────────────────

export const hotelBookingService = {
  list: (params?: { status?: string; search?: string; page?: number; page_size?: number }) =>
    apiClient
      .get<{ success: boolean; data: HotelBookingListResponse }>("/partners/me/hotel-bookings", { params })
      .then((r) => r.data.data),

  get: (id: number) =>
    apiClient
      .get<{ success: boolean; data: HotelBookingDetail }>(`/partners/me/hotel-bookings/${id}`)
      .then((r) => r.data.data),

  confirm: (id: number, hotel_confirmation_number?: string) =>
    apiClient
      .post(`/partners/me/hotel-bookings/${id}/confirm`, { hotel_confirmation_number })
      .then((r) => r.data),

  // ── Realtime accept/reject (fixed assignment popup) ──
  acceptBooking: (id: number) =>
    apiClient.post(`/partners/me/hotel-bookings/${id}/accept`).then((r) => r.data),

  rejectBooking: (id: number, reason: string) =>
    apiClient.post(`/partners/me/hotel-bookings/${id}/reject`, { reason }).then((r) => r.data),

  checkIn: (
    id: number,
    payload: {
      id_proof: string;
      id_number: string;
      actual_check_in_at?: string;
      room_ids?: number[];
      remarks?: string;
      /**
       * Set to true when the user explicitly confirmed a check-in date that
       * is more than 1 day away from the booked check-in date. The backend
       * returns 409 with `{code:"CHECKIN_DATE_MISMATCH", ...}` if the
       * mismatch is present and this flag is still false.
       */
      confirm_date_mismatch?: boolean;
    },
  ) => apiClient.post(`/partners/me/hotel-bookings/${id}/check-in`, payload).then((r) => r.data),

  markInHouse: (id: number) =>
    apiClient.post(`/partners/me/hotel-bookings/${id}/in-house`).then((r) => r.data),

  addCharges: (id: number, amount: number, description: string) =>
    apiClient.post(`/partners/me/hotel-bookings/${id}/add-charges`, { amount, description }).then((r) => r.data),

  recordAdvance: (id: number, payload: { amount: number; payment_mode: string; reference_number?: string; notes?: string }) =>
    apiClient.post(`/partners/me/hotel-bookings/${id}/record-advance`, payload).then((r) => r.data),

  checkOut: (id: number, payload: { additional_charges?: number; check_out_notes?: string; actual_check_out_at?: string }) =>
    apiClient.post(`/partners/me/hotel-bookings/${id}/check-out`, payload).then((r) => r.data),

  collectPayment: (id: number, payload: { amount: number; payment_mode: string; reference_number?: string }) =>
    apiClient.post(`/partners/me/hotel-bookings/${id}/collect-payment`, payload).then((r) => r.data),

  generateInvoice: (id: number) =>
    apiClient.post(`/partners/me/hotel-bookings/${id}/generate-invoice`).then((r) => r.data),

  markComplete: (id: number) =>
    apiClient.post(`/partners/me/hotel-bookings/${id}/complete`).then((r) => r.data),

  downloadInvoice: (id: number): Promise<Blob> =>
    apiClient
      .get(`/partners/me/hotel-bookings/${id}/download-invoice`, { responseType: "blob" })
      .then((r) => r.data),

  getAvailableRooms: (id: number) =>
    apiClient
      .get<{ success: boolean; data: { rooms_needed: number; data: AvailableRoom[] } }>(
        `/partners/me/hotel-bookings/${id}/available-rooms`
      )
      .then((r) => r.data.data),

  // ── Hotel switch / split-stay (Doc Ref: Hotel Switch Spec; Migration 0042) ──
  // Partners can't initiate a switch — only admins can — but they do see the
  // banner on a reservation that's been split, and a history list of switches
  // touching any of their hotels.

  /** Banner payload for one reservation. Always returns 200; `is_split_stay=false`
   *  means "no banner, render nothing". */
  getSwitchBanner: (id: number) =>
    apiClient
      .get<{ success: boolean; data: PartnerSwitchBanner }>(
        `/partners/me/hotel-bookings/${id}/switch-banner`,
      )
      .then((r) => r.data.data),

  /** Paginated list of switches touching any reservation in this partner's hotels. */
  listSwitchHistory: (params?: { hotel_id?: number; page?: number; page_size?: number }) =>
    apiClient
      .get<{ success: boolean; data: PartnerSwitchHistoryResponse }>(
        "/partners/me/hotel-bookings/switch-history",
        { params },
      )
      .then((r) => r.data.data),
};

// ── Switch banner / history types ─────────────────────────────

export interface PartnerSwitchBanner {
  is_split_stay: boolean;
  original_reservation_id?: number | null;
  related_reservation_number?: string | null;
  switched_at?: string | null;
  switched_reason?: string | null;
  split_advance_strategy?: string | null;
  advance_remaining: number;
  refund_pending: number;
}

export interface PartnerSwitchHistoryItem {
  id: number;
  split_type: "PRE_CHECKIN_SWITCH" | "POST_CHECKIN_SPLIT";
  original_reservation_id: number;
  original_reservation_number: string;
  original_hotel_id: number;
  new_reservation_id: number;
  new_reservation_number: string;
  new_hotel_id: number;
  nights_transferred: number;
  original_nights_consumed: number;
  original_final_amount: number;
  new_total_amount: number;
  refund_issued: number;
  advance_redistributed: number;
  advance_split_strategy: "ROLLOVER" | "NONE";
  created_at: string | null;
}

export interface PartnerSwitchHistoryResponse {
  items: PartnerSwitchHistoryItem[];
  page: number;
  page_size: number;
  total: number;
}
