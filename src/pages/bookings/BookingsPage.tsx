// ============================================================
// WAYTERO PARTNER PORTAL — BOOKINGS LIST PAGE
// Endpoint: GET /partners/me/bookings
// Shows all cab bookings assigned to this partner.
// Status filter tabs + search + assign-driver quick action.
// ============================================================
import { useEffect, useState, useCallback } from "react";
import {
  Box, Card, Typography, alpha, Button, Chip, Avatar,
  TextField, InputAdornment, Skeleton, Alert, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Badge, Pagination, Stack, Divider,
} from "@mui/material";
import {
  Search, Refresh, DirectionsCar, PersonPin, BookOnline,
  TrendingUp, HourglassTop, CheckCircle, Cancel, LocalTaxi,
  AssignmentInd, ArrowForwardIos, FilterList, Hotel, Tour,
} from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { bookingService, type BookingListItem } from "../../services/booking.service";
import { useRealtime } from "../../hooks/useRealtime";
import { COLORS } from "../../theme";
import HotelBookingsSection from "./HotelBookingsSection";
import TourBookingsSection from "./TourBookingsSection";
import PartnerCancellationRequestsBanner from "./components/PartnerCancellationRequestsBanner";

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  PENDING_ASSIGNMENT:         { label: "Pending",                color: "#F97316", bg: alpha("#F97316", 0.1), dot: "#F97316" },
  PENDING_PARTNER_ACCEPTANCE: { label: "Awaiting Your Acceptance", color: "#F59E0B", bg: alpha("#F59E0B", 0.12), dot: "#F59E0B" },
  ASSIGNED:                   { label: "Assigned",               color: "#3B82F6", bg: alpha("#3B82F6", 0.1), dot: "#3B82F6" },
  DRIVER_ASSIGNED:            { label: "Driver Set",             color: "#8B5CF6", bg: alpha("#8B5CF6", 0.1), dot: "#8B5CF6" },
  STARTED:                    { label: "In Trip",                color: "#10B981", bg: alpha("#10B981", 0.1), dot: "#10B981" },
  COMPLETED:                  { label: "Completed",              color: "#10B981", bg: alpha("#10B981", 0.08), dot: "#10B981" },
  SETTLEMENT_PENDING:         { label: "Settling",               color: "#D97706", bg: alpha("#D97706", 0.1), dot: "#D97706" },
  SETTLED:                    { label: "Settled",                color: "#059669", bg: alpha("#059669", 0.1), dot: "#059669" },
  BREAKDOWN_REPORTED:         { label: "Vehicle Breakdown",      color: "#DC2626", bg: alpha("#DC2626", 0.1), dot: "#DC2626" },
  AWAITING_SWAP:              { label: "Awaiting Replacement",  color: "#EA580C", bg: alpha("#EA580C", 0.1), dot: "#EA580C" },
  CANCELLED:                  { label: "Cancelled",              color: "#EF4444", bg: alpha("#EF4444", 0.1), dot: "#EF4444" },
};

const TRIP_TYPE_LABELS: Record<string, string> = {
  LOCAL: "Local", AIRPORT: "Airport", OUTSTATION: "Outstation",
  ONE_WAY: "One Way", ROUND_TRIP: "Round Trip",
};

const STATUS_TABS = [
  { value: "", label: "All Bookings" },
  { value: "PENDING_PARTNER_ACCEPTANCE", label: "Awaiting Acceptance" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "DRIVER_ASSIGNED", label: "Driver Set" },
  { value: "STARTED", label: "In Trip" },
  { value: "COMPLETED", label: "Completed" },
  { value: "SETTLEMENT_PENDING", label: "Settling" },
  { value: "SETTLED", label: "Settled" },
  { value: "CANCELLED", label: "Cancelled" },
];

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: COLORS.textSecondary, bg: COLORS.bgMain, dot: "#999" };
  return (
    <Chip
      size="small"
      label={cfg.label}
      sx={{
        bgcolor: cfg.bg, color: cfg.color, fontWeight: 700,
        fontSize: "0.72rem", height: 24, px: 0.5,
        border: `1px solid ${alpha(cfg.color, 0.3)}`,
        "& .MuiChip-label": { px: 1 },
      }}
    />
  );
}

function TripTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  return (
    <Chip
      label={TRIP_TYPE_LABELS[type] ?? type}
      size="small"
      sx={{ fontSize: "0.65rem", height: 18, bgcolor: alpha(COLORS.gold, 0.12), color: COLORS.goldDark, fontWeight: 600, border: `1px solid ${alpha(COLORS.gold, 0.25)}` }}
    />
  );
}

export default function BookingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const bookingType =
    searchParams.get("tab") === "hotel" ? "hotel"
    : searchParams.get("tab") === "tour" ? "tour"
    : "cab";

  const [items, setItems] = useState<BookingListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingService.listBookings({
        status: statusFilter || undefined,
        page,
        limit: LIMIT,
      });
      setItems(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  // Silent refresh (no skeleton flash) — used by realtime fan-out.
  const loadSilent = useCallback(async () => {
    setError(null);
    try {
      const res = await bookingService.listBookings({
        status: statusFilter || undefined,
        page,
        limit: LIMIT,
      });
      setItems(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load bookings.");
    }
  }, [statusFilter, page]);

  // ── Realtime: a status change anywhere (own accept/assign, or admin
  // settle/cancel) fans out BOOKING_UPDATED → refresh the list live ──
  const { subscribe } = useRealtime();
  useEffect(() => {
    const unsub = subscribe<{ service_type: string }>("BOOKING_UPDATED", () => {
      if (bookingType === "cab") void loadSilent();
    });
    return unsub;
  }, [subscribe, loadSilent, bookingType]);

  useEffect(() => { load(); }, [load]);

  // Local search filter (client-side on loaded page)
  const filtered = search.trim()
    ? items.filter(
        (b) =>
          b.booking_number.toLowerCase().includes(search.toLowerCase()) ||
          b.customer_name.toLowerCase().includes(search.toLowerCase()) ||
          (b.customer_mobile ?? "").includes(search) ||
          (b.pickup_location ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : items;

  // Summary counts from loaded items
  // PENDING_PARTNER_ACCEPTANCE is action-needed because the partner must
  // accept/reject before driver assignment can happen.
  const actionNeeded = items.filter(
    (b) =>
      (b.booking_status === "ASSIGNED" && !b.driver_id) ||
      b.booking_status === "PENDING_PARTNER_ACCEPTANCE"
  ).length;

  const handleTabChange = (_: any, val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  return (
    <Box>
      {/* ── Page header ── */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary, mb: 0.25 }}>
            My Bookings
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
            {bookingType === "hotel"
              ? "Hotel reservations at your properties"
              : bookingType === "tour"
              ? "Tour package bookings assigned to you"
              : "Cab bookings assigned to your partner account"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {/* ── Booking type toggle ── */}
          <Box sx={{ display:"flex", border:`1px solid ${COLORS.border}`, borderRadius:2, overflow:"hidden" }}>
            <Button size="small" onClick={() => setSearchParams({})}
              sx={{
                borderRadius:0, px:2, py:0.75, fontWeight:700, fontSize:"0.8rem", textTransform:"none",
                bgcolor: bookingType === "cab" ? COLORS.gold : "transparent",
                color: bookingType === "cab" ? "#fff" : COLORS.textSecondary,
                "&:hover": { bgcolor: bookingType === "cab" ? COLORS.goldDark : alpha(COLORS.gold,0.08) },
              }}>
              <DirectionsCar sx={{ fontSize:16, mr:0.75 }} /> Cab
            </Button>
            <Button size="small" onClick={() => setSearchParams({ tab:"hotel" })}
              sx={{
                borderRadius:0, px:2, py:0.75, fontWeight:700, fontSize:"0.8rem", textTransform:"none",
                borderLeft:`1px solid ${COLORS.border}`,
                bgcolor: bookingType === "hotel" ? COLORS.gold : "transparent",
                color: bookingType === "hotel" ? "#fff" : COLORS.textSecondary,
                "&:hover": { bgcolor: bookingType === "hotel" ? COLORS.goldDark : alpha(COLORS.gold,0.08) },
              }}>
              <Hotel sx={{ fontSize:16, mr:0.75 }} /> Hotel
            </Button>
            <Button size="small" onClick={() => setSearchParams({ tab:"tour" })}
              sx={{
                borderRadius:0, px:2, py:0.75, fontWeight:700, fontSize:"0.8rem", textTransform:"none",
                borderLeft:`1px solid ${COLORS.border}`,
                bgcolor: bookingType === "tour" ? COLORS.gold : "transparent",
                color: bookingType === "tour" ? "#fff" : COLORS.textSecondary,
                "&:hover": { bgcolor: bookingType === "tour" ? COLORS.goldDark : alpha(COLORS.gold,0.08) },
              }}>
              <Tour sx={{ fontSize:16, mr:0.75 }} /> Tours
            </Button>
          </Box>
          {actionNeeded > 0 && bookingType === "cab" && (
            <Chip
              icon={<AssignmentInd sx={{ fontSize: 15 }} />}
              label={`${actionNeeded} need driver`}
              size="small"
              sx={{
                bgcolor: alpha("#F97316", 0.12), color: "#C2410C",
                border: `1px solid ${alpha("#F97316", 0.3)}`, fontWeight: 700, fontSize: "0.75rem",
              }}
            />
          )}
          <Tooltip title="Refresh">
            <IconButton onClick={load} size="small" sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 2 }}>
              <Refresh sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── Pending cancellation requests (Banner) ── */}
      <PartnerCancellationRequestsBanner />

      {/* ── Hotel bookings ── */}
      {bookingType === "hotel" && <HotelBookingsSection />}

      {/* ── Tour bookings ── */}
      {bookingType === "tour" && <TourBookingsSection />}

      {/* ── Cab bookings ── */}
      {bookingType === "cab" && <>

      {/* ── Status Tabs ── */}
      <Card elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, mb: 2.5, overflow: "hidden" }}>
        <Box sx={{ borderBottom: `1px solid ${COLORS.border}`, px: 2 }}>
          <Tabs
            value={statusFilter}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTab-root": {
                fontSize: "0.8rem", fontWeight: 600, minHeight: 48, textTransform: "none",
                color: COLORS.textSecondary, py: 0,
              },
              "& .Mui-selected": { color: `${COLORS.gold} !important` },
              "& .MuiTabs-indicator": { backgroundColor: COLORS.gold, height: 3, borderRadius: "3px 3px 0 0" },
            }}
          >
            {STATUS_TABS.map((t) => (
              <Tab key={t.value} value={t.value} label={t.label} />
            ))}
          </Tabs>
        </Box>

        {/* Search bar */}
        <Box sx={{ px: 2, py: 1.5, bgcolor: alpha(COLORS.bgMain, 0.5) }}>
          <TextField
            size="small"
            placeholder="Search booking no., customer, pickup location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18, color: COLORS.textSecondary }} />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: "100%", sm: 360 } }}
          />
        </Box>
      </Card>

      {/* ── Content ── */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
      )}

      {loading ? (
        <Card elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3 }}>
          {[...Array(6)].map((_, i) => (
            <Box key={i} sx={{ p: 2.5, borderBottom: i < 5 ? `1px solid ${COLORS.border}` : "none" }}>
              <Skeleton height={24} width="60%" />
              <Skeleton height={18} width="40%" sx={{ mt: 0.5 }} />
            </Box>
          ))}
        </Card>
      ) : filtered.length === 0 ? (
        <Card elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, p: 6, textAlign: "center" }}>
          <BookOnline sx={{ fontSize: 56, color: alpha(COLORS.textSecondary, 0.3), mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.textPrimary, mb: 0.5 }}>
            No bookings found
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
            {statusFilter ? "No bookings match this filter." : "Bookings assigned to you will appear here."}
          </Typography>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden", display: { xs: "none", md: "block" } }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(COLORS.bgMain, 0.7) }}>
                    {["Booking", "Customer", "Route", "Pickup Time", "Category", "Driver", "Amount", "Status", ""].map((h) => (
                      <TableCell
                        key={h}
                        sx={{
                          py: 1.5, px: 2, fontSize: "0.72rem", fontWeight: 700,
                          color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em",
                          borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((b) => {
                    const needsDriver = b.booking_status === "ASSIGNED" && !b.driver_id;
                    const needsAccept = b.booking_status === "PENDING_PARTNER_ACCEPTANCE";
                    const rowHighlight = needsDriver ? "#F97316" : needsAccept ? "#F59E0B" : "transparent";
                    return (
                      <TableRow
                        key={b.booking_number}
                        sx={{
                          cursor: "pointer",
                          "&:hover": { bgcolor: alpha(COLORS.gold, 0.025) },
                          borderLeft: `3px solid ${rowHighlight}`,
                        }}
                        onClick={() => navigate(`/dashboard/bookings/${b.booking_number}`)}
                      >
                        <TableCell sx={{ px: 2, py: 2 }}>
                          <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: COLORS.textPrimary, fontFamily: "monospace" }}>
                            {b.booking_number}
                          </Typography>
                          <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary, mt: 0.25 }}>
                            MTB: {b.master_booking_number}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ px: 2 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Avatar sx={{ width: 30, height: 30, fontSize: "0.72rem", fontWeight: 700, bgcolor: alpha(COLORS.navy, 0.08), color: COLORS.navy }}>
                              {b.customer_name?.[0]?.toUpperCase() ?? "?"}
                            </Avatar>
                            <Box>
                              <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: COLORS.textPrimary }}>{b.customer_name}</Typography>
                              {b.customer_mobile && (
                                <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary }}>{b.customer_mobile}</Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ px: 2, maxWidth: 200 }}>
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textPrimary, fontWeight: 500 }} noWrap>
                              📍 {b.pickup_location ?? "—"}
                            </Typography>
                            <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }} noWrap>
                              🎯 {b.drop_location ?? "—"}
                            </Typography>
                          </Box>
                          <TripTypeBadge type={b.trip_type} />
                        </TableCell>
                        <TableCell sx={{ px: 2, whiteSpace: "nowrap" }}>
                          {b.pickup_datetime ? (
                            <Box>
                              <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: COLORS.textPrimary }}>
                                {new Date(b.pickup_datetime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                              </Typography>
                              <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
                                {new Date(b.pickup_datetime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography sx={{ color: COLORS.textSecondary, fontSize: "0.78rem" }}>—</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ px: 2 }}>
                          <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>{b.vehicle_category ?? "—"}</Typography>
                        </TableCell>
                        <TableCell sx={{ px: 2 }}>
                          {b.driver_name ? (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                              <PersonPin sx={{ fontSize: 15, color: COLORS.success }} />
                              <Box>
                                <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: COLORS.textPrimary }}>{b.driver_name}</Typography>
                                {b.vehicle_reg && (
                                  <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary, fontFamily: "monospace" }}>{b.vehicle_reg}</Typography>
                                )}
                              </Box>
                            </Box>
                          ) : (
                            needsDriver ? (
                              <Chip
                                label="Assign Now"
                                size="small"
                                sx={{
                                  bgcolor: alpha("#F97316", 0.12), color: "#C2410C",
                                  border: `1px solid ${alpha("#F97316", 0.3)}`, fontWeight: 700, fontSize: "0.7rem",
                                  cursor: "pointer",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/dashboard/bookings/${b.booking_number}`);
                                }}
                              />
                            ) : (
                              <Typography sx={{ color: COLORS.textSecondary, fontSize: "0.78rem" }}>—</Typography>
                            )
                          )}
                        </TableCell>
                        <TableCell sx={{ px: 2 }}>
                          <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: COLORS.textPrimary }}>
                            ₹{b.amount.toLocaleString("en-IN")}
                          </Typography>
                          {b.partner_payout > 0 && (
                            <Typography sx={{ fontSize: "0.68rem", color: COLORS.success, fontWeight: 600 }}>
                              Payout: ₹{b.partner_payout.toLocaleString("en-IN")}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ px: 2 }}>
                          <Stack direction="column" gap={0.5} alignItems="flex-start">
                            <StatusChip status={b.booking_status} />
                            {needsAccept && (
                              <Chip
                                label="Pending acceptance"
                                size="small"
                                sx={{
                                  bgcolor: alpha("#F59E0B", 0.12), color: "#B45309",
                                  border: `1px solid ${alpha("#F59E0B", 0.3)}`, fontWeight: 700, fontSize: "0.65rem", height: 20,
                                }}
                              />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ px: 1, width: 40 }}>
                          <ArrowForwardIos sx={{ fontSize: 14, color: COLORS.textSecondary }} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {/* Mobile cards */}
          <Box sx={{ display: { xs: "flex", md: "none" }, flexDirection: "column", gap: 1.5 }}>
            {filtered.map((b) => {
              const needsDriver = b.booking_status === "ASSIGNED" && !b.driver_id;
              return (
                <Card
                  key={b.booking_number}
                  elevation={0}
                  onClick={() => navigate(`/dashboard/bookings/${b.booking_number}`)}
                  sx={{
                    border: `1px solid ${needsDriver ? "#F97316" : COLORS.border}`,
                    borderRadius: 2.5, p: 2, cursor: "pointer",
                    "&:hover": { boxShadow: "0 4px 16px rgba(0,0,0,0.08)" },
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, fontFamily: "monospace", color: COLORS.textPrimary }}>
                      {b.booking_number}
                    </Typography>
                    <StatusChip status={b.booking_status} />
                  </Box>
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: COLORS.textPrimary, mb: 0.5 }}>{b.customer_name}</Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary, mb: 0.5 }}>📍 {b.pickup_location ?? "—"}</Typography>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
                    <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary }}>₹{b.amount.toLocaleString("en-IN")}</Typography>
                    {needsDriver && (
                      <Button size="small" variant="contained" sx={{ fontSize: "0.72rem", py: 0.4, px: 1.5 }}>
                        Assign Driver
                      </Button>
                    )}
                  </Box>
                </Card>
              );
            })}
          </Box>

          {/* Pagination */}
          {pages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination
                count={pages}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}

          <Typography sx={{ mt: 2, textAlign: "right", fontSize: "0.75rem", color: COLORS.textSecondary }}>
            Showing {filtered.length} of {total} bookings
          </Typography>
        </>
      )}
      </>}
    </Box>
  );
}
