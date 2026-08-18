// ============================================================
// WAYTERO PARTNER PORTAL — ANALYTICS SERVICE
// Doc Ref: Partner Analytics §23-28 | Partner API §/me/dashboard
//
// Primary endpoint: GET /partners/me/dashboard?months=N
//   Returns: partner, wallet, vehicles, bookings, hotel_bookings,
//            tour_bookings, recent_bookings, recent_hotel_bookings,
//            recent_tour_bookings, revenue_chart
//
// Secondary: GET /partners/me/wallet (wallet summary + ledger)
// ============================================================
import apiClient from "./api";

export interface AnalyticsDashboard {
  partner: {
    id: number;
    partner_code: string;
    owner_name: string;
    business_name: string | null;
    status: string;
    logo_url: string | null;
  } | null;
  wallet: {
    available_balance: number;
    wallet_status: string;
  };
  vehicles: {
    total: number;
    active: number;
    pending: number;
  };
  /** Cab-only booking stats. The cab booking system uses cab_booking_assignments
   *  with partner_payout/final_amount; this object never includes hotel data.
   *  revenue_this_month is the SETTLED amount (admin-cleared). revenue_pending_this_month
   *  is COMPLETED + SETTLEMENT_PENDING — trip done, payment collected, awaiting admin. */
  bookings: {
    total: number;
    this_month: number;
    completed: number;
    cancelled: number;
    revenue_this_month: number;
    revenue_pending_this_month: number;
  };
  /** Hotel counts for this partner, mirroring the cab `vehicles` shape. */
  hotels: {
    total: number;
    active: number;
    pending: number;
  };
  /** Hotel reservation stats, mirroring the cab `bookings` shape. SETTLED rows
   *  use hr.partner_payout; COMPLETED rows (payment_collected_status='PAID')
   *  use hr.total_amount because partner_payout is 0 until settlement freezes it. */
  hotel_bookings: {
    total: number;
    this_month: number;
    completed: number;
    cancelled: number;
    revenue_this_month: number;
    revenue_pending_this_month: number;
  };
  /** Tour booking stats, mirroring the cab `bookings` shape. A tour booking
   *  belongs to a package which belongs to the partner. SETTLED rows use
   *  tb.partner_payout; COMPLETED rows (payment_status='PAID') use total_amount
   *  because partner_payout is 0 until settlement freezes it. */
  tour_bookings: {
    total: number;
    this_month: number;
    completed: number;
    cancelled: number;
    revenue_this_month: number;
    revenue_pending_this_month: number;
  };
  /** Active service codes the partner has enabled: ["CAB"], ["HOTEL"], ["TOUR"], or any combination. */
  services: string[];
  /** Cab-only recent bookings (last 10). */
  recent_bookings: RecentBooking[];
  /** Hotel recent reservations (last 10). Merged with recent_bookings on render. */
  recent_hotel_bookings: HotelRecentBooking[];
  /** Tour recent bookings (last 10). Merged with recent_bookings on render. */
  recent_tour_bookings: TourRecentBooking[];
  /** Combined cab + hotel + tour revenue per month — summed in SQL. */
  revenue_chart: { month: string; revenue: number }[];
}

export interface RecentBooking {
  booking_number: string;
  booking_status: string;
  trip_type: string | null;
  pickup_location: string | null;
  drop_location: string | null;
  pickup_datetime: string | null;
  partner_payout: number;
  final_amount: number;
  journey_start_date: string | null;
  customer_name: string;
  customer_mobile: string | null;
}

export interface HotelRecentBooking {
  reservation_number: string;
  reservation_status: string;
  hotel_name: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  total_amount: number;
  rooms_count: number | null;
  adults_count: number | null;
  customer_name: string;
  customer_mobile: string | null;
  created_at: string | null;
}

export interface TourRecentBooking {
  booking_number: string;
  booking_status: string;
  package_name: string | null;
  destination: string | null;
  travel_start_date: string | null;
  travel_end_date: string | null;
  persons_count: number | null;
  total_amount: number;
  partner_payout: number;
  customer_name: string;
  customer_mobile: string | null;
  created_at: string | null;
}

/** Discriminated union used by the combined "Recent Bookings" table. */
export type RecentBookingRow =
  | ({ service_type: "CAB" } & RecentBooking)
  | ({ service_type: "HOTEL" } & HotelRecentBooking)
  | ({ service_type: "TOUR" } & TourRecentBooking);

export interface WalletSummary {
  total_credited: number;
  total_debited: number;
  settlement_credits: number;
  commission_debits: number;
  recharge_credits: number;
  ledger_count: number;
}

export const analyticsService = {
  /** GET /partners/me/dashboard?months=N */
  getDashboard: (months = 6): Promise<AnalyticsDashboard> =>
    apiClient.get("/partners/me/dashboard", { params: { months } }).then((r) => r.data),

  /** GET /partners/me/wallet — for wallet summary stats */
  getWalletSummary: (): Promise<WalletSummary> =>
    apiClient.get("/partners/me/wallet", { params: { page: 1, page_size: 1 } })
      .then((r) => r.data?.summary ?? {
        total_credited: 0,
        total_debited: 0,
        settlement_credits: 0,
        commission_debits: 0,
        recharge_credits: 0,
        ledger_count: 0,
      }),
};
