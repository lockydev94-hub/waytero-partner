// ============================================================
// WAYTERO PARTNER PORTAL — HOTEL SWITCH HISTORY PAGE
// Doc Ref: Hotel Switch Spec; Migration 0042_hotel_switch
// Route: /dashboard/hotel-bookings/switch-history
// Backend: GET /partners/me/hotel-bookings/switch-history
//
// Read-only audit of every hotel switch / mid-stay split that touched
// any reservation at one of this partner's hotels. Partners don't
// initiate switches; they only audit the financial impact on the
// reservations that were affected.
// ============================================================
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Chip, Stack, Skeleton, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, alpha, Divider, Button,
} from "@mui/material";
import { ArrowBack, SwapHoriz, Refresh } from "@mui/icons-material";
import { COLORS } from "../../theme";
import {
  hotelBookingService,
  type PartnerSwitchHistoryItem,
  type PartnerSwitchHistoryResponse,
} from "../../services/hotel-booking.service";

const inr = (n: number | null | undefined) =>
  n != null
    ? `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

const SPLIT_TYPE_LABEL: Record<string, string> = {
  PRE_CHECKIN_SWITCH: "Pre-checkin switch",
  POST_CHECKIN_SPLIT: "Mid-stay split",
};

export default function HotelSwitchHistoryPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PartnerSwitchHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const r = await hotelBookingService.listSwitchHistory({
        page: page + 1,
        page_size: pageSize,
      });
      setData(r);
    } catch (e: any) {
      // FastAPI validation errors return `detail` as a list of `{type, loc, msg, input}`;
      // plain HTTPException returns a string. Coalesce to a renderable message.
      const detail = e?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => d?.msg ?? JSON.stringify(d)).join("; ")
        : (detail ?? e?.message ?? "Failed to load switch history.");
      setErr(typeof msg === "string" ? msg : "Failed to load switch history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, pageSize]);

  const items: PartnerSwitchHistoryItem[] = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} size="small"
          sx={{ color: COLORS.textSecondary, textTransform: "none", fontWeight: 600 }}>
          Back
        </Button>
        <Box sx={{ flexGrow: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <SwapHoriz sx={{ color: COLORS.gold }} />
            <Typography sx={{ fontWeight: 800, fontSize: "1.25rem", color: COLORS.textPrimary }}>
              Hotel Switch History
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: "0.8rem", color: COLORS.textSecondary }}>
            Every switch or split touching a reservation at one of your hotels.
          </Typography>
        </Box>
        <Button startIcon={<Refresh />} onClick={load} size="small" sx={{ color: COLORS.textSecondary }}>
          Refresh
        </Button>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Paper elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden" }}>
        {loading && !data ? (
          <Box sx={{ p: 2 }}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} height={36} sx={{ mb: 1, borderRadius: 1 }} />
            ))}
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography sx={{ color: COLORS.textSecondary }}>
              No hotel switches yet. When an admin moves a guest to or away from one of your hotels,
              it will appear here.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(COLORS.gold, 0.06) }}>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Booking</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>New hotel</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Nights consumed</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Original bill</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Refund / Rollover</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id} hover>
                      <TableCell>
                        <Typography sx={{ fontSize: "0.8rem" }}>
                          {it.created_at
                            ? new Date(it.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                            : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: "0.8rem", fontFamily: "monospace", fontWeight: 600 }}>
                          {it.original_reservation_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: "0.8rem" }}>
                          {it.new_reservation_number}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                          {it.original_nights_consumed}
                          {it.nights_transferred > 0 && (
                            <Typography component="span" sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
                              {" "}/ {it.nights_transferred} moved
                            </Typography>
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>
                          {inr(it.original_final_amount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack alignItems="flex-end" spacing={0.25}>
                          {it.refund_issued > 0 && (
                            <Typography sx={{ fontSize: "0.78rem", color: "warning.main" }}>
                              Refund {inr(it.refund_issued)}
                            </Typography>
                          )}
                          {it.advance_redistributed > 0 && (
                            <Typography sx={{ fontSize: "0.78rem", color: "success.main" }}>
                              Rollover {inr(it.advance_redistributed)}
                            </Typography>
                          )}
                          {it.refund_issued === 0 && it.advance_redistributed === 0 && (
                            <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>—</Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={SPLIT_TYPE_LABEL[it.split_type] ?? it.split_type}
                          color={it.split_type === "POST_CHECKIN_SPLIT" ? "warning" : "secondary"}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Divider />
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </>
        )}
      </Paper>
    </Box>
  );
}
