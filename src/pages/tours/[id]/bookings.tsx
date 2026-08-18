// ============================================================
// WAYTERO PARTNER PORTAL — TOUR BOOKINGS PAGE
// Doc Ref: BRD_PART_5_TOUR_PACKAGE_MANAGEMENT §4
// Route: /dashboard/tours/:id/bookings
// Lists all bookings for a specific tour package (or all own
// tour bookings if no id is given). Read-only table view with
// status chip, amount, commission split, and travel dates.
// ============================================================
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Stack, Paper, Chip, Button, Alert,
  TextField, InputAdornment, CircularProgress,
  alpha, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Avatar, Tooltip,
} from "@mui/material";
import {
  ArrowBack, BookOnline, Search, Refresh, Person, CalendarMonth,
  AttachMoney, People, Visibility, FlightTakeoff, CheckCircle, Cancel,
  HourglassTop, TaskAlt, PlayArrow, AccountBalance, Schedule,
} from "@mui/icons-material";
import { COLORS } from "../../../theme";
import { tourService, PartnerTourPackage, PartnerTourBooking } from "../../../services/tour.service";
import PartnerCancelRequestDialog from "../../bookings/components/PartnerCancelRequestDialog";

// ── Status meta ──────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING_CONFIRMATION: { label: "Pending Confirmation", color: "#F59E0B", bg: "#FEF3C7", icon: <HourglassTop sx={{ fontSize: 13 }} /> },
  CONFIRMED:            { label: "Confirmed",            color: "#3B82F6", bg: "#DBEAFE", icon: <CheckCircle sx={{ fontSize: 13 }} /> },
  IN_PROGRESS:          { label: "In Progress",          color: "#06B6D4", bg: "#CFFAFE", icon: <PlayArrow sx={{ fontSize: 13 }} /> },
  COMPLETED:            { label: "Completed",            color: "#10B981", bg: "#D1FAE5", icon: <TaskAlt sx={{ fontSize: 13 }} /> },
  SETTLEMENT_PENDING:   { label: "Settlement Pending",   color: "#8B5CF6", bg: "#EDE9FE", icon: <AccountBalance sx={{ fontSize: 13 }} /> },
  SETTLED:              { label: "Settled",              color: "#16A34A", bg: "#BBF7D0", icon: <CheckCircle sx={{ fontSize: 13 }} /> },
  CANCELLED:            { label: "Cancelled",            color: "#EF4444", bg: "#FEE2E2", icon: <Cancel sx={{ fontSize: 13 }} /> },
};

const PAYMENT_META: Record<string, { label: string; color: string }> = {
  PAID:      { label: "Paid",      color: COLORS.success },
  PARTIAL:   { label: "Partial",   color: COLORS.warning },
  PENDING:   { label: "Pending",   color: COLORS.textSecondary },
  REFUNDED:  { label: "Refunded",  color: COLORS.info },
};

const CANCELLABLE = ["PENDING_CONFIRMATION", "CONFIRMED"];

// ── Booking row ──────────────────────────────────────────────
function BookingRow({ booking, onRequestCancel }: { booking: PartnerTourBooking; onRequestCancel: (b: PartnerTourBooking) => void }) {
  const navigate = useNavigate();
  const isBookingStatusKnown = Object.keys(STATUS_META).includes(booking.booking_status);
  const isPaymentStatusKnown = Object.keys(PAYMENT_META).includes(booking.payment_status);
  const status = isBookingStatusKnown ? STATUS_META[booking.booking_status] : { label: booking.booking_status, color: "#6B7280", bg: "#F3F4F6", icon: null };
  const payment = isPaymentStatusKnown ? PAYMENT_META[booking.payment_status] : { label: booking.payment_status, color: COLORS.textSecondary };
  const travel = `${new Date(booking.travel_start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} → ${new Date(booking.travel_end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
  const canRequestCancel = CANCELLABLE.includes(booking.booking_status);

  return (
    <TableRow sx={{ "&:hover": { bgcolor: alpha(COLORS.navy, 0.03) } }}>
      <TableCell sx={{ py: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(COLORS.navy, 0.1), color: COLORS.navy, fontSize: 13, fontWeight: 800 }}>
            {(booking.customer_name || "?")[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={700}>{booking.customer_name || "—"}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", fontSize: 10 }}>
              {booking.booking_number}
            </Typography>
          </Box>
        </Stack>
      </TableCell>
      <TableCell sx={{ py: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <CalendarMonth sx={{ fontSize: 14, color: COLORS.textSecondary }} />
          <Typography variant="body2">{travel}</Typography>
        </Stack>
      </TableCell>
      <TableCell sx={{ py: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <People sx={{ fontSize: 14, color: COLORS.textSecondary }} />
          <Typography variant="body2" fontWeight={700}>{booking.persons_count}</Typography>
        </Stack>
      </TableCell>
      <TableCell sx={{ py: 1.5 }}>
        <Typography variant="body2" fontWeight={800} color={COLORS.navy}>
          ₹{booking.total_amount.toLocaleString("en-IN")}
        </Typography>
        {booking.platform_commission > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 10 }}>
            Platform: ₹{booking.platform_commission.toLocaleString("en-IN")} · You: ₹{booking.partner_payout.toLocaleString("en-IN")}
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ py: 1.5 }}>
        <Chip
          label={payment.label}
          size="small"
          sx={{
            height: 20, fontSize: 10, fontWeight: 700,
            bgcolor: alpha(payment.color, 0.1),
            color: payment.color,
          }}
        />
      </TableCell>
      <TableCell sx={{ py: 1.5 }}>
        <Chip
          icon={status.icon as any}
          label={status.label}
          size="small"
          sx={{
            bgcolor: status.bg, color: status.color,
            fontWeight: 700, fontSize: 10,
            "& .MuiChip-icon": { color: status.color },
          }}
        />
      </TableCell>
      <TableCell sx={{ py: 1.5, textAlign: "right" }}>
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Booking details">
            <Button
              size="small"
              startIcon={<Visibility sx={{ fontSize: 14 }} />}
              onClick={() => navigate(`/dashboard/bookings/tour/${booking.booking_number}`)}
              sx={{ fontSize: 11, fontWeight: 700 }}
            >
              Details
            </Button>
          </Tooltip>
          {canRequestCancel && (
            <Tooltip title="Request admin to cancel this booking">
              <Button
                size="small"
                color="error"
                startIcon={<Cancel sx={{ fontSize: 14 }} />}
                onClick={() => onRequestCancel(booking)}
                sx={{ fontSize: 11, fontWeight: 700 }}
              >
                Cancel
              </Button>
            </Tooltip>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function TourBookingsPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const packageId = id ? Number(id) : undefined;

  const [pkg, setPkg] = useState<PartnerTourPackage | null>(null);
  const [bookings, setBookings] = useState<PartnerTourBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cancelBooking, setCancelBooking] = useState<PartnerTourBooking | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      if (packageId) {
        setPkg(await tourService.get(packageId));
      }
      const { items } = await tourService.getBookings(packageId);
      setBookings(items);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.response?.data?.message ?? "Failed to load tour bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [packageId]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search) return bookings;
    const q = search.toLowerCase();
    return bookings.filter(b => {
      const haystack = `${b.booking_number} ${b.customer_name ?? ""} ${b.package_name}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [bookings, search]);

  // Stats
  const stats = useMemo(() => ({
    total: bookings.length,
    upcoming: bookings.filter(b => ["PENDING_CONFIRMATION", "CONFIRMED", "IN_PROGRESS"].includes(b.booking_status)).length,
    completed: bookings.filter(b => ["COMPLETED", "SETTLEMENT_PENDING", "SETTLED"].includes(b.booking_status)).length,
    cancelled: bookings.filter(b => b.booking_status === "CANCELLED").length,
    revenue: bookings
      .filter(b => b.booking_status !== "CANCELLED")
      .reduce((sum, b) => sum + (b.partner_payout || 0), 0),
  }), [bookings]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Button startIcon={<ArrowBack />} onClick={() => packageId ? navigate(`/dashboard/tours/${packageId}`) : navigate("/dashboard/tours")}>
            Back
          </Button>
          <Box sx={{
            width: 44, height: 44, borderRadius: 2.5,
            background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyMid})`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <BookOnline sx={{ fontSize: 22, color: COLORS.gold }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: "1.25rem", color: COLORS.textPrimary }}>
              {pkg ? `Bookings: ${pkg.package_name}` : "All Tour Bookings"}
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>
              {pkg
                ? `${pkg.destination} · ${pkg.duration_days}D / ${pkg.duration_nights}N`
                : "Bookings across all your tour packages"}
            </Typography>
          </Box>
        </Stack>

        <Tooltip title="Refresh">
          <Button
            variant="outlined"
            size="small"
            onClick={load}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={14} /> : <Refresh />}
            sx={{ borderColor: COLORS.border, color: COLORS.textSecondary }}
          >
            Refresh
          </Button>
        </Tooltip>
      </Stack>

      {/* Stats */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 3, flexWrap: "wrap", gap: 1.5 }}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${COLORS.border}`, flex: 1, minWidth: 150 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>TOTAL BOOKINGS</Typography>
          <Typography variant="h4" fontWeight={900}>{stats.total}</Typography>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${COLORS.border}`, flex: 1, minWidth: 150, bgcolor: alpha(COLORS.info, 0.05) }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>UPCOMING</Typography>
          <Typography variant="h4" fontWeight={900} color={COLORS.info}>{stats.upcoming}</Typography>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${COLORS.border}`, flex: 1, minWidth: 150, bgcolor: alpha(COLORS.success, 0.05) }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>COMPLETED</Typography>
          <Typography variant="h4" fontWeight={900} color={COLORS.success}>{stats.completed}</Typography>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${COLORS.border}`, flex: 1, minWidth: 150, bgcolor: alpha(COLORS.warning, 0.05) }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>CANCELLED</Typography>
          <Typography variant="h4" fontWeight={900} color={COLORS.warning}>{stats.cancelled}</Typography>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${COLORS.border}`, flex: 1.5, minWidth: 200, background: `linear-gradient(135deg, ${alpha(COLORS.gold, 0.1)}, ${alpha(COLORS.gold, 0.02)})` }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>YOUR PAYOUT (LIFETIME)</Typography>
          <Typography variant="h4" fontWeight={900} color={COLORS.goldDark}>
            ₹{stats.revenue.toLocaleString("en-IN")}
          </Typography>
        </Paper>
      </Stack>

      {/* Filter */}
      <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2.5, border: `1px solid ${COLORS.border}`, mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search by booking #, customer, or package…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: COLORS.textSecondary }} /></InputAdornment>,
          }}
          sx={{ bgcolor: COLORS.bgMain, borderRadius: 1.5, "& fieldset": { borderColor: COLORS.border } }}
        />
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Table */}
      {loading ? (
        <Stack spacing={1}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      ) : filtered.length === 0 ? (
        <Paper elevation={0} sx={{
          p: 6, borderRadius: 3, border: `1px solid ${COLORS.border}`, textAlign: "center",
        }}>
          <Box sx={{
            width: 72, height: 72, borderRadius: 4, mx: "auto", mb: 2,
            bgcolor: alpha(COLORS.navy, 0.06),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <BookOnline sx={{ fontSize: 32, color: alpha(COLORS.navy, 0.3) }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: COLORS.textPrimary, mb: 0.5 }}>
            {search ? "No bookings match your search" : "No bookings yet"}
          </Typography>
          <Typography sx={{ fontSize: "0.85rem", color: COLORS.textSecondary, maxWidth: 380, mx: "auto" }}>
            {search
              ? "Try a different booking # or customer name."
              : pkg
                ? "Once customers book this tour, their bookings will appear here."
                : "Once customers book your tours, their bookings will appear here."}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: `1px solid ${COLORS.border}` }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: COLORS.bgMain }}>
                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>Travel dates</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>Pax</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>Payment</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 11, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(b => <BookingRow key={b.id} booking={b} onRequestCancel={setCancelBooking} />)}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Cancellation request dialog — partners cannot cancel directly,
          they submit a request and admin approves per the tour policy. */}
      <PartnerCancelRequestDialog
        open={Boolean(cancelBooking)}
        onClose={() => setCancelBooking(null)}
        bookingType="TOUR"
        bookingNumber={cancelBooking?.booking_number ?? ""}
        tourBookingId={cancelBooking?.id}
        onSubmitted={load}
      />
    </Box>
  );
}
