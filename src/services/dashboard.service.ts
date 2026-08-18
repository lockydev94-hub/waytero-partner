// ============================================================
// WAYTERO PARTNER PORTAL — DASHBOARD SERVICE
// GET /partners/me/dashboard
//
// The dashboard endpoint returns a fully merged Cab + Hotel + Tour payload
// (hotels, hotel_bookings, tour_bookings, services, recent_hotel_bookings,
// recent_tour_bookings, combined revenue chart). The shape is defined in
// analytics.service.ts (which originally grew out of this page) and
// re-exported here under the historical names so the /dashboard page imports
// keep working.
// ============================================================
import apiClient from "./api";
import {
  analyticsService,
  type AnalyticsDashboard,
  type RecentBooking,
  type HotelRecentBooking,
  type TourRecentBooking,
  type RecentBookingRow,
} from "./analytics.service";

// Public re-exports — keep DashboardPage's import surface stable.
type WithPending<T extends { revenue_this_month: number }> = T & {
  revenue_pending_this_month: number;
};

export interface DashboardPartner {
  id: number;
  partner_code: string;
  owner_name: string;
  business_name: string | null;
  status: string;
  logo_url: string | null;
}

export interface DashboardWallet {
  available_balance: number;
  wallet_status: string;
}

export interface DashboardVehicles {
  total: number;
  active: number;
  pending: number;
}

export interface DashboardBookings {
  total: number;
  this_month: number;
  completed: number;
  cancelled: number;
  revenue_this_month: number;
  revenue_pending_this_month: number;
}

export interface DashboardHotels {
  total: number;
  active: number;
  pending: number;
}

export interface DashboardHotelBookings {
  total: number;
  this_month: number;
  completed: number;
  cancelled: number;
  revenue_this_month: number;
  revenue_pending_this_month: number;
}

export interface DashboardTourBookings {
  total: number;
  this_month: number;
  completed: number;
  cancelled: number;
  revenue_this_month: number;
  revenue_pending_this_month: number;
}

export interface RevenueChartPoint {
  month: string;
  revenue: number;
}

export type PartnerDashboard = {
  partner: DashboardPartner | null;
  wallet: DashboardWallet;
  vehicles: DashboardVehicles;
  bookings: DashboardBookings;
  hotels: DashboardHotels;
  hotel_bookings: DashboardHotelBookings;
  tour_bookings: DashboardTourBookings;
  services: string[];
  recent_bookings: RecentBooking[];
  recent_hotel_bookings: HotelRecentBooking[];
  recent_tour_bookings: TourRecentBooking[];
  revenue_chart: RevenueChartPoint[];
};

// The richer AnalyticsDashboard shape used by /dashboard/analytics is the
// authoritative source of truth for the merged payload. DashboardHistory
// consumers (this file) can use either alias.
export type {
  AnalyticsDashboard,
  RecentBooking,
  HotelRecentBooking,
  TourRecentBooking,
  RecentBookingRow,
};

export const dashboardService = {
  getDashboard: async (months = 6): Promise<PartnerDashboard> => {
    return analyticsService.getDashboard(months) as unknown as Promise<PartnerDashboard>;
  },
};
