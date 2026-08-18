// ============================================================
// WAYTERO PARTNER PORTAL — TOUR BOOKINGS LIST
// Doc Ref: BRD Part 5 — Tour Package Management §4
// Shown on the Bookings page under the Tours tab. Lists every
// booking across the partner's tour packages with status filter,
// search and pagination. Row click → tour booking detail page
// (/dashboard/bookings/tour/:id) where the partner manages the
// lifecycle (accept → start → complete / cancel).
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Stack, Paper, Chip, TextField, InputAdornment,
  Table, TableBody, TableCell, TableHead, TableRow, TablePagination,
  Skeleton, Alert, alpha, Button,
} from "@mui/material";
import { Search, Tour, OpenInNew, HourglassTop, CheckCircle, Cancel } from "@mui/icons-material";
import { COLORS } from "../../theme";
import { useRealtime } from "../../hooks/useRealtime";
import { tourService, type PartnerTourBooking } from "../../services/tour.service";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "PENDING_CONFIRMATION", label: "Awaiting Accept" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "SETTLEMENT_PENDING", label: "Settlement Pending" },
  { value: "SETTLED", label: "Settled" },
  { value: "CANCELLED", label: "Cancelled" },
];

const SM: Record<string, { label: string; color: string }> = {
  PENDING_CONFIRMATION: { label: "Awaiting Accept", color: "#F59E0B" },
  CONFIRMED:            { label: "Confirmed",        color: "#3B82F6" },
  IN_PROGRESS:          { label: "In Progress",      color: "#06B6D4" },
  COMPLETED:            { label: "Completed",        color: "#10B981" },
  SETTLEMENT_PENDING:   { label: "Settlement Pending", color: "#8B5CF6" },
  SETTLED:              { label: "Settled",          color: "#6366F1" },
  CANCELLED:            { label: "Cancelled",        color: COLORS.error },
};

const PM: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Unpaid",   color: COLORS.error },
  PARTIAL: { label: "Partial",  color: "#F97316" },
  PAID:    { label: "Paid",     color: COLORS.success },
  REFUNDED:{ label: "Refunded", color: COLORS.info },
};

function fmt(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}
function inr(n?: number | null) {
  return n != null ? `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—";
}

export default function TourBookingsSection() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [items, setItems] = useState<PartnerTourBooking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await tourService.getBookings({
        status: tab || undefined,
        search: search || undefined,
        page: page + 1,
        page_size: rowsPerPage,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setErr("Failed to load tour bookings.");
    } finally {
      setLoading(false);
    }
  }, [tab, search, page, rowsPerPage]);

  // Silent refresh (no skeleton flash) — used by realtime fan-out.
  const loadSilent = useCallback(async () => {
    setErr(null);
    try {
      const res = await tourService.getBookings({
        status: tab || undefined,
        search: search || undefined,
        page: page + 1,
        page_size: rowsPerPage,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setErr("Failed to load tour bookings.");
    }
  }, [tab, search, page, rowsPerPage]);

  useEffect(() => { load(); }, [load]);

  // ── Realtime: refresh the list live when any tour status changes ──
  const { subscribe } = useRealtime();
  useEffect(() => {
    const unsub = subscribe<{ service_type: string }>("BOOKING_UPDATED", (msg) => {
      if (msg.data.service_type === "TOUR") loadSilent();
    });
    return unsub;
  }, [subscribe, loadSilent]);

  function handleSearch() { setPage(0); setSearch(searchInput); }

  function handleTabChange(val: string) { setTab(val); setPage(0); }

  return (
    <Box>
      {/* ── Status filter tabs ── */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2.5 }}>
        {STATUS_TABS.map(t => (
          <Chip key={t.value} label={t.label} clickable onClick={() => handleTabChange(t.value)}
            sx={{
              fontWeight: tab === t.value ? 800 : 500,
              bgcolor: tab === t.value ? alpha(COLORS.gold, 0.15) : alpha(COLORS.bgMain, 0.8),
              color: tab === t.value ? COLORS.gold : COLORS.textSecondary,
              border: `1px solid ${tab === t.value ? COLORS.gold : COLORS.border}`,
            }}
          />
        ))}
      </Box>

      {/* ── Search bar ── */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
        <TextField size="small" placeholder="Search by booking #, package, customer…"
          value={searchInput} onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: COLORS.textSecondary }} /></InputAdornment> }}
          sx={{ flex: 1, maxWidth: 400 }}
        />
        <Button variant="outlined" onClick={handleSearch} sx={{ borderColor: COLORS.border, color: COLORS.textSecondary }}>
          Search
        </Button>
      </Stack>

      {/* ── Error ── */}
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      {/* ── Table ── */}
      <Paper elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(COLORS.bgMain, 0.5) }}>
              {["Booking #", "Package", "Customer", "Travel Dates", "Pax", "Total", "Status", "Payment", ""].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", color: COLORS.textSecondary, whiteSpace: "nowrap" }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(9)].map((__, j) => (
                      <TableCell key={j}><Skeleton height={24} /></TableCell>
                    ))}
                  </TableRow>
                ))
              : items.length === 0
              ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
                        <Tour sx={{ fontSize: 44, color: alpha(COLORS.textSecondary, 0.3) }} />
                        <Typography sx={{ color: COLORS.textSecondary, fontSize: "0.88rem" }}>
                          {tab || search
                            ? "No tour bookings match this filter"
                            : "No tour bookings yet — customer bookings will appear here"}
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              : items.map(row => {
                  const sm = SM[row.booking_status] ?? { label: row.booking_status, color: COLORS.textSecondary };
                  const pm = PM[row.payment_status] ?? { label: row.payment_status, color: COLORS.textSecondary };
                  const needsAccept = row.booking_status === "PENDING_CONFIRMATION";
                  return (
                    <TableRow key={row.id} hover sx={{ cursor: "pointer" }}
                      onClick={() => navigate(`/dashboard/bookings/tour/${row.id}`)}>
                      <TableCell sx={{ fontSize: "0.8rem", fontWeight: 700, color: COLORS.gold }}>
                        {row.booking_number}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.8rem", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>{row.package_name ?? "—"}</Typography>
                        {row.destination && (
                          <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary }}>{row.destination}</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.8rem" }}>
                        <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>{row.customer_name ?? "—"}</Typography>
                        {row.customer_mobile && (
                          <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary }}>{row.customer_mobile}</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        <Typography sx={{ fontSize: "0.8rem" }}>
                          {fmt(row.travel_start_date)} → {fmt(row.travel_end_date)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.8rem", textAlign: "center" }}>{row.persons_count}</TableCell>
                      <TableCell sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{inr(row.total_amount)}</TableCell>
                      <TableCell>
                        <Chip label={sm.label} size="small"
                          sx={{ bgcolor: alpha(sm.color, 0.12), color: sm.color, fontWeight: 700, fontSize: "0.7rem", border: `1px solid ${alpha(sm.color, 0.25)}` }} />
                        {needsAccept && (
                          <Chip icon={<HourglassTop sx={{ fontSize: 12 }} />} label="Accept" size="small"
                            sx={{ ml: 0.5, bgcolor: alpha("#F59E0B", 0.15), color: "#B45309", fontWeight: 700, fontSize: "0.65rem", height: 20 }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={pm.label} size="small"
                          sx={{ bgcolor: alpha(pm.color, 0.1), color: pm.color, fontWeight: 600, fontSize: "0.7rem" }} />
                      </TableCell>
                      <TableCell>
                        <OpenInNew sx={{ fontSize: 16, color: COLORS.textSecondary }} />
                      </TableCell>
                    </TableRow>
                  );
                })
            }
          </TableBody>
        </Table>
        <TablePagination
          component="div" count={total} page={page} rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 15, 25, 50]}
          sx={{ borderTop: `1px solid ${COLORS.border}` }}
        />
      </Paper>
    </Box>
  );
}
