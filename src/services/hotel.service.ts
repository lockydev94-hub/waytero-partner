// ============================================================
// WAYTERO PARTNER PORTAL — HOTEL SERVICE
// Doc Ref: BRD Part 4 §59-§65, API Doc 09_HOTEL_API
// Endpoints: /admin/hotels (partner-scoped reads + room status)
// ============================================================
import apiClient from "./api";

// ── Types ────────────────────────────────────────────────────

export interface HotelDetail {
  id: number;
  uuid: string;
  hotel_code: string;
  hotel_name: string;
  hotel_type: string | null;
  hotel_category_id: number | null;
  category_label: string | null;
  star_rating: number | null;
  status: string;
  partner_id: number;
  partner_name: string | null;
  city_id: number;
  city_name: string | null;
  state_id: number | null;
  state_name: string | null;
  total_rooms: number;
  room_category_count: number;
  image_count: number;
  document_count: number;
  is_own_risk_approved: boolean;
  is_featured: boolean;
  rejection_reason: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
  readiness: ReadinessReport;
  allowed_transitions: string[];
}

export interface ReadinessReport {
  completeness_percent: number;
  can_submit: boolean;
  can_approve: boolean;
  checks: ReadinessItem[];
}

export interface ReadinessItem {
  key: string;
  label: string;
  passed: boolean;
  blocks_submit: boolean;
  blocks_approve: boolean;
  hint: string | null;
}

export interface HotelImage {
  id: number;
  hotel_id: number;
  image_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  image_type: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface HotelDocument {
  id: number;
  hotel_id: number;
  document_type: string;
  document_number: string | null;
  file_url: string;
  issue_date: string | null;
  expiry_date: string | null;
  verification_status: string;
  remarks: string | null;
  uploaded_at: string;
  verified_at: string | null;
}

export interface HotelPolicy {
  id: number;
  hotel_id: number;
  check_in_time: string | null;
  check_out_time: string | null;
  early_check_in_allowed: boolean;
  late_check_out_allowed: boolean;
  cancellation_free_hours: number | null;
  refund_percent_tier_1: string | null;
  cancellation_tier_2_hours: number | null;
  refund_percent_tier_2: string | null;
  cancellation_tier_3_hours: number | null;
  refund_percent_tier_3: string | null;
  refund_percent_same_day: string | null;
  no_show_refund_percent: string | null;
  couples_allowed: boolean;
  unmarried_couples_allowed: boolean;
  local_id_accepted: boolean;
  pets_allowed: boolean;
  smoking_allowed: boolean;
  alcohol_allowed: boolean;
  min_guest_age: number | null;
  extra_bed_charge: string | null;
  child_free_age_limit: number | null;
  house_rules: string | null;
  cancellation_policy_text: string | null;
}

export interface RoomCategory {
  id: number;
  hotel_id: number;
  category_name: string;
  room_type: string | null;
  description: string | null;
  base_occupancy: number;
  max_adults: number;
  max_children: number;
  max_occupancy: number;
  extra_bed_allowed: boolean;
  extra_bed_charge: string;
  extra_adult_charge: string;
  extra_child_charge: string;
  bed_type: string | null;
  room_size_sqft: number | null;
  view_type: string | null;
  floor_range: string | null;
  base_price: string;
  published_price: string | null;
  min_sellable_price: string | null;
  meal_plan: string;
  is_refundable: boolean;
  total_rooms: number;
  display_order: number;
  is_active: boolean;
  images: RoomCategoryImage[];
  amenity_ids: number[];
  rate_plan_count: number;
  physical_room_count: number;
}

export interface RoomCategoryImage {
  id: number;
  room_category_id: number;
  image_url: string;
  caption: string | null;
  display_order: number;
  is_primary: boolean;
}

export interface RoomActiveReservation {
  reservation_id: number;
  reservation_number: string | null;
  guest_name: string | null;
  check_out_date: string | null;
  status: string;
}

export interface HotelRoom {
  id: number;
  hotel_id: number;
  room_category_id: number;
  room_number: string;
  floor_number: string | null;
  room_status: string;
  remarks: string | null;
  is_active: boolean;
  /** Present when this room is currently held by a CHECKED_IN/IN_HOUSE
   *  reservation. Drives the lock indicator on the partner portal. */
  active_reservation?: RoomActiveReservation | null;
}

// ── Service ───────────────────────────────────────────────────

export const hotelService = {
  getHotel: (hotelId: number) =>
    apiClient.get<HotelDetail>(`/admin/hotels/${hotelId}`).then(r => r.data),

  getImages: (hotelId: number) =>
    apiClient.get<HotelImage[]>(`/admin/hotels/${hotelId}/images`).then(r => r.data),

  getDocuments: (hotelId: number) =>
    apiClient.get<HotelDocument[]>(`/admin/hotels/${hotelId}/documents`).then(r => r.data),

  getPolicy: (hotelId: number) =>
    apiClient.get<HotelPolicy>(`/admin/hotels/${hotelId}/policies`).then(r => r.data),

  getRoomCategories: (hotelId: number) =>
    apiClient.get<RoomCategory[]>(`/admin/hotels/${hotelId}/room-categories`).then(r => r.data),

  getRooms: (hotelId: number, roomCategoryId?: number) => {
    const params = roomCategoryId ? { room_category_id: roomCategoryId } : {};
    return apiClient.get<HotelRoom[]>(`/admin/hotels/${hotelId}/rooms`, { params }).then(r => r.data);
  },

  /** Every physical room across every hotel the caller can access. The backend
   *  scopes to the caller's own partner hotels when the caller is PARTNER-only,
   *  so the partner portal does not need a second hotel-list call to filter.
   *  Each room carries its active_reservation (lock state) so the lock
   *  indicator renders without a second lookup.
   *
   *  Note: the endpoint returns a bare array (matches `GET /admin/hotels/{id}/rooms`),
   *  not the standard success envelope — so we unwrap `r.data` once, not twice. */
  listAllRooms: () =>
    apiClient
      .get<HotelRoom[]>(`/admin/hotels/rooms/all`)
      .then(r => r.data ?? []),

  updateRoomStatus: (hotelId: number, roomId: number, room_status: string, remarks?: string) =>
    apiClient
      .patch<{ success: boolean; message: string; data: HotelRoom }>(
        `/admin/hotels/${hotelId}/rooms/${roomId}/status`,
        { room_status, remarks: remarks ?? null }
      )
      .then(r => r.data.data),
};
