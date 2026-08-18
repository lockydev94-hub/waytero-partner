// ============================================================
// WAYTERO PARTNER PORTAL — HOTEL BOOKING DETAIL PAGE
// Route: /dashboard/bookings/hotel/:reservationId
//
// Modals are in ./components/Hotel*Modal.tsx — this file is the page
// shell that wires them up. The lifecycle is the same on both portals;
// the partner gets the same 2-step date picker, mismatch guard, and
// idempotent collect-payment as the admin.
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRealtime } from "../../hooks/useRealtime";
import {
  Box, Typography, Chip, Button, Stack, Paper, Skeleton, Alert,
  alpha, Divider, Grid, Table, TableBody, TableCell, TableHead, TableRow,
} from "@mui/material";
import {
  ArrowBack, Hotel, Refresh, CheckCircle, ExitToApp,
  Receipt, Payment, AddCard, MeetingRoom, CalendarToday, Person,
  TaskAlt, Download, SwapHoriz, Cancel,
} from "@mui/icons-material";
import { COLORS } from "../../theme";
import {
  hotelBookingService,
  type HotelBookingDetail,
  type PartnerSwitchBanner,
} from "../../services/hotel-booking.service";
import PartnerCancelRequestDialog from "./components/PartnerCancelRequestDialog";
import HotelConfirmModal from "./components/HotelConfirmModal";
import HotelCheckInModal from "./components/HotelCheckInModal";
import HotelAddChargesModal from "./components/HotelAddChargesModal";
import HotelRecordAdvanceModal from "./components/HotelRecordAdvanceModal";
import HotelCheckOutModal from "./components/HotelCheckOutModal";
import HotelCollectPaymentModal from "./components/HotelCollectPaymentModal";
import HotelInvoiceModal from "./components/HotelInvoiceModal";

// ── Status helpers ─────────────────────────────────────────────
const SM: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT:             { label: "Pending Payment",  color: COLORS.warning },
  AWAITING_HOTEL_CONFIRMATION: { label: "Awaiting Confirm", color: "#8B5CF6" },
  CONFIRMED:                   { label: "Confirmed",        color: "#3B82F6" },
  CHECKED_IN:                  { label: "Checked In",       color: "#10B981" },
  IN_HOUSE:                    { label: "In House",         color: "#059669" },
  CHECKED_OUT:                 { label: "Checked Out",      color: COLORS.gold },
  COMPLETED:                   { label: "Completed",        color: COLORS.success },
  SETTLED:                     { label: "Settled",          color: "#6366F1" },
  CANCELLED:                   { label: "Cancelled",        color: COLORS.error },
  REJECTED:                    { label: "Rejected",         color: COLORS.error },
  NO_SHOW:                     { label: "No Show",          color: COLORS.error },
};

const PM: Record<string, { label: string; color: string }> = {
  PENDING:  { label: "Payment Pending", color: COLORS.warning },
  PARTIAL:  { label: "Partially Paid",  color: "#F97316" },
  PAID:     { label: "Fully Paid",      color: COLORS.success },
};

const STEPS = ["AWAITING_HOTEL_CONFIRMATION","CONFIRMED","CHECKED_IN","IN_HOUSE","CHECKED_OUT","COMPLETED","SETTLED"];

// Status sets mirrored from the backend guards in partner/hotel_booking_api.py.
// If a guard there changes, change it here too — a button the API rejects is a bug.
const ADVANCE_ALLOWED = ["PENDING_PAYMENT","AWAITING_HOTEL_CONFIRMATION","CONFIRMED","CHECKED_IN","IN_HOUSE","CHECKED_OUT"];
const CHARGES_ALLOWED = ["CHECKED_IN","IN_HOUSE","CHECKED_OUT"];
const INVOICE_ALLOWED = ["CHECKED_OUT","COMPLETED"];
const DOWNLOAD_ALLOWED = ["CHECKED_OUT","COMPLETED","SETTLED"];
const TERMINAL = ["SETTLED","CANCELLED","REJECTED","NO_SHOW"];

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}
function inr(n?: number | null) {
  return n != null ? `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : "—";
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", py:0.75, gap:2 }}>
      <Typography sx={{ fontSize:"0.78rem", color:COLORS.textSecondary, flexShrink:0 }}>{label}</Typography>
      <Typography sx={{ fontSize:"0.82rem", fontWeight:600, color:COLORS.textPrimary, textAlign:"right" }}>
        {value ?? "—"}
      </Typography>
    </Box>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Paper elevation={0} sx={{ border:`1px solid ${COLORS.border}`, borderRadius:3, overflow:"hidden" }}>
      <Box sx={{ px:2.5, py:1.5, display:"flex", alignItems:"center", gap:1, borderBottom:`1px solid ${COLORS.border}`, bgcolor:alpha(COLORS.bgMain,0.5) }}>
        <Box sx={{ color:COLORS.gold, display:"flex" }}>{icon}</Box>
        <Typography sx={{ fontWeight:700, fontSize:"0.88rem", color:COLORS.textPrimary }}>{title}</Typography>
      </Box>
      <Box sx={{ px:2.5, py:0.5 }}>{children}</Box>
    </Paper>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function HotelBookingDetailPage() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();
  const id = Number(reservationId);

  const [data, setData] = useState<HotelBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  // Switch / split-stay banner (Doc Ref: Hotel Switch Spec; Migration 0042).
  // Always loaded on mount; the API returns {is_split_stay:false} when the
  // reservation isn't part of a split, in which case we render nothing.
  const [banner, setBanner] = useState<PartnerSwitchBanner | null>(null);

  const [modal, setModal] = useState<
    "confirm" | "checkin" | "charges" | "advance" | "checkout" | "collect" | "invoice" | "cancel-req" | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      setData(await hotelBookingService.get(id));
      // Fire-and-forget: a banner 404 / 500 must never block the main view.
      hotelBookingService
        .getSwitchBanner(id)
        .then((b) => setBanner(b))
        .catch(() => setBanner(null));
    }
    catch { setErr("Failed to load reservation."); }
    finally { setLoading(false); }
  }, [id]);

  // Realtime refresh: admin lifecycle changes (check-in, charges, invoice,
  // settlement, etc.) on this reservation fan out a HOTEL_BOOKING_UPDATED
  // event via /ws. Refetch so this page always shows live status/payment
  // state without the user pressing Refresh.
  const { subscribe } = useRealtime();
  useEffect(() => {
    if (!id) return;
    const unsub = subscribe<{ reservation_id: number }>("HOTEL_BOOKING_UPDATED", (msg) => {
      const d = msg?.data ?? {};
      if (Number(d.reservation_id) === id) load();
    });
    return unsub;
  }, [id, subscribe, load]);

  // Generic fan-out (BOOKING_UPDATED): catches master-level mutations not
  // covered by HOTEL_BOOKING_UPDATED (e.g. admin force-cancel, settlement).
  useEffect(() => {
    if (!id) return;
    const unsub = subscribe<{ service_type: string; service_id: number }>(
      "BOOKING_UPDATED",
      (msg) => {
        if (msg.data.service_type === "HOTEL" && Number(msg.data.service_id) === id) {
          load();
        }
      },
    );
    return unsub;
  }, [id, subscribe, load]);

  useEffect(() => { load(); }, [load]);

  function closeAndRefresh() { setModal(null); load(); }

  function onActionError(e: any) {
    setActionErr(e?.response?.data?.detail ?? e?.response?.data?.message ?? "Action failed. Please refresh and try again.");
  }

  const handleDownloadInvoice = useCallback(async () => {
    setBusy(true); setActionErr(null);
    try {
      const blob = await hotelBookingService.downloadInvoice(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice_${data?.invoice_number ?? id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      // responseType:"blob" makes axios hand back the *error* body as a Blob too,
      // so the JSON detail has to be read out of it before it can be shown.
      const body = e?.response?.data;
      if (body instanceof Blob) {
        try {
          const { detail, message } = JSON.parse(await body.text());
          setActionErr(detail ?? message ?? "Failed to download invoice.");
        } catch { setActionErr("Failed to download invoice."); }
      } else {
        onActionError(e);
      }
    } finally { setBusy(false); }
  }, [id, data?.invoice_number]);

  if (loading) return (
    <Box sx={{ p: 3 }}>
      {[...Array(5)].map((_,i) => <Skeleton key={i} height={48} sx={{ mb: 1, borderRadius: 2 }} />)}
    </Box>
  );
  if (err || !data) return (
    <Box sx={{ p: 3 }}>
      <Alert severity="error">{err ?? "Reservation not found."}</Alert>
    </Box>
  );

  const s = data.reservation_status;
  const stepIdx = STEPS.indexOf(s);
  const sm = SM[s] ?? { label: s, color: COLORS.textSecondary };
  const pm = PM[data.payment_collected_status] ?? { label: data.payment_collected_status, color: COLORS.textSecondary };
  const total = data.final_amount ?? 0;
  const balDue = data.balance_due ?? 0;
  const hasInvoice = !!data.invoice_number;
  const isTerminal = TERMINAL.includes(s);

  const canConfirm = s === "AWAITING_HOTEL_CONFIRMATION";
  const canCheckIn = s === "CONFIRMED";
  const canMarkInHouse = s === "CHECKED_IN";
  // The API refuses new charges once the invoice exists — the bill is frozen at that point.
  const canAddCharges = CHARGES_ALLOWED.includes(s) && !hasInvoice;
  const canRecordAdvance = ADVANCE_ALLOWED.includes(s) && balDue > 0;
  const canCheckOut = s === "IN_HOUSE";
  const canGenerateInvoice = INVOICE_ALLOWED.includes(s) && !hasInvoice;
  const canCollectPayment = INVOICE_ALLOWED.includes(s) && hasInvoice && balDue > 0;
  // Stricter than admin: a partner may only close out a fully-paid, invoiced stay,
  // because COMPLETED is what makes the reservation eligible for settlement.
  const canComplete = s === "CHECKED_OUT" && hasInvoice && balDue <= 0;
  const canDownloadInvoice = DOWNLOAD_ALLOWED.includes(s) && hasInvoice;
  // Cancellation can only be requested before the guest arrives. The API
  // refuses once the stay is in-house or closed (CHECKED_IN onward), so the
  // button must not appear on CHECKED_OUT / COMPLETED / fully-paid stays.
  const canRequestCancel = ["PENDING_PAYMENT", "AWAITING_HOTEL_CONFIRMATION", "CONFIRMED"].includes(s);

  // The platform GST switch is off → no tax was charged, so the row is meaningless.
  const showTax = data.gst_enabled && (data.taxes_amount ?? 0) > 0;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: "auto" }}>
      {/* ── Header ── */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} size="small"
          sx={{ color: COLORS.textSecondary, textTransform: "none", fontWeight: 600 }}>
          Back
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button startIcon={<Refresh />} onClick={load} size="small" sx={{ color: COLORS.textSecondary }}>
          Refresh
        </Button>
      </Stack>

      <Paper elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, p: 2.5, mb: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Hotel sx={{ color: COLORS.gold, fontSize: 22 }} />
              <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: COLORS.textPrimary }}>
                {data.reservation_number}
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: "0.9rem", color: COLORS.textSecondary }}>
              {data.hotel_name ?? "—"}
            </Typography>
            {data.hotel_address && (
              <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary, mt: 0.25 }}>
                {data.hotel_address}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label={sm.label} size="small"
              sx={{ bgcolor: alpha(sm.color, 0.12), color: sm.color, fontWeight: 700, border: `1px solid ${alpha(sm.color, 0.3)}` }} />
            <Chip label={pm.label} size="small"
              sx={{ bgcolor: alpha(pm.color, 0.12), color: pm.color, fontWeight: 700, border: `1px solid ${alpha(pm.color, 0.3)}` }} />
          </Stack>
        </Stack>
      </Paper>

      {/* ── Switch / split-stay banner (Doc Ref: Hotel Switch Spec) ── */}
      {banner?.is_split_stay && (
        <Alert
          severity="warning"
          icon={<SwapHoriz />}
          sx={{
            mb: 3, borderRadius: 3, alignItems: "center",
            border: `1px solid ${alpha(COLORS.warning, 0.4)}`,
            bgcolor: alpha(COLORS.warning, 0.08),
          }}
          action={
            <Button
              size="small"
              variant="text"
              onClick={() => navigate("/dashboard/hotel-bookings/switch-history")}
              sx={{ fontWeight: 700, color: COLORS.warning, whiteSpace: "nowrap" }}
            >
              View split history
            </Button>
          }
        >
          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
            This reservation was part of a hotel switch.
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", mt: 0.5 }}>
            {banner.original_reservation_id
              ? "This is the successor reservation"
              : "This is the original reservation"}
            {banner.related_reservation_number && (
              <> · Related: <b>{banner.related_reservation_number}</b></>
            )}
            {banner.switched_at && (
              <> · Switched on {new Date(banner.switched_at).toLocaleDateString("en-IN")}</>
            )}
            {banner.split_advance_strategy && (
              <> · Strategy: <b>{banner.split_advance_strategy}</b></>
            )}
            .
          </Typography>
          {banner.refund_pending > 0 && (
            <Typography sx={{ fontSize: "0.75rem", mt: 0.5, color: "text.secondary" }}>
              {banner.refund_pending} advance(s) pending Razorpay refund confirmation by admin.
            </Typography>
          )}
        </Alert>
      )}

      {/* ── Lifecycle stepper ── */}
      {stepIdx >= 0 && (
        <Paper elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, p: 2, mb: 3, overflowX: "auto" }}>
          <Stack direction="row" alignItems="center" spacing={0}>
            {STEPS.map((step, i) => {
              const done = i <= stepIdx;
              const active = i === stepIdx;
              const stepSm = SM[step];
              return (
                <Box key={step} sx={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
                  <Stack alignItems="center" spacing={0.5} sx={{ minWidth: 60 }}>
                    <Box sx={{
                      width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      bgcolor: done ? (active ? COLORS.gold : alpha(COLORS.gold, 0.3)) : alpha(COLORS.border, 0.8),
                      border: `2px solid ${done ? COLORS.gold : COLORS.border}`,
                    }}>
                      {done && <CheckCircle sx={{ fontSize: 16, color: active ? "#fff" : COLORS.gold }} />}
                    </Box>
                    <Typography sx={{ fontSize: "0.6rem", fontWeight: active ? 800 : 400, color: done ? COLORS.gold : COLORS.textSecondary, textAlign: "center", lineHeight: 1.2 }}>
                      {stepSm?.label ?? step}
                    </Typography>
                  </Stack>
                  {i < STEPS.length - 1 && (
                    <Box sx={{ flex: 1, height: 2, bgcolor: i < stepIdx ? COLORS.gold : alpha(COLORS.border, 1), mx: 0.5, mt: -2 }} />
                  )}
                </Box>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* ── Action buttons ──
          Every gate below mirrors a guard in partner/hotel_booking_api.py. The
          backend is authoritative; these only keep the partner from being offered
          an action the API would reject. */}
      {isTerminal ? (
        // No lifecycle actions remain, but a settled stay's invoice is still downloadable.
        <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1.5} sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ flexGrow: 1 }}>
            This reservation is {sm.label.toLowerCase()} — no further actions are available.
          </Alert>
          {canDownloadInvoice && (
            <Button variant="outlined" color="secondary" startIcon={<Download />} disabled={busy}
              onClick={handleDownloadInvoice} sx={{ fontWeight: 700 }}>
              {busy ? "Downloading…" : "Download Invoice"}
            </Button>
          )}
        </Stack>
      ) : (
        <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mb: 3 }}>
          {canConfirm && (
            <Button variant="contained" startIcon={<CheckCircle />} onClick={() => setModal("confirm")}
              sx={{ bgcolor: COLORS.gold, color: "#fff", "&:hover": { bgcolor: COLORS.goldDark }, fontWeight: 700 }}>
              Confirm Reservation
            </Button>
          )}
          {canCheckIn && (
            <Button variant="contained" color="success" startIcon={<MeetingRoom />} onClick={() => setModal("checkin")} sx={{ fontWeight: 700 }}>
              Check In
            </Button>
          )}
          {canMarkInHouse && (
            <Button variant="contained" startIcon={<Hotel />} disabled={busy}
              onClick={() => { setBusy(true); setActionErr(null); hotelBookingService.markInHouse(id).then(load).catch(onActionError).finally(() => setBusy(false)); }}
              sx={{ bgcolor: "#059669", color: "#fff", "&:hover": { bgcolor: "#047857" }, fontWeight: 700 }}>
              Mark In-House
            </Button>
          )}
          {canAddCharges && (
            <Button variant="outlined" startIcon={<AddCard />} onClick={() => setModal("charges")} sx={{ fontWeight: 700 }}>
              Add Charges
            </Button>
          )}
          {canRequestCancel && (
            <Button variant="outlined" color="warning" startIcon={<Cancel />}
              onClick={() => setModal("cancel-req")}
              sx={{ fontWeight: 700 }}>
              Request Cancellation
            </Button>
          )}
          {canRecordAdvance && (
            <Button variant="outlined" startIcon={<Payment />} onClick={() => setModal("advance")}
              sx={{ borderColor: COLORS.gold, color: COLORS.gold, "&:hover": { borderColor: COLORS.goldDark, bgcolor: alpha(COLORS.gold, 0.06) }, fontWeight: 700 }}>
              Record Advance
            </Button>
          )}
          {canCheckOut && (
            <Button variant="contained" color="warning" startIcon={<ExitToApp />} onClick={() => setModal("checkout")} sx={{ fontWeight: 700 }}>
              Check Out
            </Button>
          )}
          {canGenerateInvoice && (
            <Button variant="outlined" startIcon={<Receipt />} onClick={() => setModal("invoice")} sx={{ fontWeight: 700 }}>
              Generate Invoice
            </Button>
          )}
          {canCollectPayment && (
            <Button variant="contained" color="success" startIcon={<Payment />} onClick={() => setModal("collect")} sx={{ fontWeight: 700 }}>
              Collect Payment
            </Button>
          )}
          {canComplete && (
            <Button variant="contained" color="success" startIcon={<TaskAlt />} disabled={busy}
              onClick={() => { setBusy(true); setActionErr(null); hotelBookingService.markComplete(id).then(load).catch(onActionError).finally(() => setBusy(false)); }}
              sx={{ fontWeight: 700 }}>
              {busy ? "Processing…" : "Mark Completed"}
            </Button>
          )}
          {canDownloadInvoice && (
            <Button variant="outlined" color="secondary" startIcon={<Download />} disabled={busy}
              onClick={handleDownloadInvoice} sx={{ fontWeight: 700 }}>
              {busy ? "Downloading…" : "Download Invoice"}
            </Button>
          )}
          {hasInvoice && (
            <Chip icon={<Receipt sx={{ fontSize: 16 }} />} label={`Invoice: ${data.invoice_number}`}
              sx={{ bgcolor: alpha(COLORS.success, 0.1), color: COLORS.success, fontWeight: 700, border: `1px solid ${alpha(COLORS.success, 0.3)}` }} />
          )}
        </Stack>
      )}

      {/* Settlement is an admin/finance action — surfaced here as status only. */}
      {s === "COMPLETED" && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Stay completed and invoiced. Settlement is processed by the WayTero finance team.
        </Alert>
      )}

      {actionErr && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setActionErr(null)}>{actionErr}</Alert>}

      {/* ── Info grid ── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card title="Stay Details" icon={<CalendarToday fontSize="small" />}>
            <InfoRow label="Check-In" value={fmt(data.check_in_date)} />
            <InfoRow label="Check-Out" value={fmt(data.check_out_date)} />
            <InfoRow label="Nights" value={data.nights} />
            <InfoRow label="Rooms" value={data.rooms_count} />
            <InfoRow label="Adults / Children" value={`${data.adults_count} / ${data.children_count}`} />
            {data.extra_beds > 0 && <InfoRow label="Extra Beds" value={data.extra_beds} />}
            <InfoRow label="Room Type" value={data.room_type ?? data.room_category_name} />
            {data.allocated_rooms && <InfoRow label="Assigned Rooms" value={data.allocated_rooms} />}
            {data.actual_check_in_at && <InfoRow label="Actual Check-In" value={fmt(data.actual_check_in_at)} />}
            {data.actual_check_out_at && <InfoRow label="Actual Check-Out" value={fmt(data.actual_check_out_at)} />}
            {data.hotel_confirmation_number && <InfoRow label="Confirmation #" value={data.hotel_confirmation_number} />}
            {data.special_requests && <InfoRow label="Special Requests" value={data.special_requests} />}
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card title="Billing Summary" icon={<Receipt fontSize="small" />}>
            <InfoRow label="Base Amount" value={inr(data.base_amount)} />
            {(data.overtime_charge ?? 0) > 0 && (
              <InfoRow
                label={`Late Check-Out${data.overtime_hours ? ` (${data.overtime_hours}h)` : ""}`}
                value={inr(data.overtime_charge)}
              />
            )}
            {(data.additional_charges ?? 0) > 0 && <InfoRow label="Additional Charges" value={inr(data.additional_charges)} />}
            {(data.coupon_discount ?? 0) > 0 && (
              <InfoRow
                label={`Coupon Discount${data.coupon_code ? ` (${data.coupon_code})` : ""}`}
                value={<Typography sx={{ fontWeight: 700, color: COLORS.success }}>− {inr(data.coupon_discount)}</Typography>}
              />
            )}
            {(data.discount_amount ?? 0) > 0 && (
              <InfoRow label="Discount" value={<Typography sx={{ fontWeight: 700, color: COLORS.success }}>− {inr(data.discount_amount)}</Typography>} />
            )}
            {showTax && (
              <InfoRow
                label={`Taxes${data.gst_percent ? ` (GST ${data.gst_percent}%)` : ""}`}
                value={inr(data.taxes_amount)}
              />
            )}
            <Divider sx={{ my: 0.75 }} />
            <InfoRow label="Total" value={<Typography sx={{ fontWeight: 800, color: COLORS.textPrimary }}>{inr(total)}</Typography>} />
            <InfoRow label="Advance Paid" value={inr(data.total_advance_paid)} />
            <InfoRow label="Balance Due" value={
              <Typography sx={{ fontWeight: 800, color: balDue > 0 ? COLORS.error : COLORS.success }}>
                {inr(balDue)}
              </Typography>
            } />
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card title="Guest" icon={<Person fontSize="small" />}>
            <InfoRow label="Name" value={data.customer_name} />
            <InfoRow label="Mobile" value={data.customer_mobile} />
            {data.check_in_id_proof && <InfoRow label="ID Proof" value={data.check_in_id_proof} />}
          </Card>
        </Grid>
      </Grid>

      {/* ── Advance payments table ── */}
      {data.advance_payments.length > 0 && (
        <Paper elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden", mb: 3 }}>
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${COLORS.border}`, bgcolor: alpha(COLORS.bgMain, 0.5) }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.88rem" }}>Advance Payments</Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(COLORS.bgMain, 0.4) }}>
                {["Receipt", "Amount", "Mode", "Received By", "Reference", "Date"].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", color: COLORS.textSecondary }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.advance_payments.map(ap => (
                <TableRow key={ap.id} hover>
                  <TableCell sx={{ fontSize: "0.8rem" }}>{ap.receipt_number}</TableCell>
                  <TableCell sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{inr(ap.amount)}</TableCell>
                  <TableCell sx={{ fontSize: "0.8rem" }}>{ap.payment_mode}</TableCell>
                  <TableCell sx={{ fontSize: "0.8rem" }}>{ap.received_by}</TableCell>
                  <TableCell sx={{ fontSize: "0.8rem", color: COLORS.textSecondary }}>{ap.reference_number ?? "—"}</TableCell>
                  <TableCell sx={{ fontSize: "0.8rem", color: COLORS.textSecondary }}>{fmt(ap.collected_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* ── Modals ── */}
      <HotelConfirmModal reservationId={id} open={modal === "confirm"} onClose={() => setModal(null)} onDone={closeAndRefresh} />

      <PartnerCancelRequestDialog
        open={modal === "cancel-req"}
        onClose={() => setModal(null)}
        bookingType="HOTEL"
        bookingNumber={data.reservation_number || `HR-${id}`}
        reservationId={id}
        onSubmitted={closeAndRefresh}
      />
      <HotelCheckInModal reservationId={id} open={modal === "checkin"} onClose={() => setModal(null)} onDone={closeAndRefresh}
        bookedCheckInDate={data.check_in_date} platformTimezone={data.platform_timezone} numRooms={data.rooms_count} />
      <HotelAddChargesModal reservationId={id} currentTotal={total} open={modal === "charges"} onClose={() => setModal(null)} onDone={closeAndRefresh} />
      <HotelRecordAdvanceModal reservationId={id} balanceDue={balDue} open={modal === "advance"} onClose={() => setModal(null)} onDone={closeAndRefresh} />
      <HotelCheckOutModal reservationId={id} open={modal === "checkout"} onClose={() => setModal(null)} onDone={closeAndRefresh}
        recordedCheckInAt={data.actual_check_in_at} platformTimezone={data.platform_timezone} />
      <HotelCollectPaymentModal reservationId={id} balanceDue={balDue} open={modal === "collect"} onClose={() => setModal(null)} onDone={closeAndRefresh} />
      <HotelInvoiceModal reservationId={id} total={total} advancePaid={data.total_advance_paid ?? 0} balanceDue={balDue}
        payments={data.advance_payments ?? []} open={modal === "invoice"} onClose={() => setModal(null)} onDone={closeAndRefresh} />
    </Box>
  );
}
