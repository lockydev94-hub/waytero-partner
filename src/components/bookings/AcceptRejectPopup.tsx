// ============================================================
// WAYTERO PARTNER PORTAL — GLOBAL ACCEPT/REJECT POPUP
// Doc Ref: BRD Part 7 §155 — Realtime UI
//
// Listens to RealtimeContext.pendingBooking — whenever it's set
// (typically because a WS event fired) this modal opens:
//
//   CAB   (PARTNER_ASSIGNMENT_REQUESTED)   → admin assigned a cab,
//         live countdown bound to acceptance_deadline; Accept →
//         POST /partners/me/bookings/{bn}/accept.
//   HOTEL (PARTNER_HOTEL_BOOKING_REQUESTED) → fixed-assigned hotel
//         reservation; Accept → POST /partners/me/hotel-bookings/{id}/accept.
//   TOUR  (PARTNER_TOUR_BOOKING_REQUESTED) → fixed-assigned tour
//         booking; Accept → POST /partners/tours/bookings/{id}/status.
//
// Reject: CAB uses the reason-code RejectDialog; HOTEL/TOUR use a
// simple reason prompt. The modal auto-closes when
// pendingBooking becomes null (admin reassigned, another tab
// responded, sweeper timed out).
//
// The component is mounted once at the dashboard layout level.
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Stack, Chip, Avatar,
  Alert, CircularProgress, alpha, useTheme, TextField,
} from "@mui/material";
import {
  CheckCircle, Cancel, Block, HourglassTop, LocationOn,
  Schedule, PersonPin, Receipt, Hotel, Tour, DateRange, Groups, Payments,
} from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { bookingService } from "../../services/booking.service";
import { hotelBookingService } from "../../services/hotel-booking.service";
import { tourService } from "../../services/tour.service";
import { useCountdown } from "../../hooks/useCountdown";
import {
  useRealtimeContext,
  type PendingBooking,
  type ServiceType,
} from "../../contexts/RealtimeContext";
import { stopRingtone } from "../../utils/audio";
import RejectDialog from "./RejectDialog";

const SERVICE_META: Record<
  ServiceType,
  { title: string; short: string; icon: JSX.Element; gradient: string; glow: string }
> = {
  CAB: {
    title: "New Cab Booking Assigned",
    short: "Cab",
    icon: <HourglassTop sx={{ color: "#fff", fontSize: 22 }} />,
    gradient: "linear-gradient(135deg, #F59E0B, #D97706)",
    glow: "rgba(245,158,11,0.35)",
  },
  HOTEL: {
    title: "New Hotel Booking",
    short: "Hotel",
    icon: <Hotel sx={{ color: "#fff", fontSize: 22 }} />,
    gradient: "linear-gradient(135deg, #3B82F6, #2563EB)",
    glow: "rgba(59,130,246,0.35)",
  },
  TOUR: {
    title: "New Tour Booking",
    short: "Tour",
    icon: <Tour sx={{ color: "#fff", fontSize: 22 }} />,
    gradient: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
    glow: "rgba(139,92,246,0.35)",
  },
};

/** Small reason prompt used for HOTEL/TOUR rejects. */
function SimpleRejectDialog({
  open, title, submitting, onClose, onSubmit,
}: {
  open: boolean;
  title: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onClose={() => !submitting && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={2}
          label="Reason for rejection"
          placeholder="e.g. Rooms not available on these dates"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={submitting}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={submitting || reason.trim().length < 2}
          startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <Block />}
          onClick={() => onSubmit(reason.trim())}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          {submitting ? "Rejecting…" : "Reject Booking"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AcceptRejectPopup() {
  const theme = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { pendingBooking, dismissPendingBooking } = useRealtimeContext();
  const open = !!pendingBooking;

  const serviceType = pendingBooking?.service_type ?? "CAB";
  const meta = SERVICE_META[serviceType];

  const [rejectOpen, setRejectOpen] = useState(false);
  const [simpleRejectOpen, setSimpleRejectOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const deadlineISO = pendingBooking?.acceptance_deadline ?? null;
  const { minutes, seconds, expired } = useCountdown(deadlineISO);
  // HOTEL/TOUR have no acceptance deadline — never show "expired".
  // useCountdown returns expired=true for a null deadline, so for those
  // services we must NOT treat the booking as expired — otherwise the
  // Accept/Reject buttons would be permanently disabled (the bug where
  // tour bookings couldn't be accepted).
  const showCountdown = serviceType === "CAB";
  const effectiveExpired = showCountdown ? expired : false;

  const invalidate = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["partner-bookings"] }),
      qc.invalidateQueries({ queryKey: ["partner-booking-counts"] }),
      qc.invalidateQueries({ queryKey: ["topbar-booking-counts"] }),
      qc.invalidateQueries({ queryKey: ["partner-hotel-bookings"] }),
      qc.invalidateQueries({ queryKey: ["partner-tour-bookings"] }),
    ]);
  }, [qc]);

  // Wrap dismiss so the ringtone stops at the same moment the popup
  // closes — accept/reject/close all funnel through here.
  const closePopup = useCallback(() => {
    stopRingtone();
    dismissPendingBooking();
  }, [dismissPendingBooking]);

  // If the CAB deadline hits zero in the modal, auto-close. The backend
  // sweeper will revert the cab and emit a WS event that clears
  // pendingBooking anyway — this just hides the UI faster.
  useEffect(() => {
    if (!open) return;
    if (showCountdown && expired) {
      const t = window.setTimeout(() => closePopup(), 1500);
      return () => window.clearTimeout(t);
    }
  }, [open, showCountdown, expired, closePopup]);

  const accept = useMutation({
    mutationFn: async () => {
      const b = pendingBooking!;
      if (b.service_type === "CAB") return bookingService.acceptBooking(b.booking_number);
      if (b.service_type === "HOTEL") return hotelBookingService.acceptBooking(b.booking_id);
      return tourService.acceptTourBooking(b.booking_id);
    },
    onSuccess: async (res) => {
      enqueueSnackbar(res?.message ?? "Booking accepted", { variant: "success" });
      closePopup();
      await invalidate();
      // Refresh the detail page if user is currently on it.
      if (pendingBooking && pendingBooking.service_type === "CAB") {
        qc.invalidateQueries({
          queryKey: ["partner-booking", pendingBooking.booking_number],
        });
      }
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail ?? "Failed to accept booking.";
      enqueueSnackbar(detail, { variant: "error" });
      closePopup();
    },
  });

  const onAccept = async () => {
    if (!pendingBooking || effectiveExpired) return;
    setSubmitting(true);
    try {
      accept.mutate();
    } finally {
      setSubmitting(false);
    }
  };

  const onSimpleRejectSubmit = async (reason: string) => {
    if (!pendingBooking) return;
    setSubmitting(true);
    try {
      const res =
        pendingBooking.service_type === "HOTEL"
          ? await hotelBookingService.rejectBooking(pendingBooking.booking_id, reason)
          : await tourService.rejectTourBooking(pendingBooking.booking_id, reason);
      enqueueSnackbar(res?.message ?? "Booking rejected", { variant: "success" });
      setSimpleRejectOpen(false);
      closePopup();
      await invalidate();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.detail ?? "Failed to reject booking", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const onRejectSuccess = async () => {
    setRejectOpen(false);
    closePopup();
    await invalidate();
  };

  const onViewDetails = () => {
    if (!pendingBooking) return;
    const b = pendingBooking;
    if (b.service_type === "CAB") navigate(`/dashboard/bookings/${b.booking_number}`);
    else if (b.service_type === "HOTEL") navigate(`/dashboard/bookings/hotel/${b.booking_id}`);
    else navigate(`/dashboard/tours`);
    closePopup();
  };

  const primaryLine = useMemo(() => {
    const b = pendingBooking;
    if (!b) return null;
    if (b.service_type === "CAB") return b.pickup_location || null;
    if (b.service_type === "HOTEL") return b.hotel_name || null;
    return b.package_name || null;
  }, [pendingBooking]);

  const secondaryLine = useMemo(() => {
    const b = pendingBooking;
    if (!b) return null;
    try {
      if (b.service_type === "CAB" && b.pickup_datetime) {
        return new Date(b.pickup_datetime).toLocaleString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
      }
      if (b.service_type === "HOTEL" && b.check_in_date) {
        const cin = new Date(b.check_in_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        if (b.check_out_date) {
          const cout = new Date(b.check_out_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
          return `${cin} → ${cout}`;
        }
        return cin;
      }
      if (b.service_type === "TOUR" && b.travel_start_date) {
        return new Date(b.travel_start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      }
    } catch { /* fall through */ }
    return null;
  }, [pendingBooking]);

  return (
    <>
      <Dialog
        open={open}
        onClose={(_e, _r) => {
          if (_r !== "backdropClick") closePopup();
        }}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              border: `1.5px solid ${effectiveExpired ? alpha(theme.palette.error.main, 0.7) : meta.gradient.includes("F59E0B") ? "#F59E0B" : alpha("#94A3B8", 0.4)}`,
              // Solid white background — alpha-blended gradient was rendering
              // nearly invisible on the dark dashboard underneath. A bright
              // opaque paper guarantees text contrast regardless of theme.
              backgroundColor: "#FFFFFF",
              backgroundImage: `linear-gradient(135deg, ${alpha(meta.gradient.includes("F59E0B") ? "#F59E0B" : "#64748B", 0.08)} 0%, ${alpha("#F1F5F9", 0.3)} 100%)`,
              color: "#1F2937",
              boxShadow: `0 24px 64px ${meta.glow}, 0 2px 8px rgba(0,0,0,0.08)`,
              zIndex: 1500,
            },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, pt: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{
              width: 44, height: 44, borderRadius: 2,
              background: meta.gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 16px ${meta.glow}`,
            }}>
              {meta.icon}
            </Box>
            <Box flex={1}>
              <Typography variant="h6" fontWeight={800} lineHeight={1.2} sx={{ color: "#1F2937" }}>
                {meta.title}
              </Typography>
              <Typography variant="caption" sx={{ color: "#6B7280", fontFamily: "monospace" }}>
                {pendingBooking?.booking_number}
              </Typography>
            </Box>
            {showCountdown && (
              <Chip
                icon={<HourglassTop sx={{ fontSize: 14, color: "#fff !important" }} />}
                label={expired ? "Expired" : `${minutes}:${String(seconds).padStart(2, "0")}`}
                sx={{
                  bgcolor: expired ? theme.palette.error.main : "#F59E0B",
                  color: "#fff",
                  fontWeight: 800,
                  fontFamily: "monospace",
                  letterSpacing: "0.04em",
                  "& .MuiChip-icon": { color: "#fff" },
                }}
              />
            )}
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 1.5, pb: 1 }}>
          {showCountdown && effectiveExpired ? (
            <Alert severity="error" sx={{ mb: 1, borderRadius: 2 }}>
              The acceptance window has expired. Admin will reassign the booking.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} icon={false}>
              {serviceType === "CAB" ? (
                <><strong>Accept within 10 minutes</strong> to assign a driver, or reject with a reason so admin can reassign.</>
              ) : (
                <>This booking is assigned to you. <strong>Accept</strong> to start managing it, or reject with a reason so admin can step in.</>
              )}
            </Alert>
          )}

          <Stack spacing={1.5}>
            {primaryLine && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                {serviceType === "CAB" ? (
                  <LocationOn sx={{ color: "primary.main", fontSize: 20 }} />
                ) : serviceType === "HOTEL" ? (
                  <Hotel sx={{ color: "primary.main", fontSize: 20 }} />
                ) : (
                  <Tour sx={{ color: "primary.main", fontSize: 20 }} />
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {serviceType === "CAB" ? "Pickup" : serviceType === "HOTEL" ? "Hotel" : "Package"}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {primaryLine}
                  </Typography>
                </Box>
              </Stack>
            )}
            {secondaryLine && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Schedule sx={{ color: "primary.main", fontSize: 20 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {serviceType === "CAB" ? "Pickup Time" : serviceType === "HOTEL" ? "Stay" : "Travel Date"}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {secondaryLine}
                  </Typography>
                </Box>
              </Stack>
            )}
            {pendingBooking?.total_amount != null && pendingBooking.total_amount > 0 && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Payments sx={{ color: "primary.main", fontSize: 20 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Booking Amount</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ₹{pendingBooking.total_amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Stack>
            )}
            {serviceType === "TOUR" && pendingBooking?.persons_count != null && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Groups sx={{ color: "primary.main", fontSize: 20 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Travellers</Typography>
                  <Typography variant="body2" fontWeight={600}>{pendingBooking.persons_count}</Typography>
                </Box>
              </Stack>
            )}
            {serviceType === "CAB" && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <PersonPin sx={{ color: "primary.main", fontSize: 20 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    You are the assigned partner
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    Admin will see your response in real time
                  </Typography>
                </Box>
              </Stack>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, gap: 1, flexWrap: "wrap" }}>
          <Button
            onClick={onViewDetails}
            startIcon={<Receipt fontSize="small" />}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            View Details
          </Button>
          <Box flex={1} />
          <Button
            onClick={() => {
              if (serviceType === "CAB") setRejectOpen(true);
              else setSimpleRejectOpen(true);
            }}
            color="error"
            variant="outlined"
            startIcon={<Block />}
            disabled={effectiveExpired || submitting || accept.isPending}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Reject
          </Button>
          <Button
            onClick={onAccept}
            variant="contained"
            startIcon={accept.isPending ? <CircularProgress size={14} color="inherit" /> : <CheckCircle />}
            disabled={effectiveExpired || submitting || accept.isPending}
            sx={{
              borderRadius: 2, fontWeight: 800,
              bgcolor: "#10B981",
              "&:hover": { bgcolor: "#059669" },
              boxShadow: "0 4px 12px rgba(16,185,129,0.35)",
            }}
          >
            {accept.isPending ? "Accepting…" : "Accept Booking"}
          </Button>
        </DialogActions>
      </Dialog>

      {pendingBooking?.service_type === "CAB" && (
        <RejectDialog
          open={rejectOpen}
          onClose={() => setRejectOpen(false)}
          bookingNumber={pendingBooking.booking_number}
          bookingId={pendingBooking.master_booking_id}
          onAccepted={onRejectSuccess}
        />
      )}

      {pendingBooking?.service_type !== "CAB" && (
        <SimpleRejectDialog
          open={simpleRejectOpen}
          title={`Reject ${meta.short} Booking`}
          submitting={submitting}
          onClose={() => setSimpleRejectOpen(false)}
          onSubmit={onSimpleRejectSubmit}
        />
      )}
    </>
  );
}
