// ============================================================
// WAYTERO PARTNER PORTAL — INVOICE CONFIRMATION MODAL
// Endpoint: POST /partners/me/hotel-bookings/{id}/generate-invoice
// Guard: CHECKED_OUT / COMPLETED — only when no invoice exists yet
//
// Shows a frozen-bill summary + collected-payments list so the partner
// can sanity-check the totals before freezing the bill.
// ============================================================
import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, CircularProgress,
  Stack, Avatar, Divider, Alert, Chip,
} from "@mui/material";
import { Receipt, Close, InfoOutlined, CheckCircle } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { hotelBookingService, type AdvanceRow } from "../../../services/hotel-booking.service";
import { COLORS } from "../../../theme";

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  reservationId: number;
  total: number;
  advancePaid: number;
  balanceDue: number;
  payments: AdvanceRow[];
}

const fmt = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function HotelInvoiceModal({
  open, onClose, onDone, reservationId,
  total, advancePaid, balanceDue, payments,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  async function submit() {
    setBusy(true); setErr(null);
    try {
      await hotelBookingService.generateInvoice(reservationId);
      enqueueSnackbar("Invoice generated", { variant: "success" });
      onDone();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : (detail?.message || "Failed to generate invoice");
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  const handleClose = () => { setErr(null); onClose(); };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, m: 2 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Avatar sx={{ bgcolor: COLORS.gold, width: 40, height: 40 }}>
              <Receipt />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} fontSize="1rem">
                Generate Invoice
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

        {/* Bill summary */}
        <Box sx={{
          p: 1.5, borderRadius: 2,
          bgcolor: (t) => t.palette.mode === "dark" ? "grey.900" : "grey.50",
          border: "1px solid", borderColor: "divider", mb: 2,
        }}>
          <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="caption" color="text.secondary">Final Bill</Typography>
              <Typography variant="h6" fontWeight={800}>{fmt(total)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Advance Received</Typography>
              <Typography variant="subtitle1" fontWeight={700} color="success.main">
                −{fmt(advancePaid)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Balance Due</Typography>
              <Typography variant="subtitle1" fontWeight={800} color={balanceDue > 0 ? COLORS.warning : COLORS.success}>
                {fmt(balanceDue)}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Payment details */}
        <Typography variant="caption" fontWeight={700} color="text.secondary"
          sx={{ letterSpacing: 0.5, mb: 1, display: "block" }}>
          PAYMENT DETAILS
        </Typography>
        {payments.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2, py: 0.5 }}>
            No payments collected yet on this booking. The invoice will show the full amount as balance due.
          </Alert>
        ) : (
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", mb: 2 }}>
            {payments.map((p, i) => (
              <Box key={p.id} sx={{
                px: 1.5, py: 1,
                borderTop: i === 0 ? "none" : "1px solid",
                borderColor: "divider",
                bgcolor: i % 2 ? (t) => t.palette.mode === "dark" ? "grey.900" : "grey.50" : "transparent",
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontFamily="monospace" fontWeight={700}>
                      {p.receipt_number}
                    </Typography>
                    <Stack direction="row" gap={0.5} mt={0.25} flexWrap="wrap">
                      <Chip label={p.payment_mode} size="small" sx={{ height: 18, fontSize: "0.65rem" }} />
                      <Chip label={p.received_by} size="small" variant="outlined"
                        color={p.received_by === "ADMIN" ? "info" : "warning"}
                        sx={{ height: 18, fontSize: "0.65rem" }} />
                      {p.reference_number && (
                        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                          Ref: {p.reference_number}
                        </Typography>
                      )}
                    </Stack>
                    {p.collected_at && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                        {new Date(p.collected_at).toLocaleString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body2" fontWeight={700} color="success.main" sx={{ whiteSpace: "nowrap" }}>
                    {fmt(p.amount)}
                    {p.refunded_amount > 0 && (
                      <Typography component="span" variant="caption" color="error.main" sx={{ display: "block" }}>
                        (−{fmt(p.refunded_amount)})
                      </Typography>
                    )}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Box>
        )}

        <Alert severity="warning" icon={<InfoOutlined />} sx={{ borderRadius: 2, py: 0.5 }}>
          This will freeze the bill at <strong>{fmt(total)}</strong>. No further charges can be added after invoicing.
        </Alert>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit" disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained" onClick={submit} disabled={busy}
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <CheckCircle />}
          sx={{ fontWeight: 700 }}
        >
          {busy ? "Generating…" : `Generate Invoice · ${fmt(total)}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
