// ============================================================
// WAYTERO PARTNER PORTAL — COLLECT PAYMENT (FINAL) MODAL
// Endpoint: POST /partners/me/hotel-bookings/{id}/collect-payment
// Guard: CHECKED_OUT / COMPLETED with invoice + balance > 0
//
// 3-layer duplicate guard:
//   1. Button is disabled while a request is in flight.
//   2. A 5-second in-memory fingerprint dedupe catches the "user clicks the
//      green button twice while waiting for the network" case.
//   3. The Idempotency-Key header is sent so a backend retry (or a true
//      double-tap that snuck past the in-memory guard) returns the same
//      payment instead of creating a duplicate receipt.
// ============================================================
import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, CircularProgress,
  Stack, Avatar, Divider, Alert, InputAdornment,
  FormControl, InputLabel, Select, MenuItem, Paper,
} from "@mui/material";
import { Payment, Close, InfoOutlined } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import apiClient from "../../../services/api";
import { COLORS } from "../../../theme";

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  reservationId: number;
  balanceDue: number;
}

/** Cheap, dependency-free 32-bit hash. Used only to fingerprint submit
 *  payloads for the in-memory dedupe; not for security. */
function quickHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

const fmt = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const MODES = [
  { value: "CASH",   label: "Cash" },
  { value: "UPI",    label: "UPI" },
  { value: "ONLINE", label: "Online / Card" },
];

export default function HotelCollectPaymentModal({ open, onClose, onDone, reservationId, balanceDue }: Props) {
  const [amount, setAmount] = useState<string>(String(balanceDue));
  const [mode, setMode] = useState("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // In-memory dedupe — a `signature|now-5s` window catches rapid double-taps.
  const lastSubmitSig = useRef<string | null>(null);
  const lastSubmitAt = useRef<number>(0);
  // Stable per-mount Idempotency-Key — backend keeps the response in a short
  // cache so a true retry returns the same receipt.
  const idempotencyKey = useRef<string | null>(null);

  const { enqueueSnackbar } = useSnackbar();

  // Reset whenever the modal opens.
  useEffect(() => {
    if (open) {
      setAmount(String(balanceDue));
      setMode("CASH");
      setReferenceNumber("");
      setErr(null);
      lastSubmitSig.current = null;
      lastSubmitAt.current = 0;
      idempotencyKey.current = null;
    }
  }, [open, balanceDue]);

  const amt = parseFloat(amount);
  const amtValid = !!amt && amt > 0;
  const exceedsBalance = amtValid && amt > balanceDue;
  const wouldOverpay = amtValid && amt > balanceDue + 0.01;

  async function submit() {
    if (!amtValid) { setErr("Enter a valid amount"); return; }
    if (exceedsBalance) { setErr(`Cannot exceed balance due ${fmt(balanceDue)}`); return; }

    // Layer 2 — in-memory fingerprint dedupe (5s window).
    const sig = `${amt}|${mode}|${referenceNumber.trim()}`;
    const now = Date.now();
    if (lastSubmitSig.current === sig && now - lastSubmitAt.current < 5000) {
      setErr("This exact payment was just submitted. Please wait a moment.");
      return;
    }
    lastSubmitSig.current = sig;
    lastSubmitAt.current = now;

    setBusy(true); setErr(null);
    try {
      // Layer 3 — Idempotency-Key header.
      if (!idempotencyKey.current) {
        idempotencyKey.current = `${Date.now()}-${quickHash(sig + Math.random().toString())}`;
      }
      const resp = await apiClient.post(
        `/partners/me/hotel-bookings/${reservationId}/collect-payment`,
        {
          amount: amt,
          payment_mode: mode,
          reference_number: referenceNumber.trim() || undefined,
        },
        { headers: { "Idempotency-Key": idempotencyKey.current } },
      );
      const data = resp.data?.data ?? resp.data;
      enqueueSnackbar(
        `Collected ${fmt(amt)}${data?.receipt_number ? ` — ${data.receipt_number}` : ""}`,
        { variant: "success" },
      );
      onDone();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : (detail?.message || "Failed to collect payment");
      setErr(msg);
      // Allow re-attempt by clearing the fingerprint.
      lastSubmitSig.current = null;
    } finally {
      setBusy(false);
    }
  }

  const handleClose = () => { setErr(null); onClose(); };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3, m: 2 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Avatar sx={{ bgcolor: COLORS.success || "#10B981", width: 40, height: 40 }}>
              <Payment />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} fontSize="1rem">
                Collect Final Payment
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
            error={wouldOverpay}
            helperText={wouldOverpay ? `Cannot exceed balance due ${fmt(balanceDue)}` : ""}
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
        </Stack>

        {amtValid && !wouldOverpay && (
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mt: 2 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">Collecting</Typography>
              <Typography variant="caption" fontWeight={700} color="success.main">
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
          variant="contained" color="success" onClick={submit}
          disabled={busy || !amtValid || exceedsBalance}
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <Payment />}
          sx={{ fontWeight: 700 }}
        >
          {busy ? "Collecting…" : "Collect"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
