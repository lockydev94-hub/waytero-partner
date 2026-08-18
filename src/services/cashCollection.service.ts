// ============================================================
// WAYTERO PARTNER PORTAL — DRIVER CASH COLLECTION SERVICE
// Endpoints: GET  /partners/me/cash-collection/drivers
//            GET  /partners/me/cash-collection/drivers/:id/pending
//            POST /partners/me/cash-collection/collect
//            GET  /partners/me/cash-collection/history
//
// Domain: a driver who takes CASH from a customer holds it until the
// partner collects it. Collecting flips cash_pending_at DRIVER → PARTNER.
// ============================================================
import apiClient from "./api";

// ── Driver summary ───────────────────────────────────────────
export interface DriverCashSummary {
  driver_id: number;
  driver_code: string | null;
  driver_name: string;
  driver_mobile: string | null;
  driver_status: string | null;
  pending_count: number;
  pending_amount: number;
  oldest_pending_at: string | null;
  vehicle_reg: string | null;
}

export interface DriverCashSummaryResponse {
  total_drivers: number;
  total_pending_amount: number;
  total_pending_count: number;
  drivers: DriverCashSummary[];
}

// ── Pending records for one driver ───────────────────────────
export interface PendingCashBooking {
  cab_booking_id: number;
  booking_number: string;
  master_booking_number: string;
  booking_status: string;
  trip_type: string | null;
  pickup_location: string | null;
  drop_location: string | null;
  customer_name: string;
  customer_mobile: string | null;
  trip_ended_at: string | null;
  final_amount: number;
  cash_amount: number;
  platform_commission: number;
  partner_payout: number;
  invoice_number: string | null;
  vehicle_reg: string | null;
}

export interface DriverPendingResponse {
  driver_id: number;
  driver_code: string | null;
  driver_name: string;
  driver_mobile: string | null;
  pending_count: number;
  pending_amount: number;
  bookings: PendingCashBooking[];
}

// ── Collect ──────────────────────────────────────────────────
export interface CollectRequest {
  driver_id: number;
  cab_booking_ids: number[];
  entered_amount: number;
  payment_method: string;
  reference_note?: string | null;
}

export interface CollectResponse {
  success: boolean;
  message: string;
  collection_number: string;
  driver_id: number;
  driver_name: string;
  bookings_count: number;
  expected_amount: number;
  collected_amount: number;
  booking_numbers: string[];
  collected_at: string;
}

// ── History ──────────────────────────────────────────────────
export interface CollectionHistoryItem {
  id: number;
  collection_number: string;
  driver_id: number;
  driver_name: string;
  driver_mobile: string | null;
  bookings_count: number;
  expected_amount: number;
  collected_amount: number;
  payment_method: string;
  status: string;
  reference_note: string | null;
  collected_at: string;
  booking_numbers: string[];
}

export interface CollectionHistoryResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
  items: CollectionHistoryItem[];
}

// ── API ──────────────────────────────────────────────────────
export const cashCollectionService = {
  listDrivers: async (search?: string): Promise<DriverCashSummaryResponse> => {
    const res = await apiClient.get<DriverCashSummaryResponse>(
      "/partners/me/cash-collection/drivers",
      { params: search ? { search } : {} }
    );
    return res.data;
  },

  getDriverPending: async (driverId: number): Promise<DriverPendingResponse> => {
    const res = await apiClient.get<DriverPendingResponse>(
      `/partners/me/cash-collection/drivers/${driverId}/pending`
    );
    return res.data;
  },

  collect: async (payload: CollectRequest): Promise<CollectResponse> => {
    const res = await apiClient.post<CollectResponse>(
      "/partners/me/cash-collection/collect",
      payload
    );
    return res.data;
  },

  getHistory: async (params?: {
    driver_id?: number;
    page?: number;
    limit?: number;
  }): Promise<CollectionHistoryResponse> => {
    const res = await apiClient.get<CollectionHistoryResponse>(
      "/partners/me/cash-collection/history",
      { params }
    );
    return res.data;
  },
};
