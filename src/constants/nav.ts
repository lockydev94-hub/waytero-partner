// ============================================================
// WAYTERO PARTNER PORTAL — NAVIGATION CONSTANTS
// Grouped sidebar sections + gating metadata shared by the
// DashboardLayout sidebar and the global search.
// ============================================================

export type PartnerService = "CAB" | "HOTEL" | "TOUR";

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  path: string;
  /** Keys into BookingCounts for the live badge on the sidebar. */
  badgeKey?: "actionable";
  /** Service type the partner must have to see this menu. */
  service?: PartnerService;
  /** Requires the platform-level GST switch to be enabled. */
  requiresGst?: boolean;
  keywords?: string;
}

export interface NavSection {
  key: string;
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    key: "overview",
    title: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "Dashboard", path: "/dashboard", keywords: "home overview stats analytics" },
    ],
  },
  {
    key: "operations",
    title: "Bookings & Operations",
    items: [
      { key: "bookings", label: "Bookings", icon: "BookOnline", path: "/dashboard/bookings", badgeKey: "actionable", keywords: "booking order trip new requests" },
      { key: "cash-collection", label: "Cash Collection", icon: "Payments", path: "/dashboard/cash-collection", service: "CAB", keywords: "cash collect payment trip fare" },
      { key: "hotel-switches", label: "Hotel Switches", icon: "SwapHoriz", path: "/dashboard/hotel-bookings/switch-history", service: "HOTEL", keywords: "switch transfer hotel move history" },
    ],
  },
  {
    key: "services",
    title: "Fleet & Services",
    items: [
      { key: "fleet", label: "Fleet", icon: "DirectionsCar", path: "/dashboard/fleet", service: "CAB", keywords: "fleet vehicles cab cars" },
      { key: "hotels", label: "Hotels", icon: "Hotel", path: "/dashboard/hotels", service: "HOTEL", keywords: "hotel stay property" },
      { key: "hotel-rooms", label: "Hotel Rooms", icon: "MeetingRoom", path: "/dashboard/hotels/rooms", service: "HOTEL", keywords: "rooms room inventory hotel" },
      { key: "tours", label: "Tours", icon: "TravelExplore", path: "/dashboard/tours", service: "TOUR", keywords: "tour package travel excursion" },
    ],
  },
  {
    key: "finance",
    title: "Finance",
    items: [
      { key: "wallet", label: "Wallet", icon: "AccountBalanceWallet", path: "/dashboard/wallet", keywords: "wallet balance money" },
      { key: "gst-challan", label: "GST Challan", icon: "Receipt", path: "/dashboard/gst-challan", requiresGst: true, keywords: "gst challan tax receipt" },
    ],
  },
  {
    key: "insights",
    title: "Insights",
    items: [
      { key: "analytics", label: "Analytics", icon: "Analytics", path: "/dashboard/analytics", keywords: "analytics reports stats insights" },
    ],
  },
];

export const BOTTOM_NAV: NavItem[] = [
  { key: "settings", label: "Settings", icon: "Settings", path: "/dashboard/settings", keywords: "settings preferences configuration" },
];
