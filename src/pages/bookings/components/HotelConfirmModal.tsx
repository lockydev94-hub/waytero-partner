// ============================================================
// WAYTERO PARTNER PORTAL — CONFIRM RESERVATION MODAL
// Endpoint: POST /partners/me/hotel-bookings/{id}/confirm
// Guard: AWAITING_HOTEL_CONFIRMATION only
// ============================================================
import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, CircularProgress,
  Stack, Avatar, Divider, Alert,
} from "@mui/material";
import { CheckCircle, Close } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { hotelBookingService } from "../../../services/hotel-booking.service";
import { COLORS } from "../../../theme";

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  reservationId: number;
}

export default function HotelConfirmModal({ open, onClose, onDone, reservationId }: Props) {
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  async function submit() {
    setBusy(true); setErr(null);
    try {
      await hotelBookingService.confirm(reservationId, confirmationNumber.trim() || undefined);
      enqueueSnackbar("Reservation confirmed", { variant: "success" });
      onDone();
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? "Confirmation failed";
      setErr(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setBusy(false);
    }
  }

  const handleClose = () => { setErr(null); setConfirmationNumber(""); onClose(); };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3, m: 2 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Avatar sx={{ bgcolor: COLORS.gold, width: 40, height: 40 }}>
              <CheckCircle />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} fontSize="1rem">
                Confirm Reservation
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
        <TextField
          fullWidth
          size="small"
          label="Hotel Confirmation Number (optional)"
          value={confirmationNumber}
          onChange={(e) => setConfirmationNumber(e.target.value)}
          placeholder="e.g. HTL-2025-X1234"
          helperText="The reference your property gave on the booking voucher."
        />
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit" disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained" onClick={submit} disabled={busy}
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <CheckCircle />}
          sx={{ bgcolor: COLORS.gold, color: "#fff", "&:hover": { bgcolor: COLORS.goldDark }, fontWeight: 700 }}
        >
          {busy ? "Confirming…" : "Confirm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
