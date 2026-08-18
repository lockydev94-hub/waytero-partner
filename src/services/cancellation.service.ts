// ============================================================
// WAYTERO PARTNER — CANCELLATION REQUEST SERVICE
// Doc Ref: BRD Part 3 §46
// Partners cannot cancel directly — they submit a request, admin acts.
// ============================================================
import apiClient from "./api";

export interface PartnerCancelPreview {
  cab_booking_id?: number;
  hotel_reservation_id?: number;
  tour_booking_id?: number;
  master_booking_id: number;
  charge: number;
  refund_amount: number;
  refund_percent: number;
  tier_label: string;
  policy_snapshot: Record<string, unknown>;
  advance_paid_total?: number;
  is_post_assignment?: boolean;
}

export interface PartnerCancelRequest {
  id: number;
  booking_type: "CAB" | "HOTEL" | "TOUR";
  master_booking_id: number | null;
  cab_booking_id: number | null;
  hotel_reservation_id: number | null;
  tour_booking_id: number | null;
  master_booking_number: string | null;
  cab_booking_number: string | null;
  hotel_reservation_number: string | null;
  tour_booking_number: string | null;
  requested_reason: string;
  requested_reason_code: string | null;
  refund_preview_json: PartnerCancelPreview | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN" | "AUTO_CLOSED";
  requested_at: string;
  reviewed_at: string | null;
  review_note: string | null;
}

const base = "/partners";

export const partnerCancellationService = {
  // Submit
  requestCab: (cab_booking_number: string, payload: { reason: string; reason_code?: string }) =>
    apiClient.post<{ success: boolean; message: string; request_id: number; preview: PartnerCancelPreview }>(
      `${base}/me/bookings/${cab_booking_number}/cancellation-request`, payload,
    ).then(r => r.data),

  requestHotel: (reservation_id: number, payload: { reason: string; reason_code?: string }) =>
    apiClient.post<{ success: boolean; message: string; request_id: number; preview: PartnerCancelPreview }>(
      `${base}/me/hotel-bookings/${reservation_id}/cancellation-request`, payload,
    ).then(r => r.data),

  requestTour: (tour_booking_id: number, payload: { reason: string; reason_code?: string }) =>
    apiClient.post<{ success: boolean; message: string; request_id: number; preview: PartnerCancelPreview }>(
      `${base}/me/tour-bookings/${tour_booking_id}/cancellation-request`, payload,
    ).then(r => r.data),

  // Inbox
  listMy: (status?: string) =>
    apiClient.get<PartnerCancelRequest[]>(`${base}/me/cancellation-requests`, {
      params: status ? { status } : undefined,
    }).then(r => r.data),

  // Withdraw
  withdraw: (request_id: number, note?: string) =>
    apiClient.post<{ success: boolean; message: string; request_id: number; status: string }>(
      `${base}/me/cancellation-requests/${request_id}/withdraw`, { note },
    ).then(r => r.data),
};
