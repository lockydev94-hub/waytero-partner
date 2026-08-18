// ============================================================
// RECENT BOOKINGS TABLE
// Data: dashboard.recent_bookings (cab) + recent_hotel_bookings (hotel)
// Shows: premium table with service-type chip, status, payout, route/dates
// Rows are passed in already-merged via RecentBookingRow discriminator.
// ============================================================
import {
  Box, Typography, Stack, Skeleton, alpha, Chip, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from "@mui/material";
import { Receipt, LocationOn, ArrowForward, Hotel, DirectionsCar, Luggage } from "@mui/icons-material";
import { COLORS } from "../../../theme";
import type { RecentBookingRow } from "../../../services/analytics.service";

const HOTEL_BLUE = "#0EA5E9";
const TOUR_GREEN = "#22C55E";

interface Props {
  bookings: RecentBookingRow[];
  loading?: boolean;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  // Cab statuses
  COMPLETED:          { label: "Completed",   color: COLORS.success },
  SETTLEMENT_PENDING: { label: "Settling",    color: "#F97316" },
  SETTLED:            { label: "Settled",     color: "#10B981" },
  CANCELLED:          { label: "Cancelled",   color: COLORS.error },
  IN_PROGRESS:        { label: "In Progress", color: COLORS.info },
  STARTED:            { label: "Started",     color: COLORS.info },
  CONFIRMED:          { label: "Confirmed",   color: COLORS.success },
  PENDING_ASSIGNMENT: { label: "Pending",     color: COLORS.warning },
  ASSIGNED:           { label: "Assigned",    color: "#8B5CF6" },
  BREAKDOWN_REPORTED: { label: "Breakdown",   color: "#DC2626" },
  AWAITING_SWAP:      { label: "Awaiting Swap", color: "#EA580C" },
  // Hotel statuses
  PENDING_PAYMENT:           { label: "Pending Payment",  color: COLORS.warning },
  AWAITING_HOTEL_CONFIRMATION: { label: "Awaiting Confirm", color: COLORS.warning },
  CHECKED_IN:                { label: "Checked In",       color: HOTEL_BLUE },
  IN_HOUSE:                  { label: "In House",         color: HOTEL_BLUE },
  CHECKED_OUT:               { label: "Checked Out",      color: COLORS.success },
  // Tour statuses
  PENDING_CONFIRMATION: { label: "Pending Confirm", color: COLORS.warning },
  BOOKING_ACCEPTED:     { label: "Accepted",        color: COLORS.success },
  TOUR_STARTED:         { label: "Started",         color: COLORS.info },
  TOUR_COMPLETED:       { label: "Completed",       color: COLORS.success },
  TOUR_CANCELLED:       { label: "Cancelled",       color: COLORS.error },
};

function getStatus(key: string) {
  return STATUS_MAP[key] ?? { label: key, color: COLORS.textSecondary };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "—"; }
}

function truncate(s: string | null, n = 22): string {
  if (!s) return "—";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function isCab(b: RecentBookingRow): b is Extract<RecentBookingRow, { service_type: "CAB" }> {
  return b.service_type === "CAB";
}

function isHotel(b: RecentBookingRow): b is Extract<RecentBookingRow, { service_type: "HOTEL" }> {
  return b.service_type === "HOTEL";
}

function isTour(b: RecentBookingRow): b is Extract<RecentBookingRow, { service_type: "TOUR" }> {
  return b.service_type === "TOUR";
}

export default function RecentBookingsTable({ bookings, loading }: Props) {
  return (
    <Box sx={{
      bgcolor: COLORS.bgCard, borderRadius: 3, border: `1px solid ${COLORS.border}`,
      boxShadow: "0 2px 12px rgba(10,22,40,0.05)", overflow: "hidden",
    }}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 3, pb: 2 }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: 2,
          background: `linear-gradient(135deg, #8B5CF6, #6D28D9)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 12px ${alpha("#8B5CF6", 0.3)}`,
        }}>
          <Receipt sx={{ fontSize: 19, color: "#fff" }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: COLORS.textPrimary }}>
            Recent Bookings
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
            Latest cab + hotel + tour bookings
          </Typography>
        </Box>
      </Stack>

      {loading ? (
        <Box sx={{ px: 3, pb: 3 }}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} height={52} sx={{ mb: 0.75, borderRadius: 1.5 }} />
          ))}
        </Box>
      ) : bookings.length === 0 ? (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Receipt sx={{ fontSize: 40, color: alpha(COLORS.textSecondary, 0.3), mb: 1 }} />
          <Typography sx={{ color: COLORS.textSecondary, fontSize: "0.85rem" }}>
            No bookings yet
          </Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ "& th": { bgcolor: alpha(COLORS.bgMain, 0.8) } }}>
                {["Booking #", "Type", "Route / Stay", "Date", "Customer", "Payout", "Status"].map((h) => (
                  <TableCell key={h} sx={{
                    fontSize: "0.7rem", fontWeight: 700, color: COLORS.textSecondary,
                    textTransform: "uppercase", letterSpacing: 0.5,
                    borderBottom: `1px solid ${COLORS.border}`, py: 1.25, px: 2,
                  }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((b, idx) => {
                // Cab uses booking_status; hotel uses reservation_status; tour
                // uses booking_status too. All are status codes from the same
                // enum set, so a single STATUS_MAP works — but the field name
                // differs per service.
                const statusKey = b.service_type === "HOTEL" ? b.reservation_status : b.booking_status;
                const st = getStatus(statusKey);
                const cab   = isCab(b)   ? b : null;
                const hotel = isHotel(b) ? b : null;
                const tour  = isTour(b)  ? b : null;
                // Stable key — namespace by service_type so numbers can never
                // collide across service sequences.
                const key   = cab
                  ? `cab:${cab.booking_number}`
                  : hotel
                  ? `hotel:${hotel.reservation_number}`
                  : tour
                  ? `tour:${tour.booking_number}`
                  : `row-${idx}`;
                const payout = cab
                  ? (cab.partner_payout || cab.final_amount)
                  : hotel
                  ? (hotel?.total_amount ?? 0)
                  : (tour ? (tour.partner_payout || tour.total_amount) : 0);
                const typeColor = cab ? COLORS.gold : hotel ? HOTEL_BLUE : TOUR_GREEN;
                const typeLabel = cab ? "Cab" : hotel ? "Hotel" : "Tour";
                const TypeIcon  = cab ? DirectionsCar : hotel ? Hotel : Luggage;

                return (
                  <TableRow
                    key={key}
                    sx={{
                      "&:hover": { bgcolor: alpha(COLORS.bgMain, 0.6) },
                      "&:last-child td": { border: 0 },
                      transition: "background 0.15s",
                    }}
                  >
                    {/* Booking # */}
                    <TableCell sx={{ px: 2, py: 1.5, borderColor: COLORS.border }}>
                      <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: COLORS.navy, fontFamily: "monospace" }}>
                        {cab ? cab.booking_number : hotel ? hotel.reservation_number : tour?.booking_number}
                      </Typography>
                      {hotel?.hotel_name && (
                        <Typography sx={{ fontSize: "0.65rem", color: COLORS.textSecondary }}>
                          {hotel.hotel_name}
                        </Typography>
                      )}
                      {cab && (
                        <Typography sx={{ fontSize: "0.65rem", color: COLORS.textSecondary }}>
                          {cab.trip_type ?? "Cab"}
                        </Typography>
                      )}
                      {tour?.package_name && (
                        <Typography sx={{ fontSize: "0.65rem", color: COLORS.textSecondary }}>
                          {tour.package_name}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Type chip */}
                    <TableCell sx={{ px: 2, py: 1.5, borderColor: COLORS.border }}>
                      <Chip
                        icon={<TypeIcon sx={{ fontSize: "12px !important" }} />}
                        label={typeLabel}
                        size="small"
                        sx={{
                          fontSize: "0.68rem", fontWeight: 700, height: 22,
                          bgcolor: alpha(typeColor, 0.1),
                          color: typeColor,
                          border: `1px solid ${alpha(typeColor, 0.2)}`,
                          "& .MuiChip-icon": { color: typeColor },
                        }}
                      />
                    </TableCell>

                    {/* Route (cab) or stay window (hotel) */}
                    <TableCell sx={{ px: 2, py: 1.5, borderColor: COLORS.border, maxWidth: 240 }}>
                      {cab ? (
                        <>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <LocationOn sx={{ fontSize: 12, color: COLORS.success, flexShrink: 0 }} />
                            <Tooltip title={cab.pickup_location ?? "—"}>
                              <Typography sx={{ fontSize: "0.75rem", color: COLORS.textPrimary }} noWrap>
                                {truncate(cab.pickup_location, 22)}
                              </Typography>
                            </Tooltip>
                          </Stack>
                          {cab.drop_location && (
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                              <ArrowForward sx={{ fontSize: 10, color: COLORS.textSecondary, flexShrink: 0 }} />
                              <Tooltip title={cab.drop_location}>
                                <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }} noWrap>
                                  {truncate(cab.drop_location, 22)}
                                </Typography>
                              </Tooltip>
                            </Stack>
                          )}
                        </>
                      ) : hotel ? (
                        <Stack spacing={0.25}>
                          {hotel?.check_in_date && hotel.check_out_date && (
                            <Typography sx={{ fontSize: "0.72rem", color: COLORS.textPrimary }}>
                              {formatDate(hotel.check_in_date)} → {formatDate(hotel.check_out_date)}
                            </Typography>
                          )}
                          {hotel && (hotel.rooms_count || hotel.adults_count) && (
                            <Typography sx={{ fontSize: "0.65rem", color: COLORS.textSecondary }}>
                              {hotel.rooms_count ?? 1} room · {hotel.adults_count ?? 1} guest{(hotel.adults_count ?? 1) > 1 ? "s" : ""}
                            </Typography>
                          )}
                        </Stack>
                      ) : (
                        <Stack spacing={0.25}>
                          {tour?.destination && (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <LocationOn sx={{ fontSize: 12, color: TOUR_GREEN, flexShrink: 0 }} />
                              <Typography sx={{ fontSize: "0.72rem", color: COLORS.textPrimary }} noWrap>
                                {truncate(tour.destination, 24)}
                              </Typography>
                            </Stack>
                          )}
                          {tour && tour.persons_count != null && (
                            <Typography sx={{ fontSize: "0.65rem", color: COLORS.textSecondary }}>
                              {tour.travel_start_date && tour.travel_end_date
                                ? `${formatDate(tour.travel_start_date)} → ${formatDate(tour.travel_end_date)}`
                                : `${tour.persons_count} traveller${tour.persons_count > 1 ? "s" : ""}`}
                            </Typography>
                          )}
                        </Stack>
                      )}
                    </TableCell>

                    {/* Date */}
                    <TableCell sx={{ px: 2, py: 1.5, borderColor: COLORS.border }}>
                      <Typography sx={{ fontSize: "0.75rem", color: COLORS.textPrimary }} noWrap>
                        {cab
                          ? formatDate(cab.pickup_datetime ?? cab.journey_start_date)
                          : hotel
                          ? formatDate(hotel?.check_in_date)
                          : formatDate(tour?.travel_start_date ?? tour?.created_at)}
                      </Typography>
                    </TableCell>

                    {/* Customer */}
                    <TableCell sx={{ px: 2, py: 1.5, borderColor: COLORS.border }}>
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: COLORS.textPrimary }} noWrap>
                        {b.customer_name}
                      </Typography>
                      {b.customer_mobile && (
                        <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary }}>
                          {b.customer_mobile}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Payout */}
                    <TableCell sx={{ px: 2, py: 1.5, borderColor: COLORS.border }}>
                      <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: COLORS.success }}>
                        ₹{payout.toLocaleString("en-IN")}
                      </Typography>
                    </TableCell>

                    {/* Status */}
                    <TableCell sx={{ px: 2, py: 1.5, borderColor: COLORS.border }}>
                      <Chip
                        label={st.label}
                        size="small"
                        sx={{
                          fontSize: "0.68rem", fontWeight: 700, height: 22,
                          bgcolor: alpha(st.color, 0.1),
                          color: st.color,
                          border: `1px solid ${alpha(st.color, 0.2)}`,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}