// ============================================================
// WAYTERO PARTNER PORTAL — DASHBOARD PAGE (Cab + Hotel merged)
//
// Primary endpoint: GET /partners/me/dashboard?months=N
// Secondary:        GET /partners/me/wallet (summary)
// (handled inside the analytics components the dashboard embeds)
//
// Layout:
//   Header            — greeting, date, partner_code, status chip, refresh
//   Row 1 — KPI tiles — Revenue (Settled), Pending Settlement, Bookings,
//                        Vehicles/Hotels, Wallet (gated by `services`)
//   Row 2 — Revenue chart — full width, 3M/6M/12M toggle (combined series)
//   Row 3 — Breakdown + Fleet/Occupancy + Wallet panels (3 cols, gated)
//   Row 4 — Recent bookings table (full width, merged cab + hotel)
//   Row 5 — Profile setup nudge (gated on completion score)
// ============================================================
import { useMemo, useState } from "react";
import {
  Box, Card, CardContent, Typography, alpha, Button, Chip, LinearProgress,
  Skeleton, Alert, IconButton, Tooltip, Grid,
} from "@mui/material";
import {
  BookOnline, AccountBalanceWallet, DirectionsCar, TrendingUp,
  Refresh, HourglassTop, Hotel, Luggage, SupportAgent,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { clearSession } from "../../services/api";
import { dashboardService, type PartnerDashboard } from "../../services/dashboard.service";
import { COLORS } from "../../theme";
import RevenueChartSection from "../analytics/components/RevenueChartSection";
import BookingBreakdownSection from "../analytics/components/BookingBreakdownSection";
import HotelBookingBreakdownSection from "../analytics/components/HotelBookingBreakdownSection";
import TourBookingBreakdownSection from "../analytics/components/TourBookingBreakdownSection";
import VehicleFleetSection from "../analytics/components/VehicleFleetSection";
import HotelOccupancySection from "../analytics/components/HotelOccupancySection";
import WalletAnalyticsSection from "../analytics/components/WalletAnalyticsSection";
import RecentBookingsTable from "../analytics/components/RecentBookingsTable";
import type { RecentBookingRow } from "../../services/analytics.service";

// Hotel blue — same shade used in the analytics components.
const HOTEL_BLUE = "#0EA5E9";
// Tour green — matches TourBookingBreakdownSection + RecentBookingsTable TOUR chip.
const TOUR_GREEN = "#22C55E";
const PENDING_ORANGE = "#F97316";

// ── Partner status badge ───────────────────────────────────────────────────────
const PARTNER_STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE:            { label: "Active",            color: COLORS.success },
  APPROVED:          { label: "Approved",          color: COLORS.info },
  PENDING:           { label: "Pending Review",    color: COLORS.warning },
  UNDER_REVIEW:      { label: "Under Review",      color: COLORS.warning },
  DOCUMENT_PENDING:  { label: "Docs Pending",      color: "#F97316" },
  SUSPENDED:         { label: "Suspended",         color: COLORS.error },
  BLOCKED:           { label: "Blocked",           color: COLORS.error },
};

// ── Setup completion score ─────────────────────────────────────────────────────
function calcSetupProgress(data: PartnerDashboard): number {
  if (!data.partner) return 0;
  let score = 0;
  if (data.partner.status !== "PENDING") score += 30;       // profile submitted
  if (data.partner.status === "ACTIVE") score += 20;        // fully live
  if (data.wallet.wallet_status === "ACTIVE") score += 10;  // wallet active
  if (data.vehicles.total > 0) score += 20;                 // vehicle added
  if (data.vehicles.active > 0) score += 10;                // vehicle on road
  if (data.hotels.total > 0) score += 10;                   // hotel added
  if (data.bookings.total > 0 || data.hotel_bookings.total > 0 || data.tour_bookings.total > 0) score += 10; // first booking
  return Math.min(score, 100);
}

// ── Stat Card (coloured tile) ──────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  subLabel: string;
  icon: JSX.Element;
  gradient: string;
  iconBg: string;
  loading?: boolean;
}

function StatCard({ label, value, subLabel, icon, gradient, iconBg, loading }: StatCardProps) {
  return (
    <Card
      sx={{
        borderRadius: 3.5,
        background: gradient,
        boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
        overflow: "hidden",
        position: "relative",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 28px rgba(0,0,0,0.12)" },
      }}
    >
      <Box sx={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: alpha("#fff", 0.07) }} />
      <CardContent sx={{ p: 2.5, position: "relative" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", "& svg": { fontSize: 20, color: "#fff" } }}>
            {icon}
          </Box>
        </Box>
        {loading ? (
          <>
            <Skeleton variant="text" width={80} height={36} />
            <Skeleton variant="text" width={120} height={16} />
          </>
        ) : (
          <>
            <Typography sx={{ fontSize: "1.55rem", fontWeight: 800, color: COLORS.textPrimary, lineHeight: 1.1 }}>
              {value}
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: COLORS.textSecondary, mt: 0.5 }}>
              {label}
            </Typography>
            <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary, mt: 0.25 }}>
              {subLabel}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const firstName = user?.full_name?.split(" ")[0] ?? "Partner";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const [refreshKey, setRefreshKey] = useState(0);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["partner-dashboard", refreshKey],
    queryFn: () => dashboardService.getDashboard(6),
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    refetch();
  };

  // 401/403 handling — clear session and redirect to login.
  const errStatus = (error as any)?.response?.status;
  if (errStatus === 401 || errStatus === 403) {
    clearSession();
    return null;
  }

  // ── Service gating ──────────────────────────────────────────
  const services = data?.services ?? [];
  const hasCab = services.includes("CAB");
  const hasHotel = services.includes("HOTEL");
  const hasTour = services.includes("TOUR");
  const hasAny = hasCab || hasHotel || hasTour;

  // ── Derived KPIs ────────────────────────────────────────────
  const cabSettled      = data?.bookings?.revenue_this_month ?? 0;
  const cabPending      = data?.bookings?.revenue_pending_this_month ?? 0;
  const hotelSettled    = data?.hotel_bookings?.revenue_this_month ?? 0;
  const hotelPending    = data?.hotel_bookings?.revenue_pending_this_month ?? 0;
  const tourSettled     = data?.tour_bookings?.revenue_this_month ?? 0;
  const tourPending     = data?.tour_bookings?.revenue_pending_this_month ?? 0;

  const settledThisMonth = (hasCab ? cabSettled : 0) + (hasHotel ? hotelSettled : 0) + (hasTour ? tourSettled : 0);
  const pendingThisMonth = (hasCab ? cabPending : 0) + (hasHotel ? hotelPending : 0) + (hasTour ? tourPending : 0);

  const cabTotal      = data?.bookings?.total ?? 0;
  const hotelTotal    = data?.hotel_bookings?.total ?? 0;
  const tourTotal     = data?.tour_bookings?.total ?? 0;
  const cabThisMonth  = data?.bookings?.this_month ?? 0;
  const hotelThisMonth = data?.hotel_bookings?.this_month ?? 0;
  const tourThisMonth = data?.tour_bookings?.this_month ?? 0;
  const totalBookings = cabTotal + hotelTotal + tourTotal;
  const thisMonthBookings = cabThisMonth + hotelThisMonth + tourThisMonth;

  const walletBalance = data?.wallet?.available_balance ?? 0;

  // ── Combined recent bookings ───────────────────────────────
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
    return [...cab, ...hotel, ...tour]
      .sort((a, b) => dateOf(b) - dateOf(a))
      .slice(0, 10);
  }, [data]);

  // ── Row 3 panel sizing ──────────────────────────────────────
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

  // ── Render ──────────────────────────────────────────────────
  const setupProgress = data ? calcSetupProgress(data) : 0;
  const partnerStatus = data?.partner ? (PARTNER_STATUS[data.partner.status] ?? { label: data.partner.status, color: COLORS.textSecondary }) : null;

  // Empty state — partner has no enabled services.
  if (!isLoading && !hasAny) {
    return (
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>
              {greeting}, {firstName} 👋
            </Typography>
            <Typography sx={{ color: COLORS.textSecondary, fontSize: "0.875rem", mt: 0.25 }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </Typography>
          </Box>
        </Box>
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
            or Tour services for you, your dashboard summary will appear here.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>
              {greeting}, {firstName} 👋
            </Typography>
            {partnerStatus && (
              <Chip
                label={partnerStatus.label}
                size="small"
                sx={{
                  height: 22, fontWeight: 700, fontSize: "0.7rem",
                  color: partnerStatus.color, bgcolor: alpha(partnerStatus.color, 0.1),
                  border: `1px solid ${alpha(partnerStatus.color, 0.25)}`,
                }}
              />
            )}
          </Box>
          <Typography sx={{ color: COLORS.textSecondary, fontSize: "0.875rem", mt: 0.25 }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            {data?.partner?.partner_code && (
              <Box component="span" sx={{ ml: 1.5, color: COLORS.textSecondary, fontSize: "0.78rem" }}>
                • {data.partner.partner_code}
              </Box>
            )}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Refresh dashboard">
            <IconButton
              onClick={handleRefresh}
              disabled={isLoading}
              size="small"
              sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 2 }}
            >
              <Refresh sx={{ fontSize: 18, animation: isLoading ? "spin 1s linear infinite" : "none", "@keyframes spin": { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } } }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error */}
      {isError && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5 }} onClose={() => undefined}>
          {(error as any)?.response?.data?.detail ?? (error as any)?.message ?? "Failed to load dashboard data."}
        </Alert>
      )}

      {/* Row 1 — KPI tiles */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 2.5, mb: 3 }}>
        {/* Revenue (Settled) */}
        <StatCard
          label="Revenue (Settled)"
          value={isLoading ? "—" : `₹${settledThisMonth.toLocaleString("en-IN")}`}
          subLabel={isLoading ? "This month" : (hasCab && (hasHotel || hasTour) ? "All services" : hasHotel ? "Hotel payout" : hasTour ? "Tour payout" : "Partner payout")}
          icon={<TrendingUp />}
          gradient={`linear-gradient(135deg, ${alpha(COLORS.success, 0.07)}, ${alpha(COLORS.success, 0.02)})`}
          iconBg={`linear-gradient(135deg, ${COLORS.success}, #059669)`}
          loading={isLoading}
        />

        {/* Pending Settlement */}
        <StatCard
          label="Pending Settlement"
          value={isLoading ? "—" : `₹${pendingThisMonth.toLocaleString("en-IN")}`}
          subLabel="Awaiting admin"
          icon={<HourglassTop />}
          gradient={`linear-gradient(135deg, ${alpha(PENDING_ORANGE, 0.07)}, ${alpha(PENDING_ORANGE, 0.02)})`}
          iconBg={`linear-gradient(135deg, ${PENDING_ORANGE}, #C2410C)`}
          loading={isLoading}
        />

        {/* Total Bookings — auto-sum cab + hotel */}
        <StatCard
          label="Total Bookings"
          value={isLoading ? "—" : totalBookings.toLocaleString("en-IN")}
          subLabel={isLoading ? "" : `${thisMonthBookings} this month`}
          icon={<BookOnline />}
          gradient={`linear-gradient(135deg, ${alpha(COLORS.info, 0.07)}, ${alpha(COLORS.info, 0.02)})`}
          iconBg={`linear-gradient(135deg, ${COLORS.info}, #2563EB)`}
          loading={isLoading}
        />

        {/* Cab Bookings — only when cab is enabled and no competing tile */}
        {hasCab && (
          <StatCard
            label="Cab Bookings"
            value={isLoading ? "—" : cabTotal.toLocaleString("en-IN")}
            subLabel={isLoading ? "" : `${cabThisMonth} this month`}
            icon={<DirectionsCar />}
            gradient={`linear-gradient(135deg, ${alpha(COLORS.gold, 0.09)}, ${alpha(COLORS.gold, 0.03)})`}
            iconBg={`linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`}
            loading={isLoading}
          />
        )}

        {/* Hotel Bookings — only when hotel is enabled */}
        {hasHotel && (
          <StatCard
            label="Hotel Bookings"
            value={isLoading ? "—" : hotelTotal.toLocaleString("en-IN")}
            subLabel={isLoading ? "" : `${hotelThisMonth} this month`}
            icon={<Hotel />}
            gradient={`linear-gradient(135deg, ${alpha(HOTEL_BLUE, 0.07)}, ${alpha(HOTEL_BLUE, 0.02)})`}
            iconBg={`linear-gradient(135deg, ${HOTEL_BLUE}, #0369A1)`}
            loading={isLoading}
          />
        )}

        {/* Tour Bookings — only when tour is enabled */}
        {hasTour && (
          <StatCard
            label="Tour Bookings"
            value={isLoading ? "—" : tourTotal.toLocaleString("en-IN")}
            subLabel={isLoading ? "" : `${tourThisMonth} this month`}
            icon={<Luggage />}
            gradient={`linear-gradient(135deg, ${alpha(TOUR_GREEN, 0.07)}, ${alpha(TOUR_GREEN, 0.02)})`}
            iconBg={`linear-gradient(135deg, ${TOUR_GREEN}, #15803D)`}
            loading={isLoading}
          />
        )}

        {/* Vehicles — only when cab is enabled */}
        {hasCab && (
          <StatCard
            label="Vehicles"
            value={isLoading ? "—" : (data?.vehicles?.total ?? 0).toLocaleString("en-IN")}
            subLabel={isLoading ? "" : `${data?.vehicles?.active ?? 0} active · ${data?.vehicles?.pending ?? 0} pending`}
            icon={<DirectionsCar />}
            gradient={`linear-gradient(135deg, ${alpha(COLORS.gold, 0.09)}, ${alpha(COLORS.gold, 0.03)})`}
            iconBg={`linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`}
            loading={isLoading}
          />
        )}

        {/* Hotels — only when hotel is enabled */}
        {hasHotel && (
          <StatCard
            label="Hotels"
            value={isLoading ? "—" : (data?.hotels?.total ?? 0).toLocaleString("en-IN")}
            subLabel={isLoading ? "" : `${data?.hotels?.active ?? 0} active · ${data?.hotels?.pending ?? 0} pending`}
            icon={<Hotel />}
            gradient={`linear-gradient(135deg, ${alpha(HOTEL_BLUE, 0.07)}, ${alpha(HOTEL_BLUE, 0.02)})`}
            iconBg={`linear-gradient(135deg, ${HOTEL_BLUE}, #0369A1)`}
            loading={isLoading}
          />
        )}

        {/* Wallet Balance — always last */}
        <StatCard
          label="Wallet Balance"
          value={isLoading ? "—" : `₹${walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subLabel="Available to withdraw"
          icon={<AccountBalanceWallet />}
          gradient={`linear-gradient(135deg, ${alpha("#8B5CF6", 0.07)}, ${alpha("#8B5CF6", 0.02)})`}
          iconBg="linear-gradient(135deg, #8B5CF6, #7C3AED)"
          loading={isLoading}
        />
      </Box>

      {/* Row 2 — Revenue chart (full width) */}
      <Box sx={{ mb: 3 }}>
        <RevenueChartSection />
      </Box>

      {/* Row 3 — Breakdown + Fleet + Wallet (3 cols, gated) */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {row3Panels}
      </Grid>

      {/* Row 4 — Recent Bookings Table (full width) */}
      <Box sx={{ mb: 3 }}>
        <RecentBookingsTable
          bookings={combinedRecent}
          loading={isLoading}
        />
      </Box>

      {/* Row 5 — Profile setup nudge */}
      <Card
        sx={{
          borderRadius: 3.5,
          background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 100%)`,
          boxShadow: "0 4px 20px rgba(10,22,40,0.3)",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 700, color: "#fff", mb: 0.5 }}>
                {setupProgress === 100 ? "🎉 You're fully set up!" : "Complete your profile setup"}
              </Typography>
              <Typography sx={{ color: alpha("#fff", 0.6), fontSize: "0.82rem", mb: 1.5 }}>
                {setupProgress === 100
                  ? "Your account is active and ready to receive bookings."
                  : "Add vehicles, hotels, tour packages, and documents to start receiving bookings across all your enabled services."}
              </Typography>
              {isLoading ? (
                <Skeleton variant="rounded" width={240} height={6} sx={{ bgcolor: alpha("#fff", 0.12) }} />
              ) : setupProgress < 100 ? (
                <>
                  <LinearProgress
                    variant="determinate"
                    value={setupProgress}
                    sx={{
                      height: 6, borderRadius: 3, width: "100%", maxWidth: 360,
                      bgcolor: alpha("#fff", 0.12),
                      "& .MuiLinearProgress-bar": { background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.goldDark})`, borderRadius: 3 },
                    }}
                  />
                  <Typography sx={{ color: alpha("#fff", 0.45), fontSize: "0.72rem", mt: 0.75 }}>
                    {setupProgress}% complete
                  </Typography>
                </>
              ) : null}
            </Box>
            {setupProgress < 100 && (
              <Button variant="contained" sx={{ borderRadius: 2.5, px: 3, fontWeight: 700, whiteSpace: "nowrap" }}>
                Complete Setup
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

