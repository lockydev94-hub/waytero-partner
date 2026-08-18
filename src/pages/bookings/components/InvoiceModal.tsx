// ============================================================
// WAYTERO PARTNER PORTAL — INVOICE MODAL
// Partner downloads PDF invoice for completed + paid booking
// Endpoint: GET /partners/me/bookings/:bn/download-invoice
// ============================================================
import { useState } from "react";
import {
  Dialog, DialogContent, DialogActions,
  Button, Stack, Typography, CircularProgress,
  Box, alpha, useTheme, Chip, Divider,
} from "@mui/material";
import { Receipt, Download, CheckCircle, Info } from "@mui/icons-material";
import { bookingService } from "../../../services/booking.service";

interface Props {
  open: boolean;
  bookingNumber: string;
  invoiceNumber: string | null;
  finalAmount: number;
  couponDiscount: number;
  advancePaid: number;
  paymentMode: string | null;
  cashPendingAt: string | null;
  customerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const fmtINR = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function InvoiceModal({
  open, bookingNumber, invoiceNumber,
  finalAmount, couponDiscount, advancePaid,
  paymentMode, cashPendingAt, customerName,
  onClose, onSuccess,
}: Props) {
  const theme = useTheme();
  const [busy,       setBusy]       = useState(false);
  const [error,      setError]      = useState("");
  const [downloaded, setDownloaded] = useState(false);

  const balanceDue = Math.max(0, finalAmount - couponDiscount - advancePaid);

  function handleClose() {
    if (busy) return;
    setError(""); setDownloaded(false); onClose();
  }

  async function handleDownload() {
    setBusy(true); setError("");
    try {
      const blob = await bookingService.downloadInvoice(bookingNumber);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `Invoice_${invoiceNumber ?? bookingNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloaded(true);
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to download invoice. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>

      {/* Header */}
      <Box sx={{
        background: `linear-gradient(135deg, ${theme.palette.warning.dark} 0%, ${theme.palette.warning.main} 100%)`,
        px: 3, pt: 2.5, pb: 2.5,
      }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{
            width: 44, height: 44, borderRadius: 2,
            bgcolor: alpha("#fff", 0.15),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Receipt sx={{ color: "#fff", fontSize: 26 }} />
          </Box>
          <Box flex={1}>
            <Typography variant="h6" fontWeight={800} color="white" lineHeight={1.2}>
              Download Invoice
            </Typography>
            <Typography variant="caption" sx={{ color: alpha("#fff", 0.8) }}>
              {bookingNumber}
            </Typography>
          </Box>
          {invoiceNumber && (
            <Chip
              label={invoiceNumber}
              size="small"
              sx={{ bgcolor: alpha("#fff", 0.2), color: "white", fontWeight: 700, fontSize: "0.68rem" }}
            />
          )}
        </Stack>
      </Box>

      <DialogContent sx={{ pt: 3, pb: 1 }}>
        <Stack spacing={2.5}>

          {/* Invoice status */}
          {invoiceNumber ? (
            <Box sx={{
              p: 2.5, borderRadius: 2,
              background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.07)} 0%, ${alpha(theme.palette.primary.main, 0.04)} 100%)`,
              border: `1.5px solid ${alpha(theme.palette.success.main, 0.3)}`,
            }}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <CheckCircle sx={{ color: "success.main", fontSize: 22, mt: 0.2, flexShrink: 0 }} />
                <Box flex={1}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Invoice Number
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="success.main" lineHeight={1.2}>
                    {invoiceNumber}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Auto-generated when payment was collected.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          ) : (
            <Box sx={{
              p: 2, borderRadius: 2,
              bgcolor: alpha(theme.palette.warning.main, 0.07),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
            }}>
              <Typography variant="body2" color="warning.dark" fontWeight={600}>
                Invoice number not found. Please collect payment first to auto-generate it.
              </Typography>
            </Box>
          )}

          <Divider />

          {/* Billing Summary */}
          <Box sx={{
            p: 2, borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          }}>
            <Typography variant="overline" color="primary.main" fontWeight={800}
              sx={{ letterSpacing: 1.5, display: "block", mb: 1.5 }}>
              Billing Summary
            </Typography>
            <Stack spacing={0.8}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Customer</Typography>
                <Typography variant="body2" fontWeight={700}>{customerName}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Trip Fare</Typography>
                <Typography variant="body2" fontWeight={700}>{fmtINR(finalAmount)}</Typography>
              </Stack>
              {couponDiscount > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="success.main">Coupon Discount</Typography>
                  <Typography variant="body2" fontWeight={700} color="success.main">
                    − {fmtINR(couponDiscount)}
                  </Typography>
                </Stack>
              )}
              {advancePaid > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Advance Paid</Typography>
                  <Typography variant="body2" color="text.secondary">− {fmtINR(advancePaid)}</Typography>
                </Stack>
              )}
              <Divider sx={{ my: 0.5 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" fontWeight={800}>Balance Due</Typography>
                <Typography variant="body2" fontWeight={800}
                  color={balanceDue <= 0 ? "success.main" : "warning.main"}>
                  {balanceDue <= 0 ? "FULLY PAID" : fmtINR(balanceDue)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">Payment Mode</Typography>
                <Chip
                  label={paymentMode ?? "—"}
                  size="small"
                  color="info"
                  sx={{ fontWeight: 700, fontSize: "0.68rem" }}
                />
              </Stack>
              {cashPendingAt === "DRIVER" && (
                <Box sx={{
                  mt: 0.5, p: 1, borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.warning.main, 0.08),
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
                }}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Info sx={{ fontSize: 14, color: "warning.main" }} />
                    <Typography variant="caption" color="warning.dark" fontWeight={600}>
                      Cash collected by driver — pending handover to you (partner).
                    </Typography>
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>

          {/* Download success */}
          {downloaded && (
            <Box sx={{
              p: 1.5, borderRadius: 2,
              bgcolor: alpha(theme.palette.success.main, 0.08),
              border: `1px solid ${alpha(theme.palette.success.main, 0.25)}`,
            }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Download sx={{ fontSize: 16, color: "success.main" }} />
                <Typography variant="caption" color="success.main" fontWeight={700}>
                  Invoice downloaded successfully!
                </Typography>
              </Stack>
            </Box>
          )}

          {error && (
            <Box sx={{
              p: 1.5, borderRadius: 2,
              bgcolor: alpha(theme.palette.error.main, 0.08),
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            }}>
              <Typography variant="caption" color="error.main" fontWeight={600}>{error}</Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
        <Button onClick={handleClose} disabled={busy} variant="outlined" size="small">Close</Button>
        <Button
          onClick={handleDownload}
          disabled={busy || !invoiceNumber}
          variant="contained"
          color="warning"
          size="small"
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <Download fontSize="small" />}
          sx={{ fontWeight: 700, minWidth: 180 }}
        >
          {busy ? "Downloading…" : "Download Invoice PDF"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
