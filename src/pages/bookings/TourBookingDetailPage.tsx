// ============================================================
// WAYTERO PARTNER PORTAL — TOUR BOOKING DETAIL + MANAGEMENT
// Doc Ref: BRD Part 5 — Tour Package Management §4
// Route: /dashboard/bookings/tour/:bookingId
//
// Mirrors the hotel booking detail page. The partner manages the
// full tour lifecycle from here (fixed assignment — no admin step):
//   PENDING_CONFIRMATION → Accept → CONFIRMED
//   CONFIRMED            → Start Tour → IN_PROGRESS
//   IN_PROGRESS          → Complete → COMPLETED
//   PENDING_CONFIRMATION | CONFIRMED → Cancel (reason required)
// Settlement (SETTLEMENT_PENDING → SETTLED) stays with the finance team.
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Stack, Paper, Chip, Button, Skeleton, Alert,
  alpha, Divider, Grid, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField,
} from "@mui/material";
import {
  ArrowBack, Refresh, Tour, CalendarToday, Receipt, Person, Groups,
  CheckCircle, PlayArrow, TaskAlt, Cancel, CardTravel,
  Schedule, Payments, DirectionsCar, EditCalendar, AddCircle, Description, Badge,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { COLORS } from "../../theme";
import { useRealtime } from "../../hooks/useRealtime";
import {
  tourService,
  type PartnerTourBookingDetail,
  type PartnerTourParticipant,
  type PartnerTourManagePayload,
} from "../../services/tour.service";
import {
  TourAdvanceModal, TourFleetModal, TourEditTripModal, TourChargeModal,
} from "./modals/TourManageModals";

const STEPS = ["PENDING_CONFIRMATION", "CONFIRMED", "IN_PROGRESS", "COMPLETED"];

const SM: Record<string, { label: string; color: string }> = {
  PENDING_CONFIRMATION: { label: "Awaiting Accept",    color: "#F59E0B" },
  CONFIRMED:            { label: "Confirmed",          color: "#3B82F6" },
  IN_PROGRESS:          { label: "In Progress",        color: "#06B6D4" },
  COMPLETED:            { label: "Completed",          color: "#10B981" },
  SETTLEMENT_PENDING:   { label: "Settlement Pending", color: "#8B5CF6" },
  SETTLED:              { label: "Settled",            color: "#6366F1" },
  CANCELLED:            { label: "Cancelled",          color: COLORS.error },
};

const PM: Record<string, { label: string; color: string }> = {
  PENDING:  { label: "Unpaid",   color: COLORS.error },
  PARTIAL:  { label: "Partial",  color: "#F97316" },
  PAID:     { label: "Paid",     color: COLORS.success },
  REFUNDED: { label: "Refunded", color: COLORS.info },
};

const TERMINAL = ["COMPLETED", "SETTLEMENT_PENDING", "SETTLED", "CANCELLED"];

function fmt(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}
function fmtDateTime(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return d;
  }
}
function inr(n?: number | null) {
  return n != null ? `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—";
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.75 }}>
      <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>{label}</Typography>
      <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, textAlign: "right", color: COLORS.textPrimary }}>
        {value}
      </Typography>
    </Stack>
  );
}

function Card({ title, icon, children, action }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <Paper elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden" }}>
      <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${COLORS.border}`, bgcolor: alpha(COLORS.bgMain, 0.5), display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          {icon}
          <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: COLORS.textPrimary }}>{title}</Typography>
        </Stack>
        {action}
      </Box>
      <Box sx={{ px: 2.5, py: 1.5 }}>{children}</Box>
    </Paper>
  );
}

/** Cancel dialog — a reason is mandatory (backend enforces it too). */
function CancelDialog({
  open, submitting, onClose, onSubmit,
}: {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onClose={() => !submitting && onClose()} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>Cancel Tour Booking</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: "0.82rem", color: COLORS.textSecondary, mb: 1.5 }}>
          This will cancel the booking for the customer. A reason is required so the admin can follow up (refund / reassign).
        </Typography>
        <TextField
          autoFocus fullWidth multiline minRows={2}
          label="Reason for cancellation"
          placeholder="e.g. Customer requested cancellation, tour not available"
          value={reason}
          onChange={e => setReason(e.target.value)}
          disabled={submitting}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ borderRadius: 2 }}>Back</Button>
        <Button
          variant="contained" color="error"
          disabled={submitting || reason.trim().length < 2}
          startIcon={submitting ? undefined : <Cancel />}
          onClick={() => onSubmit(reason.trim())}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          {submitting ? "Cancelling…" : "Cancel Booking"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function TourBookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const id = Number(bookingId);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [data, setData] = useState<PartnerTourBookingDetail | null>(null);
  const [manage, setManage] = useState<PartnerTourManagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manageSubmitting, setManageSubmitting] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [manageModal, setManageModal] = useState<"advance" | "fleet" | "edit" | "charge" | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const [d, m] = await Promise.all([
        tourService.getTourBooking(id),
        tourService.getTourBookingManage(id).catch(() => null),
      ]);
      setData(d);
      setManage(m);
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Failed to load tour booking.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const runManage = useCallback(async (fn: () => Promise<unknown>, successMsg: string) => {
    setManageSubmitting(true);
    try {
      await fn();
      enqueueSnackbar(successMsg, { variant: "success" });
      setManageModal(null);
      await load();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.detail ?? e?.response?.data?.message ?? "Action failed", { variant: "error" });
    } finally {
      setManageSubmitting(false);
    }
  }, [id, load, enqueueSnackbar]);

  useEffect(() => { load(); }, [load]);

  // ── Realtime: admin settlement / cancellation, or another tab's action,
  // fans out BOOKING_UPDATED → silent refresh for instant updates ──
  const { subscribe } = useRealtime();
  useEffect(() => {
    const unsub = subscribe<{ service_type: string; service_id: number }>(
      "BOOKING_UPDATED",
      (msg) => {
        if (msg.data.service_type === "TOUR" && Number(msg.data.service_id) === id) {
          load();
        }
      },
    );
    return unsub;
  }, [id, subscribe, load]);

  const runAction = useCallback(async (status: string, successMsg: string, reason?: string) => {
    setBusy(true); setActionErr(null);
    try {
      await tourService.updateTourBookingStatus(id, status, reason);
      enqueueSnackbar(successMsg, { variant: "success" });
      await load();
    } catch (e: any) {
      setActionErr(e?.response?.data?.detail ?? `Failed to ${status.toLowerCase()} booking.`);
    } finally {
      setBusy(false);
    }
  }, [id, load, enqueueSnackbar]);

  if (loading) return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: "auto" }}>
      {[...Array(5)].map((_, i) => <Skeleton key={i} height={48} sx={{ mb: 1, borderRadius: 2 }} />)}
    </Box>
  );
  if (err || !data) return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: "auto" }}>
      <Alert severity="error">{err ?? "Tour booking not found."}</Alert>
    </Box>
  );

  const s = data.booking_status;
  const stepIdx = STEPS.indexOf(s);
  const sm = SM[s] ?? { label: s, color: COLORS.textSecondary };
  const pm = PM[data.payment_status] ?? { label: data.payment_status, color: COLORS.textSecondary };
  const isTerminal = TERMINAL.includes(s);

  const canAccept = s === "PENDING_CONFIRMATION";
  // Start requires the fleet (vehicle + driver) to be assigned first.
  const hasFleet = Boolean(manage?.vehicle && manage?.driver);
  const canStart = s === "CONFIRMED" && hasFleet;
  // Complete requires the full payment to have been collected.
  const paymentStatus = manage?.payment_status ?? data.payment_status;
  const isPaid = paymentStatus === "PAID";
  const balanceDue = Math.max((manage?.total_amount ?? data.total_amount) - (manage?.advance_total ?? 0), 0);
  const canComplete = s === "IN_PROGRESS" && isPaid;
  const canCollect = !["SETTLED", "CANCELLED"].includes(s);
  const canCancel = !isTerminal && s !== "PENDING_CONFIRMATION"; // pending ones cancel via the accept popup's Reject

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

      {/* ── Title ── */}
      <Paper elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, p: 2.5, mb: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Tour sx={{ color: COLORS.gold, fontSize: 22 }} />
              <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: COLORS.textPrimary }}>
                {data.booking_number}
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: "0.9rem", color: COLORS.textSecondary }}>
              {data.package.package_name} — {data.package.destination}
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary, mt: 0.25 }}>
              MTB: {data.master_booking_number} · {data.package.duration_days}D / {data.package.duration_nights}N
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label={sm.label} size="small"
              sx={{ bgcolor: alpha(sm.color, 0.12), color: sm.color, fontWeight: 700, border: `1px solid ${alpha(sm.color, 0.3)}` }} />
            <Chip label={`${pm.label} (${data.payment_status})`} size="small"
              sx={{ bgcolor: alpha(pm.color, 0.12), color: pm.color, fontWeight: 700, border: `1px solid ${alpha(pm.color, 0.3)}` }} />
          </Stack>
        </Stack>
      </Paper>

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
                  <Stack alignItems="center" spacing={0.5} sx={{ minWidth: 70 }}>
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

      {/* ── Actions ── */}
      {isTerminal ? (
        <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1.5} sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ flexGrow: 1, borderRadius: 2 }}>
            This booking is {sm.label.toLowerCase()} — no further actions are available.
          </Alert>
        </Stack>
      ) : (
        <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mb: 3 }}>
          {canAccept && (
            <Button variant="contained" startIcon={<CheckCircle />} disabled={busy}
              onClick={() => runAction("CONFIRMED", "Tour booking accepted")}
              sx={{ bgcolor: COLORS.gold, color: "#fff", "&:hover": { bgcolor: COLORS.goldDark }, fontWeight: 700 }}>
              Accept Booking
            </Button>
          )}
          {canStart && (
            <Button variant="contained" color="info" startIcon={<PlayArrow />} disabled={busy}
              onClick={() => runAction("IN_PROGRESS", "Tour marked as in progress")}
              sx={{ fontWeight: 700 }}>
              Start Tour
            </Button>
          )}
          {s === "CONFIRMED" && !hasFleet && (
            <Button variant="contained" color="info" startIcon={<PlayArrow />} disabled
              title="Assign a vehicle and driver first" sx={{ fontWeight: 700, opacity: 0.6 }}>
              Start Tour
            </Button>
          )}
          {s === "IN_PROGRESS" && !isPaid && (
            <Button variant="contained" color="warning" startIcon={<Payments />} disabled={busy}
              onClick={() => setManageModal("advance")} sx={{ fontWeight: 700 }}>
              Collect Payment {balanceDue > 0 && `(₹${balanceDue.toLocaleString("en-IN")})`}
            </Button>
          )}
          {canComplete && (
            <Button variant="contained" color="success" startIcon={<TaskAlt />} disabled={busy}
              onClick={() => runAction("COMPLETED", "Tour marked as completed")}
              sx={{ fontWeight: 700 }}>
              Mark Completed
            </Button>
          )}
          {canCancel && (
            <Button variant="outlined" color="warning" startIcon={<Cancel />} disabled={busy}
              onClick={() => setCancelOpen(true)}
              sx={{ fontWeight: 700 }}>
              Cancel Booking
            </Button>
          )}
        </Stack>
      )}

      {/* Payment required before completing */}
      {s === "IN_PROGRESS" && !isPaid && (
        <Alert severity="warning" icon={<Payments />} sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button size="small" color="warning" startIcon={<Payments fontSize="small" />} onClick={() => setManageModal("advance")}>
              Collect payment
            </Button>
          }>
          <b>Collect the full payment before completing the tour.</b> Outstanding balance: <b>₹{balanceDue.toLocaleString("en-IN")}</b>. The booking can only be marked completed once the amount is fully paid.
        </Alert>
      )}

      {/* Completed but balance still due — collect before settlement */}
      {s === "COMPLETED" && !isPaid && (
        <Alert severity="warning" icon={<Payments />} sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button size="small" color="warning" startIcon={<Payments fontSize="small" />} onClick={() => setManageModal("advance")}>
              Collect payment
            </Button>
          }>
          <b>Tour completed — {balanceDue > 0 ? `₹${balanceDue.toLocaleString("en-IN")} still outstanding.` : "payment pending."}</b> Collect the remaining balance before the admin settles with you.
        </Alert>
      )}

      {/* Prerequisite notice — confirmed but no fleet assigned yet */}
      {s === "CONFIRMED" && !hasFleet && (
        <Alert severity="info" icon={<DirectionsCar />} sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button size="small" color="info" startIcon={<DirectionsCar fontSize="small" />} onClick={() => setManageModal("fleet")}>
              Assign fleet
            </Button>
          }>
          <b>Assign a vehicle &amp; driver before starting the tour.</b> The tour can only be started once the fleet is set from your vehicles/drivers.
        </Alert>
      )}

      {/* Settlement is a finance-team action — surfaced here as status only. */}
      {s === "COMPLETED" && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          Tour completed. Settlement is processed by the WayTero finance team.
        </Alert>
      )}

      {actionErr && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setActionErr(null)}>{actionErr}</Alert>}

      {/* ── Info grid ── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card title="Trip Details" icon={<CalendarToday sx={{ fontSize: 18, color: COLORS.gold }} />}
            action={!isTerminal && <Button size="small" startIcon={<EditCalendar />} onClick={() => setManageModal("edit")}>Edit</Button>}>
            <InfoRow label="Travel Start" value={fmt(data.travel_start_date)} />
            <InfoRow label="Travel End" value={fmt(data.travel_end_date)} />
            <InfoRow label="Duration" value={`${data.package.duration_days}D / ${data.package.duration_nights}N`} />
            <InfoRow label="Travellers" value={data.persons_count} />
            <InfoRow label="Group Size" value={`${data.package.minimum_persons}–${data.package.maximum_persons ?? "unlimited"} pax`} />
            <InfoRow label="Booked On" value={fmtDateTime(data.created_at)} />
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card title="Billing Summary" icon={<Receipt sx={{ fontSize: 18, color: COLORS.gold }} />}>
            {data.offer && <InfoRow label="Offer" value={data.offer.title} />}
            {data.coupon && (
              <InfoRow
                label={`Coupon (${data.coupon.code})`}
                value={<Typography sx={{ fontWeight: 700, color: COLORS.success }}>− {inr(data.coupon.discount_amount)}</Typography>}
              />
            )}
            {data.coupon && data.coupon.type !== "PLATFORM" && data.coupon.partner_share > 0 && (
              <InfoRow label="Your Coupon Share" value={inr(data.coupon.partner_share)} />
            )}
            <InfoRow label="Total Amount" value={<Typography sx={{ fontWeight: 800, color: COLORS.textPrimary }}>{inr(data.total_amount)}</Typography>} />
            <Divider sx={{ my: 0.75 }} />
            <InfoRow label="Platform Commission" value={inr(data.platform_commission)} />
            <InfoRow label="Your Payout" value={<Typography sx={{ fontWeight: 800, color: COLORS.success }}>{inr(data.partner_payout)}</Typography>} />
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card title="Package" icon={<CardTravel sx={{ fontSize: 18, color: COLORS.gold }} />}>
            <InfoRow label="Package Code" value={data.package.package_code} />
            <InfoRow label="Package" value={data.package.package_name} />
            <InfoRow label="Destination" value={data.package.destination} />
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card title="Customer" icon={<Person sx={{ fontSize: 18, color: COLORS.gold }} />}>
            <InfoRow label="Name" value={data.customer.name} />
            <InfoRow label="Mobile" value={data.customer.mobile ?? "—"} />
            <InfoRow label="Email" value={data.customer.email ?? "—"} />
          </Card>
        </Grid>
      </Grid>

      {/* ── Manage: advance / fleet / charges / invoice ── */}
      {manage && (
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          {/* Payment & advance */}
          <Grid item xs={12} md={6}>
            <Card title="Payment & Advance" icon={<Payments sx={{ fontSize: 18, color: COLORS.gold }} />}
              action={canCollect && <Button size="small" startIcon={<Payments />} onClick={() => setManageModal("advance")}>{isPaid ? "Record" : "Collect"}</Button>}
              >
              {/* total_amount already includes additional charges — do not add them again */}
              <InfoRow label="Total (incl. charges)"
                value={<Typography sx={{ fontWeight: 800 }}>{inr(manage.total_amount)}</Typography>} />
              {manage.additional_amount > 0 && (
                <InfoRow label="incl. additional charges" value={<Typography sx={{ color: "#F97316", fontWeight: 700 }}>{inr(manage.additional_amount)}</Typography>} />
              )}
              <Divider sx={{ my: 0.75 }} />
              <InfoRow label="Platform Commission" value={inr(manage.platform_commission)} />
              <InfoRow label="Your Payout" value={<Typography sx={{ fontWeight: 800, color: COLORS.success }}>{inr(manage.partner_payout)}</Typography>} />
              <Divider sx={{ my: 0.75 }} />
              <InfoRow label="Collected so far" value={<Typography sx={{ fontWeight: 800, color: COLORS.goldDark }}>{inr(manage.advance_total)}</Typography>} />
              <InfoRow label="Balance due" value={<Typography sx={{ fontWeight: 800, color: balanceDue > 0 ? COLORS.error : COLORS.success }}>{balanceDue > 0 ? inr(balanceDue) : "Fully paid"}</Typography>} />
              {manage.advance_received_by && (
                <InfoRow label="Advance Held By" value={<Chip label={manage.advance_received_by} size="small" sx={{ fontWeight: 700, bgcolor: alpha(COLORS.info, 0.12), color: COLORS.info }} />} />
              )}
              <InfoRow label="Payment Status" value={<Chip label={PM[manage.payment_status]?.label ?? manage.payment_status} size="small" sx={{ fontWeight: 700, bgcolor: alpha(PM[manage.payment_status]?.color ?? COLORS.textSecondary, 0.12), color: PM[manage.payment_status]?.color ?? COLORS.textSecondary }} />} />

              {manage.advances.length > 0 && (
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px dashed ${COLORS.border}` }}>
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: COLORS.textSecondary, mb: 1, letterSpacing: 0.5 }}>
                    RECEIPTS
                  </Typography>
                  <Stack spacing={1}>
                    {manage.advances.map(a => (
                      <Box key={a.id} sx={{ p: 1.25, borderRadius: 2, border: `1px solid ${COLORS.border}`, bgcolor: alpha(COLORS.bgMain, 0.4) }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, fontFamily: "monospace" }}>{a.receipt_number}</Typography>
                          <Chip label={a.status} size="small" color={a.status === "ACTIVE" ? "success" : "default"} sx={{ height: 20, fontSize: "0.62rem" }} />
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          <Typography sx={{ fontSize: "0.8rem", fontWeight: 800 }}>{inr(a.amount)}</Typography>
                          <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>{a.payment_mode} · {a.received_by}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.75 }}>
                          <Button size="small" startIcon={<Description sx={{ fontSize: 16 }} />}
                            onClick={() => tourService.downloadAdvanceReceipt(id, a.id, a.receipt_number)
                              .catch(() => enqueueSnackbar("Could not download receipt", { variant: "error" }))}>
                            Receipt
                          </Button>
                          {a.status === "ACTIVE" && !isTerminal && (
                            <Button size="small" color="error"
                              onClick={() => {
                                const reason = window.prompt("Reason for voiding this advance?");
                                if (reason && reason.trim().length >= 3) {
                                  runManage(() => tourService.voidAdvance(id, a.id, reason.trim()), "Advance voided");
                                } else if (reason) {
                                  enqueueSnackbar("Reason must be at least 3 characters", { variant: "error" });
                                }
                              }}>
                              Void
                            </Button>
                          )}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Card>
          </Grid>

          {/* Vehicle & driver */}
          <Grid item xs={12} md={6}>
            <Card title="Vehicle & Driver" icon={<DirectionsCar sx={{ fontSize: 18, color: COLORS.gold }} />}
              action={!isTerminal && <Button size="small" startIcon={<EditCalendar />} onClick={() => setManageModal("fleet")}>Assign</Button>}
              >
              {manage.vehicle || manage.driver ? (
                <>
                  {manage.vehicle && (
                    <InfoRow label="Vehicle" value={`${manage.vehicle.registration_number} — ${[manage.vehicle.vehicle_brand, manage.vehicle.vehicle_model].filter(Boolean).join(" ")}`} />
                  )}
                  {manage.driver && (
                    <InfoRow label="Driver" value={`${manage.driver.full_name}${manage.driver.mobile ? ` · ${manage.driver.mobile}` : ""}`} />
                  )}
                </>
              ) : (
                <Typography sx={{ fontSize: "0.8rem", color: COLORS.textSecondary, py: 0.5 }}>
                  No vehicle or driver assigned yet — assign from your fleet before the trip starts.
                </Typography>
              )}
              {manage.pickup_location && (
                <Box sx={{ mt: 1.25, pt: 1.25, borderTop: `1px dashed ${COLORS.border}` }}>
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: COLORS.textSecondary, letterSpacing: 0.5 }}>PICKUP</Typography>
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, mt: 0.25 }}>{manage.pickup_location}</Typography>
                  {manage.pickup_datetime && (
                    <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>{fmtDateTime(manage.pickup_datetime)}</Typography>
                  )}
                </Box>
              )}
              {manage.hotel_details && (
                <Box sx={{ mt: 1.25, pt: 1.25, borderTop: `1px dashed ${COLORS.border}` }}>
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: COLORS.textSecondary, letterSpacing: 0.5 }}>HOTEL PLAN</Typography>
                  <Typography sx={{ fontSize: "0.8rem", mt: 0.25, whiteSpace: "pre-wrap", color: COLORS.textSecondary }}>{manage.hotel_details}</Typography>
                </Box>
              )}
              {manage.other_details && (
                <Box sx={{ mt: 1.25, pt: 1.25, borderTop: `1px dashed ${COLORS.border}` }}>
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: COLORS.textSecondary, letterSpacing: 0.5 }}>OTHER NOTES</Typography>
                  <Typography sx={{ fontSize: "0.8rem", mt: 0.25, whiteSpace: "pre-wrap", color: COLORS.textSecondary }}>{manage.other_details}</Typography>
                </Box>
              )}
            </Card>
          </Grid>

          {/* Additional charges */}
          <Grid item xs={12} md={6}>
            <Card title="Additional Charges" icon={<AddCircle sx={{ fontSize: 18, color: COLORS.gold }} />}
              action={!isTerminal && <Button size="small" startIcon={<AddCircle />} onClick={() => setManageModal("charge")}>Add</Button>}
              >
              {manage.charges.length > 0 ? (
                <Stack spacing={1}>
                  {manage.charges.map(c => (
                    <Stack key={c.id} direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>{c.label}</Typography>
                        <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
                          {c.reason || "—"} · added by {c.added_by_role ?? "—"}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 800 }}>{inr(c.amount)}</Typography>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ fontSize: "0.8rem", color: COLORS.textSecondary, py: 0.5 }}>
                  No additional charges. Add one when the trip is modified (extra days, extra stops).
                </Typography>
              )}
              {manage.additional_amount > 0 && (
                <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.5, pt: 1.5, borderTop: `1px dashed ${COLORS.border}` }}>
                  <Typography sx={{ fontSize: "0.8rem", color: COLORS.textSecondary }}>Total additional</Typography>
                  <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, color: "#F97316" }}>{inr(manage.additional_amount)}</Typography>
                </Stack>
              )}
            </Card>
          </Grid>

          {/* Invoice */}
          <Grid item xs={12} md={6}>
            <Card title="Invoice & PDF" icon={<Badge sx={{ fontSize: 18, color: COLORS.gold }} />}
              >
              <Button fullWidth variant="outlined" startIcon={<CardTravel />} sx={{ mt: 0.5, fontWeight: 700 }}
                onClick={() => tourService.downloadItinerary(id)
                  .then(() => enqueueSnackbar("Itinerary downloaded", { variant: "success" }))
                  .catch(() => enqueueSnackbar("Could not download itinerary", { variant: "error" }))}>
                Download Itinerary (PDF)
              </Button>
              {manage.invoice_number ? (
                <InfoRow label="Invoice" value={<Typography sx={{ fontWeight: 700, fontFamily: "monospace" }}>{manage.invoice_number}</Typography>} />
              ) : (
                <Typography sx={{ fontSize: "0.8rem", color: COLORS.textSecondary, py: 0.5 }}>
                  No invoice generated yet. Generate it when the trip is done so the customer can pay the balance.
                </Typography>
              )}
              <Button fullWidth variant="outlined" startIcon={<Description />} sx={{ mt: 1.25, fontWeight: 700 }}
                onClick={() => tourService.downloadInvoice(id)
                  .then(() => { enqueueSnackbar("Invoice downloaded", { variant: "success" }); load(); })
                  .catch(() => enqueueSnackbar("Could not download invoice", { variant: "error" }))}>
                {manage.invoice_number ? "Download Invoice" : "Generate & Download Invoice"}
              </Button>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── Special requests ── */}
      {data.special_requests && (
        <Paper elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, p: 2.5, mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Schedule sx={{ fontSize: 18, color: COLORS.gold }} />
            <Typography sx={{ fontWeight: 700, fontSize: "0.88rem" }}>Special Requests</Typography>
          </Stack>
          <Typography sx={{ fontSize: "0.85rem", color: COLORS.textSecondary, whiteSpace: "pre-wrap" }}>
            {data.special_requests}
          </Typography>
        </Paper>
      )}

      {/* ── Participants ── */}
      <Paper elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden", mb: 3 }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${COLORS.border}`, bgcolor: alpha(COLORS.bgMain, 0.5), display: "flex", alignItems: "center", gap: 1 }}>
          <Groups sx={{ fontSize: 18, color: COLORS.gold }} />
          <Typography sx={{ fontWeight: 700, fontSize: "0.88rem" }}>Participants ({data.participants.length})</Typography>
        </Box>
        {data.participants.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography sx={{ fontSize: "0.85rem", color: COLORS.textSecondary }}>
              No participant list was provided for this booking.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            {data.participants.map((p: PartnerTourParticipant, i: number) => (
              <Stack
                key={p.id}
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{ px: 2.5, py: 1.5, borderBottom: i < data.participants.length - 1 ? `1px solid ${COLORS.border}` : "none" }}
              >
                <Box sx={{ width: 30, height: 30, borderRadius: "50%", bgcolor: alpha(COLORS.gold, 0.15), color: COLORS.goldDark, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.75rem", flexShrink: 0 }}>
                  {i + 1}
                </Box>
                <Box flex={1}>
                  <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>{p.participant_name}</Typography>
                  <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mt: 0.25 }}>
                    {p.mobile && <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>📱 {p.mobile}</Typography>}
                    {p.age != null && <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>Age: {p.age}</Typography>}
                    {p.gender && <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>{p.gender}</Typography>}
                    {p.id_type && <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>{p.id_type}{p.id_number ? `: ${p.id_number}` : ""}</Typography>}
                  </Stack>
                </Box>
              </Stack>
            ))}
          </Box>
        )}
      </Paper>

      {/* ── Timeline ── */}
      {data.timeline.length > 0 && (
        <Paper elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden" }}>
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${COLORS.border}`, bgcolor: alpha(COLORS.bgMain, 0.5), display: "flex", alignItems: "center", gap: 1 }}>
            <Payments sx={{ fontSize: 18, color: COLORS.gold }} />
            <Typography sx={{ fontWeight: 700, fontSize: "0.88rem" }}>Activity Timeline</Typography>
          </Box>
          <Box sx={{ px: 2.5, py: 2 }}>
            {data.timeline.map((t, i) => (
              <Stack key={i} direction="row" spacing={1.5} sx={{ position: "relative", pb: i < data.timeline.length - 1 ? 2 : 0 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: COLORS.gold, mt: 0.6, flexShrink: 0, zIndex: 1 }} />
                {i < data.timeline.length - 1 && (
                  <Box sx={{ position: "absolute", left: 4, top: 14, bottom: -4, width: 2, bgcolor: alpha(COLORS.gold, 0.3) }} />
                )}
                <Box flex={1} minWidth={0}>
                  <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>{t.event_description}</Typography>
                  <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary }}>{fmtDateTime(t.event_timestamp)}</Typography>
                </Box>
              </Stack>
            ))}
          </Box>
        </Paper>
      )}

      {/* ── Cancel dialog ── */}
      <CancelDialog
        open={cancelOpen}
        submitting={busy}
        onClose={() => setCancelOpen(false)}
        onSubmit={(reason) => {
          setCancelOpen(false);
          runAction("CANCELLED", "Tour booking cancelled", reason);
        }}
      />

      {/* ── Manage modals ── */}
      <TourAdvanceModal
        open={manageModal === "advance"} onClose={() => setManageModal(null)} submitting={manageSubmitting}
        totalAmount={manage?.total_amount ?? data.total_amount}
        advanceTotal={manage?.advance_total ?? 0}
        isFullPayment={s === "COMPLETED" || (s === "IN_PROGRESS" && !isPaid)}
        onSubmit={(p) => runManage(() => tourService.collectAdvance(id, p), isPaid ? "Payment recorded" : "Advance recorded")}
      />
      <TourFleetModal
        open={manageModal === "fleet"} onClose={() => setManageModal(null)} submitting={manageSubmitting}
        fleet={manage?.fleet} current={manage}
        onSubmit={(p) => runManage(() => tourService.assignVehicle(id, p), "Vehicle & driver assigned")}
      />
      <TourEditTripModal
        open={manageModal === "edit"} onClose={() => setManageModal(null)} submitting={manageSubmitting}
        booking={manage}
        onSubmit={(p) => runManage(() => tourService.updateTrip(id, p), "Trip updated")}
      />
      <TourChargeModal
        open={manageModal === "charge"} onClose={() => setManageModal(null)} submitting={manageSubmitting}
        onSubmit={(p) => runManage(() => tourService.addCharge(id, p), "Additional charge added")}
      />
    </Box>
  );
}
