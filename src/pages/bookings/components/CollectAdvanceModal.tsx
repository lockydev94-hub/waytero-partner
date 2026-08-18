// ============================================================
// WAYTERO PARTNER PORTAL — COLLECT ADVANCE PAYMENT MODAL
// Endpoints:
//   GET  /partners/me/bookings/{booking_number}/advance  — eligibility
//   POST /partners/me/bookings/{booking_number}/advance  — record advance
//   GET  /partners/me/bookings/{booking_number}/advance/receipt — PDF
// Partner can only record: PARTNER or DRIVER as receiver (never ADMIN)
// Doc Ref: BRD Part 3 §45
// ============================================================
import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, CircularProgress, Stack,
  Avatar, Divider, Alert, InputAdornment, TextField,
  Paper, Skeleton, Chip,
} from "@mui/material";
import {
  AccountBalanceWallet, Close, CurrencyRupee, CheckCircle,
  Warning, Person, DirectionsCar, LocalAtm, PhoneAndroid,
} from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { bookingService, type AdvanceEligibility } from "../../../services/booking.service";
import { COLORS } from "../../../theme";

interface Props {
  open: boolean;
  onClose: () => void;
  bookingNumber: string;
}

const RECEIVER_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  PARTNER: { icon: <Person sx={{ fontSize: 18 }} />, label: "Received by Partner",  color: "#3B82F6" },
  DRIVER:  { icon: <DirectionsCar sx={{ fontSize: 18 }} />, label: "Received by Driver", color: "#8B5CF6" },
};

const MODE_META: Record<string, { icon: React.ReactNode; label: string }> = {
  CASH: { icon: <LocalAtm   sx={{ fontSize: 18 }} />, label: "Cash"  },
  UPI:  { icon: <PhoneAndroid sx={{ fontSize: 18 }} />, label: "UPI" },
};

function ReceiverButton({
  value, selected, onClick, meta,
}: {
  value: string; selected: boolean; onClick: () => void;
  meta: { icon: React.ReactNode; label: string; color: string };
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        flex: 1,
        p: 1.75,
        border: "2px solid",
        borderColor: selected ? meta.color : "divider",
        borderRadius: 2,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.5,
        bgcolor: selected ? `${meta.color}10` : "transparent",
        transition: "all 0.15s",
        "&:hover": { borderColor: meta.color },
      }}
    >
      <Box sx={{ color: selected ? meta.color : "text.secondary" }}>{meta.icon}</Box>
      <Typography variant="caption" fontWeight={selected ? 700 : 500} sx={{ color: selected ? meta.color : "text.secondary" }}>
        {meta.label}
      </Typography>
    </Box>
  );
}

function ModeButton({ value, selected, onClick, meta }: {
  value: string; selected: boolean; onClick: () => void;
  meta: { icon: React.ReactNode; label: string };
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        flex: 1,
        p: 1.5,
        border: "2px solid",
        borderColor: selected ? COLORS.gold : "divider",
        borderRadius: 2,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 1,
        bgcolor: selected ? `${COLORS.gold}12` : "transparent",
        transition: "all 0.15s",
        "&:hover": { borderColor: COLORS.gold },
      }}
    >
      <Box sx={{ color: selected ? COLORS.gold : "text.secondary" }}>{meta.icon}</Box>
      <Typography variant="body2" fontWeight={selected ? 700 : 500} sx={{ color: selected ? COLORS.gold : "text.secondary" }}>
        {meta.label}
      </Typography>
    </Box>
  );
}

export default function CollectAdvanceModal({ open, onClose, bookingNumber }: Props) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const [receiver, setReceiver] = useState<string>("");
  const [mode, setMode]         = useState<string>("");
  const [amount, setAmount]     = useState<string>("");
  const [refNote, setRefNote]   = useState<string>("");

  const { data: elig, isLoading, isError } = useQuery<AdvanceEligibility>({
    queryKey: ["partner-advance-elig", bookingNumber],
    queryFn: () => bookingService.getAdvanceEligibility(bookingNumber),
    enabled: open && !!bookingNumber,
  });

  useEffect(() => {
    if (open) { setReceiver(""); setMode(""); setAmount(""); setRefNote(""); }
  }, [open]);

  useEffect(() => { setMode(""); }, [receiver]);

  const availableModes: string[] = (receiver ? (elig?.modes_by_receiver?.[receiver] ?? []) : []);
  const maxAmt = elig?.max_amount ?? 0;
  const amtNum = parseFloat(amount) || 0;
  const amtValid = amtNum > 0 && amtNum <= maxAmt;

  const collectMut = useMutation({
    mutationFn: () =>
      bookingService.collectAdvance(bookingNumber, {
        amount: amtNum,
        payment_mode: mode,
        received_by: receiver,
        reference_note: refNote.trim() || undefined,
      }),
    onSuccess: (res) => {
      enqueueSnackbar(`Advance ₹${amtNum.toLocaleString()} recorded — ${res.receipt_number}`, { variant: "success" });
      qc.invalidateQueries({ queryKey: ["partner-advance-elig", bookingNumber] });
      qc.invalidateQueries({ queryKey: ["partner-booking", bookingNumber] });
      onClose();
    },
    onError: (e: any) =>
      enqueueSnackbar(e?.response?.data?.detail || "Failed to record advance", { variant: "error" }),
  });

  const canSubmit = !!receiver && !!mode && amtValid && !collectMut.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, m: 2 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Avatar sx={{ bgcolor: COLORS.gold, width: 40, height: 40 }}>
              <AccountBalanceWallet />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} fontSize="1rem">Collect Advance</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>{bookingNumber}</Typography>
            </Box>
          </Stack>
          <Button size="small" onClick={onClose} sx={{ minWidth: 0 }}><Close fontSize="small" /></Button>
        </Stack>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {isLoading && (
          <Stack gap={1.5}>
            <Skeleton variant="rounded" height={60} />
            <Skeleton variant="rounded" height={70} />
            <Skeleton variant="rounded" height={56} />
          </Stack>
        )}
        {isError && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>Failed to load advance details.</Alert>
        )}

        {elig && (
          <Stack gap={2}>
            {/* Existing advance banner */}
            {elig.advance && (
              <Alert severity="success" icon={<CheckCircle />} sx={{ borderRadius: 2 }}>
                <Typography variant="body2" fontWeight={700}>
                  Advance collected — ₹{elig.advance.amount?.toLocaleString()}
                </Typography>
                <Typography variant="caption">{elig.advance.receipt_number}</Typography>
              </Alert>
            )}

            {!elig.can_collect && !elig.advance && (
              <Alert severity="warning" icon={<Warning />} sx={{ borderRadius: 2 }}>
                {elig.blocked_reason}
              </Alert>
            )}

            {/* Fare */}
            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2, bgcolor: "grey.50" }}>
              <Typography variant="caption" color="text.secondary">Booking Fare</Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: COLORS.gold }}>
                ₹{maxAmt.toLocaleString("en-IN")}
              </Typography>
            </Paper>

            {elig.can_collect && (
              <>
                {/* Receiver */}
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    WHO RECEIVED THE MONEY?
                  </Typography>
                  <Stack direction="row" gap={1}>
                    {elig.allowed_receivers
                      .filter((r) => r !== "ADMIN")
                      .map((r) => (
                        <ReceiverButton
                          key={r}
                          value={r}
                          selected={receiver === r}
                          onClick={() => setReceiver(r)}
                          meta={RECEIVER_META[r]}
                        />
                      ))}
                  </Stack>
                </Box>

                {/* Mode */}
                {receiver && availableModes.length > 0 && (
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>
                      PAYMENT MODE
                    </Typography>
                    <Stack direction="row" gap={1}>
                      {availableModes.map((m) => (
                        <ModeButton
                          key={m}
                          value={m}
                          selected={mode === m}
                          onClick={() => setMode(m)}
                          meta={MODE_META[m] ?? { icon: null, label: m }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Amount */}
                {mode && (
                  <TextField
                    label="Amount (₹)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    type="number"
                    fullWidth
                    size="small"
                    inputProps={{ min: 1, max: maxAmt, step: 0.01 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><CurrencyRupee fontSize="small" /></InputAdornment>,
                    }}
                    helperText={amtNum > maxAmt ? `Cannot exceed fare ₹${maxAmt.toLocaleString()}` : `Max ₹${maxAmt.toLocaleString()}`}
                    error={!!amount && !amtValid}
                  />
                )}

                {/* UPI ref */}
                {mode === "UPI" && (
                  <TextField
                    label="UPI Reference (optional)"
                    value={refNote}
                    onChange={(e) => setRefNote(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="Transaction ID"
                  />
                )}

                {/* Preview */}
                {amtValid && (
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">Advance</Typography>
                      <Typography variant="caption" fontWeight={700} sx={{ color: COLORS.gold }}>₹{amtNum.toLocaleString()}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" mt={0.5}>
                      <Typography variant="caption" color="text.secondary">Balance Due</Typography>
                      <Typography variant="caption" fontWeight={700} color="error.main">₹{Math.max(0, maxAmt - amtNum).toLocaleString()}</Typography>
                    </Stack>
                  </Paper>
                )}
              </>
            )}
          </Stack>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 1.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" color="inherit" size="small">Close</Button>
        {elig?.can_collect && (
          <Button
            variant="contained"
            size="small"
            disabled={!canSubmit}
            onClick={() => collectMut.mutate()}
            startIcon={collectMut.isPending ? <CircularProgress size={14} color="inherit" /> : <AccountBalanceWallet />}
            sx={{ bgcolor: COLORS.gold, "&:hover": { bgcolor: "#C09000" }, fontWeight: 700, px: 2.5 }}
          >
            {collectMut.isPending ? "Recording..." : "Record Advance"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
