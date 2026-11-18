// ============================================================
// WAYTERO PARTNER PORTAL — DRIVER TRACKING SERVICE
// Endpoints:
//   GET  /partners/me/bookings/:bookingNumber/live-location
//   GET  /partners/me/distance-reviews
//   POST /partners/me/distance-reviews/:reviewId/resolve
// ============================================================
import apiClient from "./api";

export type TrafficLevel = "LIGHT" | "MODERATE" | "HEAVY" | "UNKNOWN";
export type DistanceReviewStatus =
  | "PENDING_REVIEW"
  | "ACCEPTED"
  | "REVIEWED"
  | "ALL";

export interface LiveLocation {
  booking_number: string;
  driver: {
    id: number | null;
    name: string | null;
    mobile: string | null;
  };
  vehicle_reg: string | null;
  location: {
    latitude: number;
    longitude: number;
    accuracy_m: number | null;
    speed_kmh: number;
    recorded_at: string | null;
    age_seconds: number | null;
    is_stale: boolean;
  } | null;
  traffic_level?: TrafficLevel;
  tracking_active: boolean;
  paused?: boolean;
  paused_seconds?: number;
  gps_distance_km?: number;
  odometer_distance_km?: number | null;
  trip_status?: string;
  message?: string;
}

export interface DistanceReview {
  id: number;
  booking_number: string;
  driver_id: number;
  driver_name: string;
  driver_code: string;
  odometer_km: number;
  gps_km: number;
  difference_km: number;
  difference_pct: number;
  status: Exclude<DistanceReviewStatus, "ALL">;
  review_note: string | null;
  created_at: string | null;
  trip_ended_at: string | null;
}

export interface DistanceReviewResponse {
  items: DistanceReview[];
  page: number;
}

export const trackingService = {
  getLiveLocation: async (bookingNumber: string): Promise<LiveLocation> => {
    const res = await apiClient.get<{
      success: boolean;
      message: string;
      data: LiveLocation;
    }>(`/partners/me/bookings/${encodeURIComponent(bookingNumber)}/live-location`);
    return res.data.data;
  },

  listDistanceReviews: async (params?: {
    status?: DistanceReviewStatus;
    page?: number;
    limit?: number;
  }): Promise<DistanceReviewResponse> => {
    const res = await apiClient.get<{
      success: boolean;
      message: string;
      data: DistanceReviewResponse;
    }>("/partners/me/distance-reviews", { params });
    return res.data.data;
  },

  resolveDistanceReview: async (
    reviewId: number,
    payload: { status: "ACCEPTED" | "REVIEWED"; note?: string | null },
  ): Promise<{ id: number; status: string }> => {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      data: { id: number; status: string };
    }>(`/partners/me/distance-reviews/${reviewId}/resolve`, payload);
    return res.data.data;
  },
};
