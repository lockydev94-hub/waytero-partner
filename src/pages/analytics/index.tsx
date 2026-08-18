// ============================================================
// WAYTERO PARTNER PORTAL — ANALYTICS PAGE
// Primary endpoint: GET /partners/me/dashboard?months=N
// Secondary:        GET /partners/me/wallet (summary)
//
// Layout:
//   Row 1 — KPI cards (Revenue, Cab Bookings, Hotel Bookings, Fleet, Wallet)
//           — gated by partner.services (CAB / HOTEL)
//   Row 2 — Revenue chart (full width) — combined cab + hotel revenue
//   Row 3 — Booking breakdown | Fleet/Hotel Occupancy | Wallet (3 cols, gated)
//   Row 4 — Recent bookings table (full width) — merged cab + hotel rows
// ============================================================
import { useMemo, useState } from "react";
import {
  Box, Typography, Stack, Alert, IconButton, Tooltip,
  alpha, Grid,
} from "@mui/material";
import {
  Analytics, Refresh, TrendingUp, BookOnline,
  DirectionsCar, AccountBalanceWallet, Hotel, Luggage, SupportAgent,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "../../services/analytics.service";
import { COLORS } from "../../theme";

import AnalyticsKpiCard from "./components/AnalyticsKpiCard";
import RevenueChartSection from "./components/RevenueChartSection";
import BookingBreakdownSection from "./components/BookingBreakdownSection";
import HotelBookingBreakdownSection from "./components/HotelBookingBreakdownSection";
import TourBookingBreakdownSection from "./components/TourBookingBreakdownSection";
import VehicleFleetSection from "./components/VehicleFleetSection";
import HotelOccupancySection from "./components/HotelOccupancySection";
import WalletAnalyticsSection from "./components/WalletAnalyticsSection";
import RecentBookingsTable from "./components/RecentBookingsTable";
import type { RecentBookingRow } from "../../services/analytics.service";

// Hotel blue — matches the colour used in HotelOccupancySection,
// HotelBookingBreakdownSection, and RecentBookingsTable's HOTEL chip.
const HOTEL_BLUE = "#0EA5E9";
// Tour green — matches TourBookingBreakdownSection + RecentBookingsTable TOUR chip.
const TOUR_GREEN = "#22C55E";

export default function AnalyticsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["analytics-dashboard-main", refreshKey],
    queryFn: () => analyticsService.getDashboard(6),
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    refetch();
  };

  // ── Service gating ──────────────────────────────────────────
  // The dashboard payload returns the partner's enabled services; we use them
  // to decide which sections render. If services is empty the partner has
  // nothing enabled and we show the empty-state below.
  const services = data?.services ?? [];
  const hasCab   = services.includes("CAB");
  const hasHotel = services.includes("HOTEL");
  const hasTour  = services.includes("TOUR");
  const hasAny   = hasCab || hasHotel || hasTour;

  // ── KPI data ───────────────────────────────────────────────
  const cabRevenueThisMonth   = data?.bookings?.revenue_this_month ?? 0;
  const cabTotalBookings      = data?.bookings?.total ?? 0;
  const cabThisMonthBookings  = data?.bookings?.this_month ?? 0;
  const cabCompletedBookings  = data?.bookings?.completed ?? 0;
  const cabCompletionRate     = cabTotalBookings > 0 ? Math.round((cabCompletedBookings / cabTotalBookings) * 100) : 0;

  const hotelRevenueThisMonth  = data?.hotel_bookings?.revenue_this_month ?? 0;
  const hotelTotalBookings     = data?.hotel_bookings?.total ?? 0;
  const hotelThisMonthBookings = data?.hotel_bookings?.this_month ?? 0;

  const tourRevenueThisMonth  = data?.tour_bookings?.revenue_this_month ?? 0;
  const tourTotalBookings     = data?.tour_bookings?.total ?? 0;
  const tourThisMonthBookings = data?.tour_bookings?.this_month ?? 0;

  const totalVehicles   = data?.vehicles?.total ?? 0;
  const activeVehicles  = data?.vehicles?.active ?? 0;

  const walletBalance   = data?.wallet?.available_balance ?? 0;

  // The headline "revenue this month" KPI combines all enabled services,
  // mirroring the combined revenue chart semantic.
  const combinedRevenueThisMonth = (hasCab ? cabRevenueThisMonth : 0)
                                 + (hasHotel ? hotelRevenueThisMonth : 0)
                                 + (hasTour ? tourRevenueThisMonth : 0);

  // ── KPI card builder ───────────────────────────────────────
  // Up to 4 cards in a row. Order: Revenue, Cab Bookings, Hotel Bookings,
  // Fleet, Wallet. With both services + wallet we have 5; drop Fleet last so
  // the visible row stays at 4.
  type KpiSpec = {
    label: string;
    value: number;
    prefix?: string;
    suffix?: string;
    icon: JSX.Element;
    color: string;
    subValue: string;
    trend: "up" | "flat";
    trendLabel: string;
  };

  const kpiCards: KpiSpec[] = [];
  kpiCards.push({
    label: "Revenue This Month",
    value: combinedRevenueThisMonth,
    prefix: "₹",
    icon: <TrendingUp />,
    color: COLORS.gold,
    subValue: hasCab && (hasHotel || hasTour) ? "All services" : hasHotel ? "Hotel payout" : hasTour ? "Tour payout" : "Partner payout",
    trend: combinedRevenueThisMonth > 0 ? "up" : "flat",
    trendLabel: combinedRevenueThisMonth > 0 ? "Active" : "No data",
  });
  if (hasCab) {
    kpiCards.push({
      label: "Cab Bookings",
      value: cabTotalBookings,
      icon: <BookOnline />,
      color: COLORS.info,
      subValue: `${cabThisMonthBookings} this month`,
      trend: cabThisMonthBookings > 0 ? "up" : "flat",
      trendLabel: `+${cabThisMonthBookings} MTD`,
    });
  }
  if (hasHotel) {
    kpiCards.push({
      label: "Hotel Bookings",
      value: hotelTotalBookings,
      icon: <Hotel />,
      color: HOTEL_BLUE,
      subValue: `${hotelThisMonthBookings} this month`,
      trend: hotelThisMonthBookings > 0 ? "up" : "flat",
      trendLabel: `+${hotelThisMonthBookings} MTD`,
    });
  }
  if (hasTour) {
    kpiCards.push({
      label: "Tour Bookings",
      value: tourTotalBookings,
      icon: <Luggage />,
      color: TOUR_GREEN,
      subValue: `${tourThisMonthBookings} this month`,
      trend: tourThisMonthBookings > 0 ? "up" : "flat",
      trendLabel: `+${tourThisMonthBookings} MTD`,
    });
  }
  // Fleet only when cab is enabled AND we still have room (≤3 cards so far).
  if (hasCab && kpiCards.length < 4) {
    kpiCards.push({
      label: "Fleet Size",
      value: totalVehicles,
      suffix: " vehicles",
      icon: <DirectionsCar />,
      color: COLORS.success,
      subValue: `${activeVehicles} active`,
      trend: activeVehicles > 0 ? "up" : "flat",
      trendLabel: `${activeVehicles} on road`,
    });
  }
  // Wallet always last (or only when the row is otherwise empty).
  if (kpiCards.length === 0 || kpiCards.length < 4) {
    kpiCards.push({
      label: "Wallet Balance",
      value: walletBalance,
      prefix: "₹",
      icon: <AccountBalanceWallet />,
      color: "#8B5CF6",
      subValue: data?.wallet?.wallet_status === "ACTIVE" ? "Active" : (data?.wallet?.wallet_status ?? "—"),
      trend: walletBalance > 0 ? "up" : "flat",
      trendLabel: `${cabCompletionRate}% cab completion`,
    });
  }

  // ── Combined recent bookings ───────────────────────────────
  // Merge cab + hotel by date, take top 10. Cab uses created_at indirectly via
  // pickup_datetime; hotel uses created_at. We fall back gracefully when null.
  //
  // We also dedupe by `(service_type, booking_number|reservation_number)` —
  // backend should already be unique, but defending against duplicate
  // assignment rows (one cab booking reassigned multiple times to the same
  // partner) keeps React keys stable.
  const combinedRecent: RecentBookingRow[] = useMemo(() => {
    if (!data) return [];
    const cab = (data.recent_bookings ?? []).map((b): RecentBookingRow => ({ ...b, service_type: "CAB" as const }));
    const hotel = (data.recent_hotel_bookings ?? []).map((b): RecentBookingRow => ({ ...b, service_type: "HOTEL" as const }));
    const tour = (data.recent_tour_bookings ?? []).map((b): RecentBookingRow => ({ ...b, service_type: "TOUR" as const }));
    const dateOf = (b: RecentBookingRow): number => {
      const iso =
        b.service_type === "CAB"
          ? ((b as any).pickup_datetime ?? (b as any).journey_start_date)
          : b.service_type === "HOTEL"
          ? ((b as any).check_in_date ?? (b as any).created_at)
          : ((b as any).travel_start_date ?? (b as any).created_at);
      return iso ? new Date(iso).getTime() : 0;
    };
    const seen = new Set<string>();
    const merged: RecentBookingRow[] = [];
    const sorted = [...cab, ...hotel, ...tour].sort((a, b) => dateOf(b) - dateOf(a));
    for (const b of sorted) {
      const num = b.service_type === "CAB"
        ? (b as any).booking_number
        : b.service_type === "HOTEL"
        ? (b as any).reservation_number
        : (b as any).booking_number;
      const k = num ? `${b.service_type}:${num}` : null;
      if (k) {
        if (seen.has(k)) continue;
        seen.add(k);
      }
      merged.push(b);
      if (merged.length >= 10) break;
    }
    return merged;
  }, [data]);

  // ── Row-3 panel sizing ─────────────────────────────────────
  // Three columns when all panels exist; expand each to 6/12/6 if only 2 panels
  // exist; full width if only 1 panel exists.
  const row3Panels: JSX.Element[] = [];
  if (hasCab) {
    row3Panels.push(
      <Grid item xs={12} md={4} key="cab-breakdown">
        <BookingBreakdownSection
          bookings={data?.bookings ?? null}
          loading={isLoading}
        />
      </Grid>,
    );
  }
  if (hasHotel) {
    row3Panels.push(
      <Grid item xs={12} md={4} key="hotel-breakdown">
        <HotelBookingBreakdownSection
          bookings={data?.hotel_bookings ?? null}
          loading={isLoading}
        />
      </Grid>,
    );
  }
  if (hasTour) {
    row3Panels.push(
      <Grid item xs={12} md={4} key="tour-breakdown">
        <TourBookingBreakdownSection
          bookings={data?.tour_bookings ?? null}
          loading={isLoading}
        />
      </Grid>,
    );
  }
  if (hasCab) {
    row3Panels.push(
      <Grid item xs={12} md={4} key="cab-fleet">
        <VehicleFleetSection
          vehicles={data?.vehicles ?? null}
          loading={isLoading}
        />
      </Grid>,
    );
  }
  if (hasHotel) {
    row3Panels.push(
      <Grid item xs={12} md={4} key="hotel-occupancy">
        <HotelOccupancySection
          hotels={data?.hotels ?? null}
          loading={isLoading}
        />
      </Grid>,
    );
  }
  row3Panels.push(
    <Grid item xs={12} md={4} key="wallet">
      <WalletAnalyticsSection />
    </Grid>,
  );
  // When only one panel exists (besides wallet), the wallet takes full width
  // — but only if no breakdown panels. Otherwise the standard 3-col grid works.

  // Empty state — partner has no enabled services. Don't render any KPIs.
  if (!isLoading && !hasAny) {
    return (
      <Box>
        {/* Page header (always shown so the page is identifiable) */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{
              width: 42, height: 42, borderRadius: 2.5,
              background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyMid})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 14px ${alpha(COLORS.navy, 0.3)}`,
            }}>
              <Analytics sx={{ fontSize: 22, color: COLORS.gold }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", color: COLORS.textPrimary, lineHeight: 1.1 }}>
                Analytics
              </Typography>
              <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>
                Performance overview & business insights
              </Typography>
            </Box>
          </Stack>
        </Stack>

        <Box sx={{
          bgcolor: COLORS.bgCard, borderRadius: 3, border: `1px solid ${COLORS.border}`,
          boxShadow: "0 2px 12px rgba(10,22,40,0.05)",
          py: 8, px: 3, textAlign: "center",
        }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: "50%",
            bgcolor: alpha(COLORS.warning, 0.1),
            display: "inline-flex", alignItems: "center", justifyContent: "center", mb: 2,
          }}>
            <SupportAgent sx={{ fontSize: 32, color: COLORS.warning }} />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: COLORS.textPrimary, mb: 1 }}>
            No active services on your account
          </Typography>
          <Typography sx={{ fontSize: "0.88rem", color: COLORS.textSecondary, maxWidth: 480, mx: "auto" }}>
            Your partner account doesn't have any services enabled yet. Once WayTero enables Cab, Hotel,
            or Tour services for you, your performance overview will appear here.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* ── Page header ─────────────────────────────────────── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{
            width: 42, height: 42, borderRadius: 2.5,
            background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyMid})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 14px ${alpha(COLORS.navy, 0.3)}`,
          }}>
            <Analytics sx={{ fontSize: 22, color: COLORS.gold }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", color: COLORS.textPrimary, lineHeight: 1.1 }}>
              Analytics
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>
              Performance overview & business insights
            </Typography>
          </Box>
        </Stack>

        <Tooltip title="Refresh data">
          <IconButton
            onClick={handleRefresh}
            size="small"
            sx={{
              bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`,
              "&:hover": { bgcolor: alpha(COLORS.gold, 0.08), borderColor: COLORS.gold },
            }}
          >
            <Refresh sx={{ fontSize: 18, color: COLORS.textSecondary }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* ── Error state ─────────────────────────────────────── */}
      {isError && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
          Failed to load analytics data. Please refresh.
        </Alert>
      )}

      {/* ── Row 1: KPI Cards ────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {kpiCards.map((card) => (
          <Grid item xs={12} sm={6} lg={3} key={card.label}>
            <AnalyticsKpiCard {...card} loading={isLoading} />
          </Grid>
        ))}
      </Grid>

      {/* ── Row 2: Revenue Chart (full width) ───────────────── */}
      <Box sx={{ mb: 3 }}>
        <RevenueChartSection />
      </Box>

      {/* ── Row 3: Breakdown + Fleet + Wallet (3 cols) ──────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {row3Panels}
      </Grid>

      {/* ── Row 4: Recent Bookings Table (full width) ────────── */}
      <Box>
        <RecentBookingsTable
          bookings={combinedRecent}
          loading={isLoading}
        />
      </Box>
    </Box>
  );
}