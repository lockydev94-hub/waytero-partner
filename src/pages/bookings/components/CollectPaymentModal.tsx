// ============================================================
// WAYTERO PARTNER PORTAL — COLLECT PAYMENT MODAL
// Partner records payment collection after trip completion
// CASH   → cash_pending_at = DRIVER; partner collects from driver
// WALLET → deduct balance_due from customer wallet
// Endpoint: POST /partners/me/bookings/:bn/collect-payment
//           GET  /partners/me/bookings/:bn/customer-wallet
// ============================================================
import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogActions,
  Button, Stack, Typography, CircularProgress,
  Box, alpha, useTheme, ToggleButton, ToggleButtonGroup,
  Divider, Chip, LinearProgress,
} from "@mui/material";
import {
  Payments, Money, AccountBalanceWallet, Warning,
  CheckCircleOutline,
} from "@mui/icons-material";
import { bookingService } from "../../../services/booking.service";

interface Props {
  open: boolean;
  bookingNumber: string;
  finalAmount: number;
  couponDiscount: number;
  advancePaid: number;
  customerName: string;
  onClose: () => void;
  onSuccess: (msg: string, paymentMode: string, invoiceNumber: string | null) => void;
}

const PAYMENT_MODES = [
  { value: "CASH",   label: "Cash",   icon: <Money /> },
  { value: "WALLET", label: "Wallet", icon: <AccountBalanceWallet /> },
];

const COLLECTORS = [
  { value: "DRIVER",  label: "Driver" },
  { value: "PARTNER", label: "Partner (You)" },
];

const fmtINR = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CollectPaymentModal({
  open, bookingNumber, finalAmount, couponDiscount, advancePaid, customerName,
  onClose, onSuccess,
}: Props) {
  const theme = useTheme();

  const [mode,          setMode]          = useState<"CASH" | "WALLET">("CASH");
  const [collector,     setCollector]     = useState("DRIVER");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletStatus,  setWalletStatus]  = useState<string | null>(null);
  const [walletFound,   setWalletFound]   = useState<boolean | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");

  const balanceDue = Math.max(0, +(finalAmount - couponDiscount - advancePaid).toFixed(2));

  // Fetch customer wallet when WALLET mode selected
  useEffect(() => {
    if (!open || mode !== "WALLET") return;
    setWalletLoading(true);
    setWalletFound(null);
    bookingService.getCustomerWallet(bookingNumber)
      .then(res => {
        setWalletFound(res.wallet_found);
        setWalletBalance(res.wallet_found ? (res.available_balance ?? 0) : 0);
        setWalletStatus(res.wallet_status ?? null);
      })
      .catch(() => { setWalletFound(false); setWalletBalance(null); setWalletStatus(null); })
      .finally(() => setWalletLoading(false));
  }, [open, mode, bookingNumber]);

  function handleClose() { if (loading) return; setError(""); onClose(); }

  async function handleSubmit() {
    if (!finalAmount || finalAmount <= 0) {
      setError("Trip must be closed with a final amount before collecting payment."); return;
    }
    if (mode === "WALLET") {
      if (walletFound === false || walletBalance === null) {
        setError("Customer wallet has no balance. Switch to Cash or ask customer to recharge."); return;
      }
      if (walletBalance < balanceDue) {
        setError(`Insufficient wallet balance ${fmtINR(walletBalance)}. Balance due: ${fmtINR(balanceDue)}.`); return;
      }
    }

    setLoading(true); setError("");
    try {
      const res = await bookingService.collectPayment(bookingNumber, {
        payment_mode: mode,
        payment_collected_by: collector,
      });
      // onSuccess triggers handleModalSuccess → setActiveModal(null) + load()
      // Do NOT call handleClose() here — that would double-close and race with load()
      onSuccess(
        `${mode === "CASH" ? "Cash" : "Wallet"} payment ${fmtINR(balanceDue)} recorded successfully.`,
        mode,
        res?.invoice_number ?? null,
      );
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to record payment.");
    } finally { setLoading(false); }
  }

  const walletFetched      = mode === "WALLET" && walletFound !== null && !walletLoading;
  const walletInsufficient = walletFetched && (walletFound === false || (walletBalance !== null && walletBalance < balanceDue));
  const walletSufficient   = walletFetched && walletFound === true && walletBalance !== null && walletBalance >= balanceDue;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>

      {/* Header */}
      <Box sx={{
        background: `linear-gradient(135deg, ${theme.palette.info.dark} 0%, ${theme.palette.info.main} 100%)`,
        px: 3, pt: 2.5, pb: 2,
      }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{
            width: 42, height: 42, borderRadius: 2,
            bgcolor: alpha("#fff", 0.15),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Payments sx={{ color: "#fff", fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} color="white" lineHeight={1.2}>
              Collect Payment
            </Typography>
            <Typography variant="caption" sx={{ color: alpha("#fff", 0.75) }}>
              {bookingNumber} · {customerName}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {walletLoading && <LinearProgress />}

      <DialogContent sx={{ pt: 3, pb: 1 }}>
        <Stack spacing={3}>

          {/* Amount Banner */}
          <Box sx={{
            p: 2.5, borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.success.light, 0.04)} 100%)`,
            border: `1px solid ${alpha(theme.palette.success.main, 0.25)}`,
          }}>
            <Stack spacing={0.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Trip Fare</Typography>
                <Typography variant="caption" fontWeight={700}>{fmtINR(finalAmount)}</Typography>
              </Stack>
              {couponDiscount > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Coupon Discount</Typography>
                  <Typography variant="caption" fontWeight={700} color="warning.main">− {fmtINR(couponDiscount)}</Typography>
                </Stack>
              )}
              {advancePaid > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Advance Paid</Typography>
                  <Typography variant="caption" fontWeight={700} color="info.main">− {fmtINR(advancePaid)}</Typography>
                </Stack>
              )}
              {(couponDiscount > 0 || advancePaid > 0) && <Divider sx={{ my: 0.5 }} />}
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.8, textTransform: "uppercase" }}>
                  Balance Due
                </Typography>
                <Typography variant="h3" fontWeight={900} color="success.main">{fmtINR(balanceDue)}</Typography>
              </Stack>
            </Stack>
          </Box>

          {/* Payment Mode */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.8, textTransform: "uppercase", display: "block", mb: 1 }}>
              Payment Mode
            </Typography>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, v) => { if (v) setMode(v); }}
              size="small"
              fullWidth
            >
              {PAYMENT_MODES.map(m => (
                <ToggleButton
                  key={m.value} value={m.value}
                  sx={{
                    flex: 1, gap: 0.5, py: 1.2, fontWeight: 700,
                    "&.Mui-selected": { bgcolor: "primary.main", color: "#fff", "&:hover": { bgcolor: "primary.dark" } },
                  }}
                >
                  {m.icon} {m.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.75, display: "block" }}>
              Online payments are processed through the driver app only.
            </Typography>
          </Box>

          {/* Collected By */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.8, textTransform: "uppercase", display: "block", mb: 1 }}>
              Collected By
            </Typography>
            <ToggleButtonGroup
              value={collector}
              exclusive
              onChange={(_, v) => { if (v) setCollector(v); }}
              size="small"
              fullWidth
            >
              {COLLECTORS.map(c => (
                <ToggleButton
                  key={c.value} value={c.value}
                  sx={{
                    flex: 1, py: 1.2, fontWeight: 700,
                    "&.Mui-selected": { bgcolor: "secondary.main", color: "#fff", "&:hover": { bgcolor: "secondary.dark" } },
                  }}
                >
                  {c.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Cash info */}
          {mode === "CASH" && (
            <Box sx={{
              p: 2, borderRadius: 2,
              bgcolor: alpha(theme.palette.warning.main, 0.07),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
              display: "flex", gap: 1.5, alignItems: "flex-start",
            }}>
              <Warning sx={{ color: "warning.main", fontSize: 20, flexShrink: 0, mt: 0.1 }} />
              <Box>
                <Typography variant="body2" fontWeight={700} color="warning.dark" mb={0.5}>
                  Cash Collection Note
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  Cash <strong>{fmtINR(balanceDue)}</strong> will be marked pending at <strong>DRIVER</strong>.
                  Ensure the driver hands over this amount to you at the end of the day.
                  Commission will be deducted at settlement time.
                </Typography>
              </Box>
            </Box>
          )}

          {/* Wallet balance */}
          {mode === "WALLET" && (
            <Box sx={{
              p: 2, borderRadius: 2,
              bgcolor: walletInsufficient
                ? alpha(theme.palette.error.main, 0.07)
                : walletSufficient
                ? alpha(theme.palette.success.main, 0.07)
                : alpha(theme.palette.info.main, 0.06),
              border: `1px solid ${walletInsufficient
                ? alpha(theme.palette.error.main, 0.3)
                : walletSufficient
                ? alpha(theme.palette.success.main, 0.3)
                : alpha(theme.palette.info.main, 0.2)}`,
            }}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <AccountBalanceWallet sx={{
                  color: walletInsufficient ? "error.main" : walletSufficient ? "success.main" : "info.main",
                  fontSize: 20, flexShrink: 0, mt: 0.1,
                }} />
                <Box flex={1}>
                  <Typography variant="body2" fontWeight={700}
                    color={walletInsufficient ? "error.dark" : walletSufficient ? "success.dark" : "info.dark"}
                    mb={0.5}
                  >
                    Customer Wallet
                  </Typography>
                  {walletLoading ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={14} />
                      <Typography variant="caption" color="text.secondary">Fetching wallet balance…</Typography>
                    </Stack>
                  ) : walletBalance !== null ? (
                    <Stack spacing={0.5}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">Available Balance</Typography>
                        <Typography variant="caption" fontWeight={800}
                          color={walletInsufficient ? "error.main" : "success.main"}>
                          {fmtINR(walletBalance)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">Balance Due</Typography>
                        <Typography variant="caption" fontWeight={700}>{fmtINR(balanceDue)}</Typography>
                      </Stack>
                      {walletInsufficient && (
                        <Typography variant="caption" color="error.main" fontWeight={600}>
                          ✗ Insufficient — shortfall of {fmtINR(balanceDue - (walletBalance ?? 0))}. Customer must recharge.
                        </Typography>
                      )}
                      {walletSufficient && (
                        <Typography variant="caption" color="success.main" fontWeight={600}>
                          ✓ Sufficient. {fmtINR(balanceDue)} will be deducted on confirm.
                        </Typography>
                      )}
                    </Stack>
                  ) : null}
                </Box>
              </Stack>
            </Box>
          )}

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
          disabled={loading || walletInsufficient || (mode === "WALLET" && walletFound === null && walletLoading)}
          variant="contained"
          size="small"
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <Payments fontSize="small" />}
          sx={{ fontWeight: 700, minWidth: 180 }}
        >
          {loading
            ? "Recording…"
            : mode === "CASH"
            ? `Record Cash · ${fmtINR(balanceDue)}`
            : `Deduct Wallet · ${fmtINR(balanceDue)}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
