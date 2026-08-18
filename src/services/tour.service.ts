import apiClient from "./api";

export interface PartnerTourItinerary {
  id?: number;
  day_number: number;
  title: string;
  description?: string | null;
  activities: string[];
  overnight_city_id?: number | null;
}
export interface PartnerTourPricing {
  id?: number;
  persons_count: number;
  package_price: number;
  effective_from?: string | null;
  effective_to?: string | null;
}
export interface PartnerTourMedia {
  id?: number;
  media_url: string;
  caption?: string | null;
  is_primary?: boolean;
}
export interface PartnerTourPolicy {
  id: number | null;
  tour_package_id: number;
  cancellation_free_days: number;
  cancellation_tier_1_days: number;
  refund_percent_tier_1: number;
  cancellation_tier_2_days: number;
  refund_percent_tier_2: number;
  refund_percent_tier_3: number;
  refund_percent_last_minute: number;
  cancellation_policy_text: string | null;
  updated_at: string | null;
  has_policy: boolean;
}

export interface PartnerTourPackage {
  id: number;
  package_code: string;
  package_name: string;
  package_type?: string;
  destination: string;
  city_id: number;
  city_name?: string;
  duration_days: number;
  duration_nights: number;
  minimum_persons: number;
  maximum_persons?: number | null;
  status: string;
  short_description?: string | null;
  description?: string | null;
  terms_and_conditions?: string | null;
  rejection_reason?: string | null;
  itinerary: PartnerTourItinerary[];
  inclusions: Array<{ text: string }>;
  exclusions: Array<{ text: string }>;
  pricing: PartnerTourPricing[];
  media: PartnerTourMedia[];
  submitted_at?: string | null;
  approved_at?: string | null;
  activated_at?: string | null;
  created_at?: string;
}

export interface PartnerTourBooking {
  id: number;
  booking_number: string;
  master_booking_id: number;
  master_booking_number: string;
  package_id: number;
  package_name: string;
  destination?: string | null;
  customer_id: number;
  customer_name?: string | null;
  customer_mobile?: string | null;
  travel_start_date: string;
  travel_end_date: string;
  persons_count: number;
  total_amount: number;
  platform_commission: number;
  partner_payout: number;
  payment_status: string;
  booking_status: string;
  created_at: string;
}

export interface PartnerTourParticipant {
  id: number;
  participant_name: string;
  mobile?: string | null;
  age?: number | null;
  gender?: string | null;
  id_type?: string | null;
  id_number?: string | null;
}

export interface TourTimelineEvent {
  event_type: string;
  event_description: string;
  event_timestamp: string;
}

export interface PartnerTourBookingDetail {
  id: number;
  uuid: string;
  booking_number: string;
  master_booking_id: number;
  master_booking_number: string;
  package: {
    id: number;
    package_code: string;
    package_name: string;
    destination: string;
    duration_days: number;
    duration_nights: number;
    minimum_persons: number;
    maximum_persons: number | null;
    slug: string;
  };
  customer: {
    id: number;
    name: string;
    mobile: string | null;
    email: string | null;
  };
  travel_start_date: string;
  travel_end_date: string;
  persons_count: number;
  total_amount: number;
  platform_commission: number;
  partner_payout: number;
  payment_status: string;
  booking_status: string;
  special_requests: string | null;
  participants: PartnerTourParticipant[];
  timeline: TourTimelineEvent[];
  created_at: string;
  updated_at: string;
}

export interface PartnerTourStats {
  active: number;
  pending_review: number;
  draft: number;
  rejected: number;
  suspended?: number;
  total_packages: number;
  total_bookings: number;
  revenue_lifetime: number;
}

// ── Manage payload (GET /partners/tours/bookings/{id}/manage) ──

export interface TourManageFleetVehicle {
  id: number;
  registration_number: string;
  vehicle_brand?: string | null;
  vehicle_model?: string | null;
  seating_capacity?: number | null;
}

export interface TourManageFleetDriver {
  id: number;
  full_name: string;
  mobile?: string | null;
}

export interface TourManageAdvance {
  id: number;
  receipt_number: string;
  amount: number;
  payment_mode: string;
  received_by: string;
  reference_number?: string | null;
  notes?: string | null;
  status: string;
  collected_by_role?: string | null;
  collected_at?: string | null;
  void_reason?: string | null;
}

export interface TourManageCharge {
  id: number;
  label: string;
  amount: number;
  reason?: string | null;
  added_by_role?: string | null;
  created_at?: string | null;
}

export interface PartnerTourManagePayload {
  id: number;
  booking_number: string;
  master_booking_id: number;
  package_id: number;
  package_name?: string | null;
  destination?: string | null;
  duration_days?: number | null;
  duration_nights?: number | null;
  partner_name?: string | null;
  travel_start_date?: string | null;
  travel_end_date?: string | null;
  pickup_location?: string | null;
  pickup_datetime?: string | null;
  persons_count: number;
  total_amount: number;
  platform_commission: number;
  partner_payout: number;
  additional_amount: number;
  additional_charge_note?: string | null;
  advance_total: number;
  advance_received_by?: string | null;
  payment_status: string;
  booking_status: string;
  invoice_number?: string | null;
  invoiced_at?: string | null;
  hotel_details?: string | null;
  other_details?: string | null;
  special_requests?: string | null;
  vehicle?: {
    id: number;
    registration_number: string;
    vehicle_brand?: string | null;
    vehicle_model?: string | null;
    seating_capacity?: number | null;
    driver_name?: string | null;
  } | null;
  driver?: { id: number; full_name: string; mobile?: string | null } | null;
  advances: TourManageAdvance[];
  charges: TourManageCharge[];
  fleet?: { vehicles: TourManageFleetVehicle[]; drivers: TourManageFleetDriver[] };
}

export const tourService = {
  list: () => apiClient.get<PartnerTourPackage[]>("/partners/tours/packages").then(r => r.data),
  get: (id: number) => apiClient.get<PartnerTourPackage>(`/partners/tours/packages/${id}`).then(r => r.data),
  create: (data: any) => apiClient.post<PartnerTourPackage>("/partners/tours/packages", data).then(r => r.data),
  update: (id: number, data: any) => apiClient.patch<PartnerTourPackage>(`/partners/tours/packages/${id}`, data).then(r => r.data),
  submit: (id: number) => apiClient.post<PartnerTourPackage>(`/partners/tours/packages/${id}/submit`).then(r => r.data),
  getCities: () => apiClient.get<any[]>("/partners/tours/cities").then(r => r.data).catch(() => []),
  getStats: () => apiClient.get<PartnerTourStats>("/partners/tours/stats").then(r => r.data),
  getBookings: (packageIdOrParams?: number | {
    package_id?: number;
    status?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }) => {
    const params = typeof packageIdOrParams === "number"
      ? { package_id: packageIdOrParams }
      : packageIdOrParams;
    return apiClient.get<{ items: PartnerTourBooking[]; total: number; page: number; pages: number }>(
      "/partners/tours/bookings", { params }
    ).then(r => r.data);
  },

  /** Full tour booking detail (package, customer, participants, timeline). */
  getTourBooking: (id: number) =>
    apiClient.get<PartnerTourBookingDetail>(`/partners/tours/bookings/${id}`).then(r => r.data),

  /** Partner-managed tour lifecycle: CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED. */
  updateTourBookingStatus: (id: number, status: string, reason?: string) =>
    apiClient.post(`/partners/tours/bookings/${id}/status`, { status, reason }).then(r => r.data),

  // ── Realtime accept/reject (fixed assignment popup) ──
  acceptTourBooking: (id: number) =>
    apiClient.post(`/partners/tours/bookings/${id}/status`, { status: "CONFIRMED" }).then(r => r.data),

  rejectTourBooking: (id: number, reason: string) =>
    apiClient.post(`/partners/tours/bookings/${id}/status`, { status: "CANCELLED", reason }).then(r => r.data),

  // ── Manage (advance / fleet / trip / charges / invoice) ────────
  /** Full manage payload — advances, charges, fleet, money split. */
  getTourBookingManage: (id: number) =>
    apiClient.get<PartnerTourManagePayload>(`/partners/tours/bookings/${id}/manage`).then(r => r.data),

  collectAdvance: (id: number, payload: {
    amount: number;
    payment_mode: string;
    received_by?: string;
    reference_number?: string;
    notes?: string;
  }) => apiClient.post(`/partners/tours/bookings/${id}/advance`, payload).then(r => r.data),

  voidAdvance: (id: number, advanceId: number, reason: string) =>
    apiClient.post(`/partners/tours/bookings/${id}/advance/${advanceId}/void`, { reason }).then(r => r.data),

  assignVehicle: (id: number, payload: { vehicle_id?: number | null; driver_id?: number | null }) =>
    apiClient.post(`/partners/tours/bookings/${id}/vehicle`, payload).then(r => r.data),

  updateTrip: (id: number, payload: Record<string, unknown>) =>
    apiClient.patch(`/partners/tours/bookings/${id}`, payload).then(r => r.data),

  addCharge: (id: number, payload: { label: string; amount: number; reason?: string }) =>
    apiClient.post(`/partners/tours/bookings/${id}/charges`, payload).then(r => r.data),

  /** Stream the advance receipt PDF (browser download). */
  downloadAdvanceReceipt: async (id: number, advanceId: number, receiptNumber: string) => {
    const res = await apiClient.get(`/partners/tours/bookings/${id}/advance/${advanceId}/receipt`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${receiptNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
  },

  /** Generate + stream the booking invoice PDF (browser download). */
  downloadInvoice: async (id: number) => {
    const res = await apiClient.get(`/partners/tours/bookings/${id}/invoice`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `tour-invoice-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
  },

  /** Stream the tour itinerary PDF (customer + booking + day-by-day plan + payment + fleet). */
  downloadItinerary: async (id: number) => {
    const res = await apiClient.get(`/partners/tours/bookings/${id}/itinerary`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `tour-itinerary-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── Cancellation policy (per-package ladder, BRD Part 5 §119) ──
  getCancellationPolicy: (packageId: number) =>
    apiClient.get<PartnerTourPolicy>(`/partners/tours/packages/${packageId}/cancellation-policy`).then(r => r.data),

  updateCancellationPolicy: (packageId: number, payload: Partial<PartnerTourPolicy>) =>
    apiClient.put<{ success: boolean; message: string; tour_package_id: number }>(
      `/partners/tours/packages/${packageId}/cancellation-policy`,
      payload,
    ).then(r => r.data),
};
