// ============================================================
// WAYTERO PARTNER PORTAL — RECORD ADVANCE MODAL
// Endpoint: POST /partners/me/hotel-bookings/{id}/record-advance
// Guard: PENDING_PAYMENT..CHECKED_OUT — when balance due > 0
// ============================================================
import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, CircularProgress,
  Stack, Avatar, Divider, Alert, InputAdornment,
  FormControl, InputLabel, Select, MenuItem, Paper,
} from "@mui/material";
import { Payment, Close, InfoOutlined } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { hotelBookingService } from "../../../services/hotel-booking.service";
import { COLORS } from "../../../theme";

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  reservationId: number;
  /** Balance still due on this reservation — drives the upper bound. */
  balanceDue: number;
}

const fmt = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const MODES = [
  { value: "CASH",   label: "Cash" },
  { value: "UPI",    label: "UPI" },
  { value: "ONLINE", label: "Online" },
  { value: "WALLET", label: "Wallet" },
];

export default function HotelRecordAdvanceModal({ open, onClose, onDone, reservationId, balanceDue }: Props) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const amt = parseFloat(amount);
  const amtValid = !!amt && amt > 0;
  const exceedsBalance = amtValid && amt > balanceDue;

  async function submit() {
    if (!amtValid) { setErr("Enter a valid amount"); return; }
    if (exceedsBalance) { setErr(`Cannot exceed balance due ${fmt(balanceDue)}`); return; }
    setBusy(true); setErr(null);
    try {
      await hotelBookingService.recordAdvance(reservationId, {
        amount: amt,
        payment_mode: mode,
        reference_number: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      enqueueSnackbar(`Recorded ${fmt(amt)} advance`, { variant: "success" });
      onDone();
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? "Failed to record advance";
      setErr(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setBusy(false);
    }
  }

  const handleClose = () => {
    setErr(null); setAmount(""); setMode("CASH");
    setReferenceNumber(""); setNotes(""); onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3, m: 2 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Avatar sx={{ bgcolor: COLORS.gold, width: 40, height: 40 }}>
              <Payment />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} fontSize="1rem">
                Record Advance
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

        <Alert severity="info" icon={<InfoOutlined />} sx={{ mb: 2, borderRadius: 2, py: 0.5 }}>
          Balance due: <strong>{fmt(balanceDue)}</strong>
        </Alert>

        <Stack spacing={2}>
          <TextField
            size="small"
            fullWidth
            label="Amount (₹) *"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputProps={{ min: 0.01, step: 0.01, max: balanceDue }}
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
            }}
            error={exceedsBalance}
            helperText={exceedsBalance ? `Cannot exceed balance due ${fmt(balanceDue)}` : ""}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Payment Mode</InputLabel>
            <Select value={mode} onChange={(e) => setMode(e.target.value)} label="Payment Mode">
              {MODES.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            size="small"
            fullWidth
            label="Reference (optional)"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="UPI txn id, cheque #, etc."
          />
          <TextField
            size="small"
            fullWidth
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={2}
          />
        </Stack>

        {amtValid && !exceedsBalance && (
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mt: 2 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">Advance</Typography>
              <Typography variant="caption" fontWeight={700} sx={{ color: COLORS.gold }}>
                {fmt(amt)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" mt={0.5}>
              <Typography variant="caption" color="text.secondary">Balance after</Typography>
              <Typography variant="caption" fontWeight={700} color={balanceDue - amt > 0 ? "error.main" : "success.main"}>
                {fmt(Math.max(0, balanceDue - amt))}
              </Typography>
            </Stack>
          </Paper>
        )}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit" disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained" onClick={submit} disabled={busy || !amtValid || exceedsBalance}
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <Payment />}
          sx={{ bgcolor: COLORS.gold, color: "#fff", "&:hover": { bgcolor: COLORS.goldDark }, fontWeight: 700 }}
        >
          {busy ? "Recording…" : "Record Advance"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
