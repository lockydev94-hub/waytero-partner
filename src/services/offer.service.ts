// ============================================================
// WAYTERO PARTNER PORTAL — MY OFFERS SERVICE
// Endpoints: /partners/offers (migration 0077)
// Offers are marketing wrappers over coupons; this portal view lets
// the partner adjust their hotel's room types (≥1) and request to
// leave an offer (admin approves).
// ============================================================
import apiClient from "./api";

export interface OfferRoomType {
  id: number;
  name: string;
  included: boolean;
}

export interface OfferLink {
  kind: "hotel" | "tour";
  id: number;
  name: string;
  status: "ACTIVE" | "EXIT_REQUESTED";
  exit_requested_at: string | null;
  exit_reason: string | null;
  room_types?: OfferRoomType[];
}

export interface MyOffer {
  offer_id: number;
  slug: string;
  title: string;
  service_type: string;
  image_url: string;
  valid_from: string;
  valid_to: string;
  is_published: boolean;
  coupon_code: string;
  links: OfferLink[];
}

export const partnerOfferService = {
  list: (): Promise<MyOffer[]> =>
    apiClient.get<MyOffer[]>("/partners/offers").then((r) => r.data),

  setRoomTypes: (offerId: number, hotelId: number, roomCategoryIds: number[]) =>
    apiClient
      .put(`/partners/offers/${offerId}/hotels/${hotelId}/room-types`, {
        room_category_ids: roomCategoryIds,
      })
      .then((r) => r.data),

  requestHotelExit: (offerId: number, hotelId: number, reason: string) =>
    apiClient
      .post(`/partners/offers/${offerId}/hotels/${hotelId}/exit-request`, { reason })
      .then((r) => r.data),

  requestTourExit: (offerId: number, tourPackageId: number, reason: string) =>
    apiClient
      .post(`/partners/offers/${offerId}/tours/${tourPackageId}/exit-request`, { reason })
      .then((r) => r.data),
};
