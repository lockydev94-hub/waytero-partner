// ============================================================
// WAYTERO PARTNER PORTAL — CHECK-OUT MODAL
// Endpoint: POST /partners/me/hotel-bookings/{id}/check-out
// Guard: IN_HOUSE only
//
// 2-step rewrite: the flat `datetime-local` field is replaced by
// `DateTimeStepPicker`. The picker's earliest selectable date is
// `minDate` from the actual check-in stamp so the partner can't
// record a check-out that predates the check-in (the backend would
// reject it as a negative-stay bill).
// ============================================================
import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, CircularProgress,
  Stack, Avatar, Divider, Alert, Chip,
} from "@mui/material";
import {
  Logout, Close, AccessTime, InfoOutlined,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { hotelBookingService } from "../../../services/hotel-booking.service";
import { COLORS } from "../../../theme";
import DateTimeStepPicker from "../../../components/forms/DateTimeStepPicker";

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  reservationId: number;
  /** Actual check-in ISO timestamp — earliest selectable date in the picker. */
  recordedCheckInAt?: string | null;
  /** Platform timezone label (e.g. "Asia/Kolkata") — shown in the picker. */
  platformTimezone?: string | null;
}

function isoToDateTime(iso: string): { date: string; time: string } {
  // `datetime-local` wants "YYYY-MM-DDTHH:mm" — i.e. local-zone fields.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return {
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
      time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    };
  }
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}

export default function HotelCheckOutModal({
  open, onClose, onDone, reservationId,
  recordedCheckInAt, platformTimezone,
}: Props) {
  const [additionalCharges, setAdditionalCharges] = useState("0");
  const [notes, setNotes] = useState("");
  const [coDate, setCoDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [coTime, setCoTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { enqueueSnackbar } = useSnackbar();

  // Reset state when the modal opens; default to "now".
  useEffect(() => {
    if (!open) return;
    const d = new Date();
    setCoDate(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
    setCoTime(
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
    );
    setAdditionalCharges("0");
    setNotes("");
    setErr(null);
  }, [open]);

  // Earliest selectable date is the recorded check-in (or no constraint if
  // the check-in stamp is missing for some reason).
  const minDate = useMemo(() => {
    if (!recordedCheckInAt) return null;
    return isoToDateTime(recordedCheckInAt).date;
  }, [recordedCheckInAt]);

  // Build a local-zone ISO from the picker's date+time, then to UTC ISO Z.
  const isoCheckOutAt = useMemo(() => {
    if (!coDate || !coTime) return undefined;
    const local = new Date(`${coDate}T${coTime}`);
    if (Number.isNaN(local.getTime())) return undefined;
    return local.toISOString();
  }, [coDate, coTime]);

  // Same-day before check-in is invalid — surface a soft warning before submit.
  const beforeCheckIn = useMemo(() => {
    if (!isoCheckOutAt || !recordedCheckInAt) return false;
    return new Date(isoCheckOutAt).getTime() < new Date(recordedCheckInAt).getTime();
  }, [isoCheckOutAt, recordedCheckInAt]);

  async function submit() {
    if (!isoCheckOutAt) {
      setErr("Actual check-out time is required — set it before checking out.");
      return;
    }
    setBusy(true); setErr(null);
    try {
      await hotelBookingService.checkOut(reservationId, {
        additional_charges: parseFloat(additionalCharges) || 0,
        check_out_notes: notes.trim() || undefined,
        actual_check_out_at: isoCheckOutAt,
      });
      enqueueSnackbar("Guest checked out successfully", { variant: "success" });
      onDone();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === "string"
        ? detail
        : (detail?.message || "Check-out failed");
      setErr(msg);
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  const handleClose = () => {
    setErr(null);
    onClose();
  };

  const chargesNum = parseFloat(additionalCharges) || 0;
  const chargesInvalid = additionalCharges !== "" && chargesNum < 0;

  return (
    <Dialog
      open={open} onClose={handleClose}
      maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, m: 2 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Avatar sx={{ bgcolor: "#F59E0B", width: 40, height: 40 }}>
              <Logout />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} fontSize="1rem">
                Check Out Guest
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Reservation #{reservationId}
              </Typography>
            </Box>
          </Stack>
          <Button size="small" onClick={handleClose} sx={{ minWidth: 0 }}>
            <Close fontSize="small" />
          </Button>
        </Stack>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {err && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{err}</Alert>}

        <Stack gap={2.5}>
          {/* Additional charges */}
          <TextField
            label="Additional Charges (₹)"
            type="number"
            value={additionalCharges}
            onChange={(e) => setAdditionalCharges(e.target.value)}
            size="small"
            fullWidth
            error={chargesInvalid}
            helperText={chargesInvalid ? "Must be zero or positive" : "Billed at the partner's discretion (food, laundry, damage, etc.)"}
            inputProps={{ min: 0, step: 0.01 }}
          />

          {/* Actual Check-Out Time — 2-step picker */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <AccessTime fontSize="small" sx={{ color: COLORS.gold }} />
              <Typography variant="subtitle2" fontWeight={700}>
                Actual Check-Out Time *
              </Typography>
              {recordedCheckInAt && (
                <Chip
                  label={`Stayed since ${isoToDateTime(recordedCheckInAt).date}`}
                  size="small"
                  variant="outlined"
                  sx={{ ml: 1, fontSize: "0.7rem" }}
                />
              )}
            </Stack>
            <DateTimeStepPicker
              valueDate={coDate}
              valueTime={coTime}
              minDate={minDate}
              maxDate={null}
              timezoneLabel={platformTimezone || "Asia/Kolkata"}
              onChange={(next) => {
                setCoDate(next.date);
                setCoTime(next.time);
              }}
            />
            {beforeCheckIn && (
              <Alert severity="warning" icon={<InfoOutlined />} sx={{ mt: 1, borderRadius: 2, py: 0.5 }}>
                Check-out time is before the recorded check-in. Please adjust.
              </Alert>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              Late check-outs may attract overtime charges that the platform calculates automatically.
            </Typography>
          </Box>

          {/* Notes */}
          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            size="small"
            fullWidth
            multiline
            rows={2}
            placeholder="Any notes about the check-out"
          />
        </Stack>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit" disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained" color="warning"
          disabled={busy || beforeCheckIn || !isoCheckOutAt}
          onClick={submit}
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <Logout />}
          sx={{ fontWeight: 700 }}
        >
          {busy ? "Checking Out…" : "Check Out"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
