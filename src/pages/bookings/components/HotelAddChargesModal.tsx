// ============================================================
// WAYTERO PARTNER PORTAL — ADD CHARGES MODAL
// Endpoint: POST /partners/me/hotel-bookings/{id}/add-charges
// Guard: CHECKED_IN / IN_HOUSE / CHECKED_OUT — only when no invoice exists
// ============================================================
import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, CircularProgress,
  Stack, Avatar, Divider, Alert, InputAdornment,
} from "@mui/material";
import { AddCard, Close, InfoOutlined } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { hotelBookingService } from "../../../services/hotel-booking.service";
import { COLORS } from "../../../theme";

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  reservationId: number;
  /** Current bill total — used for the "new total" preview. */
  currentTotal: number;
}

const fmt = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function HotelAddChargesModal({ open, onClose, onDone, reservationId, currentTotal }: Props) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const amt = parseFloat(amount);
  const amtValid = !!amt && amt > 0;
  const preview = amtValid ? currentTotal + amt : null;

  async function submit() {
    if (!amtValid) { setErr("Enter a valid amount"); return; }
    if (!description.trim()) { setErr("Description is required"); return; }
    setBusy(true); setErr(null);
    try {
      await hotelBookingService.addCharges(reservationId, amt, description.trim());
      enqueueSnackbar(`Added ${fmt(amt)} to the bill`, { variant: "success" });
      onDone();
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? "Failed to add charges";
      setErr(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setBusy(false);
    }
  }

  const handleClose = () => { setErr(null); setAmount(""); setDescription(""); onClose(); };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3, m: 2 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Avatar sx={{ bgcolor: COLORS.gold, width: 40, height: 40 }}>
              <AddCard />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} fontSize="1rem">
                Add Extra Charges
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

        <Stack spacing={2}>
          <TextField
            size="small"
            fullWidth
            label="Amount (₹) *"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputProps={{ min: 0.01, step: 0.01 }}
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
            }}
          />
          <TextField
            size="small"
            fullWidth
            label="Description *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Extra bed, Food, Laundry…"
          />
          {preview != null && (
            <Alert severity="info" icon={<InfoOutlined />} sx={{ borderRadius: 2, py: 0.5 }}>
              New total estimate: <strong>{fmt(preview)}</strong>
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit" disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained" onClick={submit} disabled={busy}
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <AddCard />}
          sx={{ fontWeight: 700 }}
        >
          {busy ? "Adding…" : "Add Charges"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
