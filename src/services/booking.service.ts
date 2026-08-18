// ============================================================
// WAYTERO PARTNER PORTAL — BOOKING SERVICE
// Endpoints: GET /partners/me/bookings, GET /partners/me/bookings/:bn
//            POST /partners/me/bookings/:bn/assign-driver
// ============================================================
import apiClient from "./api";

// ── List item ────────────────────────────────────────────────
export interface BookingListItem {
  booking_number: string;
  master_booking_number: string;
  master_booking_id: number;
  booking_status: string;
  trip_type: string | null;
  pickup_location: string | null;
  drop_location: string | null;
  pickup_datetime: string | null;
  journey_start_date: string | null;
  amount: number;
  partner_payout: number;
  customer_name: string;
  customer_mobile: string | null;
  vehicle_category: string | null;
  driver_id: number | null;
  driver_name: string | null;
  driver_mobile: string | null;
  vehicle_reg: string | null;
  assigned_at: string | null;
  // ── Acceptance gate (Doc Ref: BRD Part 3 §42) ──
  /** ISO timestamp by which the partner must accept; null when not pending. */
  acceptance_deadline: string | null;
  /** Derived acceptance status from the latest assignment. */
  acceptance_status: "PENDING" | "ACCEPTED" | "REJECTED" | "TIMEOUT" | null;
}

export interface BookingListResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
  items: BookingListItem[];
}

// ── Detail ───────────────────────────────────────────────────
export interface TimelineEvent {
  event_type: string;
  event_description: string;
  event_timestamp: string;
}

export interface AvailableDriver {
  id: number;
  driver_code: string;
  full_name: string;
  mobile: string;
  status: string;
  availability_status: string;
}

export interface AvailableVehicle {
  id: number;
  registration_number: string;
  make: string | null;
  model: string | null;
  color: string | null;
  status: string;
  category_name: string | null;
  availability_status: string;
}

export interface BookingDetail {
  booking_number: string;
  master_booking_number: string;
  master_booking_id: number;
  booking_status: string;
  master_status: string;
  trip_type: string | null;
  vehicle_category: string | null;
  pickup_location: string | null;
  drop_location: string | null;
  pickup_datetime: string | null;
  estimated_distance: number;
  estimated_amount: number;
  final_amount: number;
  partner_payout: number;
  city_name: string | null;
  journey_start_date: string | null;
  journey_end_date: string | null;
  payment_status: string;
  total_amount: number;
  total_paid_amount: number;
  remarks: string | null;
  customer_name: string;
  customer_mobile: string | null;
  customer_email: string | null;
  // Trip execution fields (driver assistance)
  trip_start_km: number | null;
  trip_end_km: number | null;
  trip_started_at: string | null;
  trip_ended_at: string | null;
  actual_distance: number | null;
  payment_mode: string | null;
  payment_collected_by: string | null;
  cash_pending_at: string | null;
  coupon_discount: number;
  advance_paid: number;
  invoice_number: string | null;
  assignment: {
    assignment_id: number;
    assigned_at: string | null;
    assignment_type: string | null;
    driver_id: number | null;
    driver_name: string | null;
    driver_mobile: string | null;
    driver_code: string | null;
    vehicle_id: number | null;
    vehicle_reg: string | null;
    vehicle_make: string | null;
    vehicle_model: string | null;
    vehicle_color: string | null;
    // ── Acceptance gate (Doc Ref: BRD Part 3 §42) ──
    accepted_at: string | null;
    rejected_at: string | null;
    rejection_reason_code: string | null;
    rejection_notes: string | null;
    acceptance_deadline: string | null;
  };
  // ── Acceptance gate top-level fields ──
  /** ISO timestamp by which the partner must accept; null when not pending. */
  acceptance_deadline: string | null;
  /** Derived acceptance status from the latest assignment. */
  acceptance_status: "PENDING" | "ACCEPTED" | "REJECTED" | "TIMEOUT" | null;
  /** Partner currently holding the acceptance window (should equal the
   *  authenticated partner's id when the gate is active). */
  pending_partner_id: number | null;
  timeline: TimelineEvent[];
  available_drivers: AvailableDriver[];
  available_vehicles: AvailableVehicle[];
}


// ── Advance Payment Types ─────────────────────────────────
export interface AdvanceSummary {
  id: number;
  receipt_number: string;
  amount: number;
  payment_mode: string;
  received_by: string;
  reference_note: string | null;
  status: string;
  collected_by_role: string;
  collected_at: string | null;
}

export interface AdvanceEligibility {
  booking_number: string;
  advance: AdvanceSummary | null;
  can_collect: boolean;
  blocked_reason: string | null;
  allowed_receivers: string[];
  modes_by_receiver: Record<string, string[]>;
  max_amount: number;
  is_assigned: boolean;
  has_driver: boolean;
}

// ── API ───────────────────────────────────────────────────────
export const bookingService = {
  listBookings: async (params?: {
    status?: string;
    trip_type?: string;
    page?: number;
    limit?: number;
  }): Promise<BookingListResponse> => {
    const res = await apiClient.get<BookingListResponse>("/partners/me/bookings", { params });
    return res.data;
  },

  getBookingDetail: async (bookingNumber: string): Promise<BookingDetail> => {
    // Cache-bust with timestamp so browser never serves a stale booking state
    // (payment_mode / invoice_number must always reflect live DB values)
    const res = await apiClient.get<BookingDetail>(`/partners/me/bookings/${bookingNumber}`, {
      params: { _t: Date.now() },
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
    });
    return res.data;
  },

  // ── Trip Assistance ──────────────────────────────────────
  startTrip: async (bookingNumber: string, payload: { start_km: number; start_datetime: string }) => {
    const res = await apiClient.post(`/partners/me/bookings/${bookingNumber}/start-trip`, payload);
    return res.data;
  },

  getPricing: async (bookingNumber: string, endKm?: number) => {
    const res = await apiClient.get(`/partners/me/bookings/${bookingNumber}/pricing`, {
      params: endKm !== undefined ? { end_km: endKm } : {},
    });
    return res.data;
  },

  closeTrip: async (
    bookingNumber: string,
    payload: { end_km: number; end_datetime: string; final_amount: number }
  ) => {
    const res = await apiClient.post(`/partners/me/bookings/${bookingNumber}/close-trip`, payload);
    return res.data;
  },

  getCustomerWallet: async (bookingNumber: string) => {
    const res = await apiClient.get(`/partners/me/bookings/${bookingNumber}/customer-wallet`);
    return res.data;
  },

  collectPayment: async (
    bookingNumber: string,
    payload: { payment_mode: string; payment_collected_by: string }
  ): Promise<{
    success: boolean;
    message: string;
    payment_mode: string;
    payment_collected_by: string;
    final_amount: number;
    coupon_discount: number;
    advance_paid: number;
    balance_due: number;
    platform_commission: number;
    partner_payout: number;
    cash_pending_at: string | null;
    invoice_number: string | null;
  }> => {
    const res = await apiClient.post(`/partners/me/bookings/${bookingNumber}/collect-payment`, payload);
    return res.data;
  },

  downloadInvoice: async (bookingNumber: string): Promise<Blob> => {
    const res = await apiClient.get(`/partners/me/bookings/${bookingNumber}/download-invoice`, {
      responseType: "blob",
    });
    return res.data;
  },

  assignDriver: async (
    bookingNumber: string,
    payload: { driver_id: number; vehicle_id: number }
  ): Promise<{ success: boolean; message: string; cab_status: string; driver_name: string; vehicle_reg: string }> => {
    const res = await apiClient.post(`/partners/me/bookings/${bookingNumber}/assign-driver`, payload);
    return res.data;
  },

  // ── Advance payment ──────────────────────────────────────
  getAdvanceEligibility: async (bookingNumber: string): Promise<AdvanceEligibility> => {
    const res = await apiClient.get<{ success: boolean; data: AdvanceEligibility }>(
      `/partners/me/bookings/${bookingNumber}/advance`
    );
    return res.data.data;
  },

  collectAdvance: async (
    bookingNumber: string,
    payload: { amount: number; payment_mode: string; received_by: string; reference_note?: string }
  ): Promise<{ receipt_number: string; amount: number; payment_mode: string; received_by: string; collected_at: string | null; fare: number; balance_after_advance: number }> => {
    const res = await apiClient.post(
      `/partners/me/bookings/${bookingNumber}/advance`,
      payload
    );
    return res.data.data;
  },

  downloadAdvanceReceipt: async (bookingNumber: string): Promise<Blob> => {
    const res = await apiClient.get(
      `/partners/me/bookings/${bookingNumber}/advance/receipt`,
      { responseType: "blob" }
    );
    return res.data as Blob;
  },

  // ── Partner Acceptance Gate (Doc Ref: BRD Part 3 §42) ──
  // Admin assigned this cab to the partner; the partner must accept before
  // driver assignment becomes possible. Rejection returns the cab to
  // PENDING_ASSIGNMENT so admin can reassign.
  acceptBooking: async (bookingNumber: string): Promise<{ success: boolean; message: string; cab_status: string }> => {
    const res = await apiClient.post(`/partners/me/bookings/${bookingNumber}/accept`);
    return res.data;
  },

  rejectBooking: async (
    bookingNumber: string,
    payload: { reason_code: string; notes?: string }
  ): Promise<{ success: boolean; message: string; cab_status: string }> => {
    const res = await apiClient.post(`/partners/me/bookings/${bookingNumber}/reject`, payload);
    return res.data;
  },

  /** Fetch the dropdown of reject reasons for the Reject dialog. */
  listRejectReasons: async (): Promise<Array<{ code: string; label: string }>> => {
    const res = await apiClient.get<{ success: boolean; data: Array<{ code: string; label: string }> }>(
      `/partners/me/reject-reasons`
    );
    return res.data.data;
  },

  // ── Breakdown / Swap (Doc Ref: Spec — Cab Breakdown → Vehicle Swap) ──
  /** GET /partners/me/breakdown/reasons — dropdown for the report dialog. */
  listBreakdownReasons: async (): Promise<Array<{ code: string; label: string }>> => {
    const res = await apiClient.get<{ success: boolean; data: Array<{ code: string; label: string }> }>(
      `/partners/me/breakdown/reasons`
    );
    return res.data.data;
  },

  /** POST /partners/me/bookings/{n}/report-breakdown */
  reportBreakdown: async (
    bookingNumber: string,
    payload: { reason_code: string; latitude?: number | null; longitude?: number | null; notes?: string | null }
  ): Promise<{ success: boolean; message: string; data: unknown }> => {
    const res = await apiClient.post(`/partners/me/bookings/${bookingNumber}/report-breakdown`, payload);
    return res.data;
  },

  /** POST /partners/me/bookings/{n}/swap-vehicle — self-serve swap. */
  swapVehicle: async (
    bookingNumber: string,
    payload: { new_vehicle_id: number; new_driver_id: number; notes?: string | null }
  ): Promise<{ success: boolean; message: string; data: unknown }> => {
    const res = await apiClient.post(`/partners/me/bookings/${bookingNumber}/swap-vehicle`, payload);
    return res.data;
  },
};

// ── Reject reason helpers (Doc Ref: BRD Part 3 §42) ──
export interface RejectReasonOption { code: string; label: string }
export const REJECT_REASON_OTHER = "OTHER";
