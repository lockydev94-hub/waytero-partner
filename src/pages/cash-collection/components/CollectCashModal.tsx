// ============================================================
// WAYTERO PARTNER PORTAL — COLLECT CASH MODAL
// Confirms a cash handover from one driver for the selected bookings.
//
// Flow: review driver + amount breakdown → re-type the counted amount →
// the typed figure must match the selected total before Collect enables.
// The server re-verifies the same match, so this is a usability guard,
// not the security boundary.
// Endpoint: POST /partners/me/cash-collection/collect
// ============================================================
import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogActions, Button, Stack, Typography,
  Box, alpha, Chip, Divider, TextField, CircularProgress, Avatar,
  InputAdornment, ToggleButton, ToggleButtonGroup, Collapse,
} from "@mui/material";
import {
  Payments, CheckCircle, Phone, ErrorOutline, TaskAlt,
  DirectionsCar, Lock,
} from "@mui/icons-material";
import { COLORS } from "../../../theme";
import type { PendingCashBooking, CollectResponse } from "../../../services/cashCollection.service";

interface Props {
  open: boolean;
  driverName: string;
  driverCode: string | null;
  driverMobile: string | null;
  vehicleReg?: string | null;
  bookings: PendingCashBooking[];   // only the selected ones
  busy: boolean;
  error: string;
  result: CollectResponse | null;
  onClose: () => void;
  onConfirm: (payload: { entered_amount: number; payment_method: string; reference_note: string }) => void;
}

const fmtINR = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank" },
];

export default function CollectCashModal({
  open, driverName, driverCode, driverMobile, vehicleReg,
  bookings, busy, error, result, onClose, onConfirm,
}: Props) {
  const [entered, setEntered] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);

  const expected = useMemo(
    () => bookings.reduce((sum, b) => sum + b.cash_amount, 0),
    [bookings]
  );

  // Reset every time the dialog reopens so a previous attempt's typed amount
  // can never be reused against a different selection.
  useEffect(() => {
    if (open) { setEntered(""); setMethod("CASH"); setNote(""); setTouched(false); }
  }, [open]);

  const parsed = Number(entered);
  const isNumeric = entered.trim() !== "" && !Number.isNaN(parsed);
  // Tolerance mirrors the server's ₹0.01, so the button never enables on an
  // amount the API would reject.
  const matches = isNumeric && Math.abs(parsed - expected) <= 0.01;
  const showMismatch = touched && isNumeric && !matches;
  const diff = parsed - expected;

  const done = Boolean(result);

  function handleClose() {
    if (busy) return;
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>

      {/* Header */}
      <Box sx={{
        background: done
          ? `linear-gradient(135deg, ${COLORS.success} 0%, #059669 100%)`
          : `linear-gradient(135deg, ${COLORS.navyMid} 0%, ${COLORS.navy} 100%)`,
        px: 3, pt: 2.5, pb: 2.5,
      }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{
            width: 44, height: 44, borderRadius: 2,
            bgcolor: alpha("#fff", 0.15),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {done
              ? <TaskAlt sx={{ color: "#fff", fontSize: 26 }} />
              : <Payments sx={{ color: "#fff", fontSize: 26 }} />}
          </Box>
          <Box flex={1}>
            <Typography variant="h6" fontWeight={800} color="white" lineHeight={1.2}>
              {done ? "Cash Collected" : "Collect Cash from Driver"}
            </Typography>
            <Typography variant="caption" sx={{ color: alpha("#fff", 0.75) }}>
              {done
                ? result?.collection_number
                : `${bookings.length} booking${bookings.length === 1 ? "" : "s"} selected`}
            </Typography>
          </Box>
          <Chip
            label={fmtINR(done ? (result?.collected_amount ?? 0) : expected)}
            sx={{
              bgcolor: alpha("#fff", 0.18), color: "#fff",
              fontWeight: 800, fontSize: "0.85rem", height: 32,
            }}
          />
        </Stack>
      </Box>

      <DialogContent sx={{ pt: 3, pb: 1 }}>
        {done ? (
          /* ── Success state ───────────────────────────────── */
          <Stack spacing={2.5}>
            <Box sx={{
              p: 2.5, borderRadius: 2, textAlign: "center",
              background: `linear-gradient(135deg, ${alpha(COLORS.success, 0.08)} 0%, ${alpha(COLORS.gold, 0.05)} 100%)`,
              border: `1.5px solid ${alpha(COLORS.success, 0.3)}`,
            }}>
              <CheckCircle sx={{ fontSize: 44, color: COLORS.success, mb: 1 }} />
              <Typography variant="h5" fontWeight={900} color={COLORS.success}>
                {fmtINR(result?.collected_amount ?? 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                collected from <strong>{result?.driver_name}</strong> across{" "}
                <strong>{result?.bookings_count}</strong> booking(s)
              </Typography>
              <Chip
                label={result?.collection_number}
                size="small"
                sx={{ mt: 1.5, fontWeight: 700, bgcolor: alpha(COLORS.navy, 0.06) }}
              />
            </Box>

            <Box sx={{
              p: 2, borderRadius: 2,
              bgcolor: alpha(COLORS.info, 0.05),
              border: `1px solid ${alpha(COLORS.info, 0.18)}`,
            }}>
              <Typography variant="caption" fontWeight={800} color={COLORS.info}
                sx={{ letterSpacing: 1.2, display: "block", mb: 1 }}>
                SETTLED BOOKINGS
              </Typography>
              <Stack spacing={0.5}>
                {result?.booking_numbers.map((bn) => (
                  <Stack key={bn} direction="row" spacing={1} alignItems="center">
                    <CheckCircle sx={{ fontSize: 14, color: COLORS.success }} />
                    <Typography variant="caption" fontWeight={600}>{bn}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Stack>
        ) : (
          /* ── Verify state ────────────────────────────────── */
          <Stack spacing={2.5}>

            {/* Driver identity */}
            <Box sx={{
              p: 2, borderRadius: 2,
              bgcolor: alpha(COLORS.navy, 0.03),
              border: `1px solid ${COLORS.border}`,
            }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{
                  width: 46, height: 46, fontWeight: 800, fontSize: "1rem",
                  background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
                  color: "#000",
                }}>
                  {driverName?.[0]?.toUpperCase() ?? "D"}
                </Avatar>
                <Box flex={1} minWidth={0}>
                  <Typography fontWeight={800} fontSize="0.95rem" noWrap>
                    {driverName}
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    {driverMobile && (
                      <Stack direction="row" spacing={0.4} alignItems="center">
                        <Phone sx={{ fontSize: 13, color: COLORS.textSecondary }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {driverMobile}
                        </Typography>
                      </Stack>
                    )}
                    {vehicleReg && (
                      <Stack direction="row" spacing={0.4} alignItems="center">
                        <DirectionsCar sx={{ fontSize: 13, color: COLORS.textSecondary }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {vehicleReg}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </Box>
                {driverCode && (
                  <Chip label={driverCode} size="small"
                    sx={{ fontWeight: 700, fontSize: "0.65rem", bgcolor: alpha(COLORS.navy, 0.06) }} />
                )}
              </Stack>
            </Box>

            {/* Amount breakdown */}
            <Box sx={{
              p: 2, borderRadius: 2,
              bgcolor: alpha(COLORS.gold, 0.04),
              border: `1px solid ${alpha(COLORS.gold, 0.22)}`,
            }}>
              <Typography variant="overline" fontWeight={800}
                sx={{ letterSpacing: 1.4, color: COLORS.goldDark, display: "block", mb: 1 }}>
                Collection Breakdown
              </Typography>
              <Stack spacing={0.7} sx={{ maxHeight: 168, overflowY: "auto", pr: 0.5 }}>
                {bookings.map((b) => (
                  <Stack key={b.cab_booking_id} direction="row" justifyContent="space-between"
                    alignItems="center" spacing={1}>
                    <Box minWidth={0}>
                      <Typography variant="caption" fontWeight={700} noWrap display="block">
                        {b.booking_number}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block"
                        sx={{ fontSize: "0.66rem" }}>
                        {b.customer_name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={700} whiteSpace="nowrap">
                      {fmtINR(b.cash_amount)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
              <Divider sx={{ my: 1.2 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={800} fontSize="0.9rem">
                  Total to Collect
                </Typography>
                <Typography fontWeight={900} fontSize="1.15rem" color={COLORS.goldDark}>
                  {fmtINR(expected)}
                </Typography>
              </Stack>
            </Box>

            {/* Method */}
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary"
                sx={{ display: "block", mb: 0.8 }}>
                Received via
              </Typography>
              <ToggleButtonGroup
                value={method}
                exclusive
                fullWidth
                size="small"
                onChange={(_, v) => v && setMethod(v)}
                disabled={busy}
              >
                {METHODS.map((m) => (
                  <ToggleButton key={m.value} value={m.value}
                    sx={{
                      fontWeight: 700, fontSize: "0.78rem", py: 0.8,
                      "&.Mui-selected": {
                        bgcolor: alpha(COLORS.gold, 0.16),
                        color: COLORS.goldDark,
                        "&:hover": { bgcolor: alpha(COLORS.gold, 0.24) },
                      },
                    }}>
                    {m.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            {/* Verification input */}
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary"
                sx={{ display: "block", mb: 0.8 }}>
                Count the money, then type the amount to confirm
              </Typography>
              <TextField
                fullWidth
                autoFocus
                value={entered}
                onChange={(e) => {
                  // Digits and a single decimal point only — keeps the typed
                  // figure directly comparable to the expected total.
                  const v = e.target.value.replace(/[^\d.]/g, "");
                  if ((v.match(/\./g)?.length ?? 0) > 1) return;
                  setEntered(v);
                  setTouched(true);
                }}
                disabled={busy}
                placeholder="0.00"
                inputMode="decimal"
                error={showMismatch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography fontWeight={900} fontSize="1.1rem"
                        color={matches ? COLORS.success : COLORS.textSecondary}>₹</Typography>
                    </InputAdornment>
                  ),
                  endAdornment: matches ? (
                    <InputAdornment position="end">
                      <CheckCircle sx={{ color: COLORS.success }} />
                    </InputAdornment>
                  ) : null,
                  sx: {
                    fontWeight: 900, fontSize: "1.25rem",
                    "& input": { letterSpacing: 0.5 },
                  },
                }}
              />

              <Collapse in={showMismatch}>
                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 1 }}>
                  <ErrorOutline sx={{ fontSize: 16, color: COLORS.error }} />
                  <Typography variant="caption" fontWeight={700} color={COLORS.error}>
                    {diff > 0
                      ? `${fmtINR(diff)} more than the selected total`
                      : `${fmtINR(Math.abs(diff))} short of the selected total`}
                  </Typography>
                </Stack>
              </Collapse>

              <Collapse in={matches}>
                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 1 }}>
                  <CheckCircle sx={{ fontSize: 16, color: COLORS.success }} />
                  <Typography variant="caption" fontWeight={700} color={COLORS.success}>
                    Amount verified — ready to collect.
                  </Typography>
                </Stack>
              </Collapse>
            </Box>

            {/* Note */}
            <TextField
              fullWidth
              size="small"
              label="Reference / note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
              inputProps={{ maxLength: 500 }}
            />

            {error && (
              <Box sx={{
                p: 1.5, borderRadius: 2,
                bgcolor: alpha(COLORS.error, 0.07),
                border: `1px solid ${alpha(COLORS.error, 0.22)}`,
              }}>
                <Typography variant="caption" color={COLORS.error} fontWeight={700}>
                  {error}
                </Typography>
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
        {done ? (
          <Button onClick={handleClose} variant="contained" fullWidth
            sx={{ fontWeight: 800 }}>
            Done
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={busy} variant="outlined" size="small">
              Cancel
            </Button>
            <Button
              onClick={() => onConfirm({
                entered_amount: parsed,
                payment_method: method,
                reference_note: note.trim(),
              })}
              disabled={busy || !matches || bookings.length === 0}
              variant="contained"
              size="small"
              startIcon={
                busy ? <CircularProgress size={14} color="inherit" />
                     : matches ? <Payments fontSize="small" />
                     : <Lock fontSize="small" />
              }
              sx={{ fontWeight: 800, minWidth: 200 }}
            >
              {busy ? "Collecting…" : `Collect ${fmtINR(expected)}`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
