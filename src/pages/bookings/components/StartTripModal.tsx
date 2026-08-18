// ============================================================
// WAYTERO PARTNER PORTAL — START TRIP MODAL
// Partner starts trip on driver's behalf
// Guard: cab must be DRIVER_ASSIGNED
// Endpoint: POST /partners/me/bookings/:bn/start-trip
// ============================================================
import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, Typography, CircularProgress,
  Box, alpha, useTheme,
} from "@mui/material";
import { PlayArrow, Speed, HelpOutline } from "@mui/icons-material";
import { bookingService } from "../../../services/booking.service";

interface Props {
  open: boolean;
  bookingNumber: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function StartTripModal({ open, bookingNumber, onClose, onSuccess }: Props) {
  const theme = useTheme();
  const [startKm, setStartKm] = useState("");
  const [startDt, setStartDt] = useState(() => new Date().toISOString().slice(0, 16));
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  function handleClose() {
    if (loading) return;
    setError(""); setStartKm(""); onClose();
  }

  async function handleSubmit() {
    if (!startKm || isNaN(Number(startKm)) || Number(startKm) < 0) {
      setError("Enter a valid odometer reading (≥ 0)."); return;
    }
    if (!startDt) { setError("Select trip start date & time."); return; }

    setLoading(true); setError("");
    try {
      await bookingService.startTrip(bookingNumber, {
        start_km: Number(startKm),
        start_datetime: new Date(startDt).toISOString(),
      });
      // onSuccess → handleModalSuccess closes modal + refreshes; no need to also call handleClose()
      onSuccess("Trip started successfully on driver's behalf.");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to start trip.");
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>

      {/* Gradient header */}
      <Box sx={{
        background: `linear-gradient(135deg, ${theme.palette.success.dark} 0%, ${theme.palette.success.main} 100%)`,
        px: 3, pt: 2.5, pb: 2,
      }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{
            width: 42, height: 42, borderRadius: 2,
            bgcolor: alpha("#fff", 0.15),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <PlayArrow sx={{ color: "#fff", fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} color="white" lineHeight={1.2}>
              Start Trip
            </Typography>
            <Typography variant="caption" sx={{ color: alpha("#fff", 0.75) }}>
              {bookingNumber} · Acting on driver's behalf
            </Typography>
          </Box>
        </Stack>
      </Box>

      <DialogContent sx={{ pt: 3, pb: 1 }}>
        <Stack spacing={2.5}>
          <Box sx={{
            p: 1.75, borderRadius: 2,
            bgcolor: alpha(theme.palette.info.main, 0.06),
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            display: "flex", gap: 1.25, alignItems: "flex-start",
          }}>
            <HelpOutline sx={{ color: "info.main", fontSize: 17, flexShrink: 0, mt: 0.15 }} />
            <Typography variant="caption" color="info.dark" lineHeight={1.7}>
              Record the vehicle odometer at trip start. This will move the booking
              to <strong>STARTED</strong> status. The driver app can continue from here.
            </Typography>
          </Box>

          <TextField
            label="Odometer Reading at Start (KM)"
            type="number"
            fullWidth
            value={startKm}
            onChange={e => { setStartKm(e.target.value); setError(""); }}
            InputProps={{ startAdornment: <Speed sx={{ mr: 1, color: "text.secondary", fontSize: 18 }} /> }}
            placeholder="e.g. 45280"
            size="small"
            inputProps={{ min: 0 }}
          />

          <TextField
            label="Trip Start Date & Time"
            type="datetime-local"
            fullWidth
            value={startDt}
            onChange={e => setStartDt(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
          />

          {error && (
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.error.main, 0.08), border: `1px solid ${alpha(theme.palette.error.main, 0.2)}` }}>
              <Typography variant="caption" color="error.main" fontWeight={600}>{error}</Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
        <Button onClick={handleClose} disabled={loading} variant="outlined" size="small">Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          variant="contained"
          color="success"
          size="small"
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <PlayArrow fontSize="small" />}
          sx={{ fontWeight: 700, minWidth: 130 }}
        >
          {loading ? "Starting…" : "Start Trip"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
