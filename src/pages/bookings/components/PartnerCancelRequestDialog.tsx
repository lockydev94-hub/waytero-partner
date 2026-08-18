// ============================================================
// WAYTERO PARTNER — CANCELLATION REQUEST DIALOG
// Doc Ref: BRD Part 3 §46
// Partners can NOT cancel directly. This dialog submits a request
// to admin and shows the auto-computed refund preview that admin will see.
// ============================================================
import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Typography, Box, Stack, Avatar, Divider, Alert, Grid, Chip,
  CircularProgress, MenuItem, Select, FormControl, InputLabel,
} from "@mui/material";
import { Cancel, HourglassBottom, Policy } from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { partnerCancellationService, PartnerCancelPreview } from "../../../services/cancellation.service";

const REJECT_REASONS = [
  { code: "VEHICLE_UNAVAILABLE", label: "Vehicle not available" },
  { code: "DRIVER_UNAVAILABLE", label: "Driver not available" },
  { code: "CAPACITY_ISSUE", label: "Vehicle capacity insufficient" },
  { code: "OUTSIDE_SERVICE_AREA", label: "Pickup outside service area" },
  { code: "PRICING_DISAGREEMENT", label: "Pricing disagreement" },
  { code: "OTHER", label: "Other (specify in notes)" },
];

const TIER_LABEL_TEXT: Record<string, string> = {
  free_window: "Free cancellation window",
  tier_1: "Tier 1",
  tier_2: "Tier 2",
  last_minute: "Last minute",
  past_pickup: "Past pickup",
  post_assignment: "Post-assignment (partner notified)",
  same_day: "Same-day",
  no_show: "No-show",
};

interface Props {
  open: boolean;
  onClose: () => void;
  bookingType: "CAB" | "HOTEL" | "TOUR";
  bookingNumber: string;
  reservationId?: number;
  tourBookingId?: number;
  onSubmitted?: () => void;
}

export default function PartnerCancelRequestDialog({
  open, onClose, bookingType, bookingNumber, reservationId, tourBookingId, onSubmitted,
}: Props) {
  const [reason, setReason] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (!open) {
      setReason("");
      setReasonCode("");
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { reason: reason.trim(), reason_code: reasonCode || undefined };
      if (bookingType === "CAB") {
        return partnerCancellationService.requestCab(bookingNumber, payload);
      }
      if (bookingType === "HOTEL") {
        return partnerCancellationService.requestHotel(reservationId as number, payload);
      }
      return partnerCancellationService.requestTour(tourBookingId as number, payload);
    },
    onSuccess: (res) => {
      enqueueSnackbar("Cancellation request submitted. Admin will review.", { variant: "success" });
      qc.invalidateQueries({ queryKey: ["my-cancel-requests"] });
      qc.invalidateQueries({ queryKey: ["partner-bookings"] });
      qc.invalidateQueries({ queryKey: ["partner-booking"] });
      onSubmitted?.();
      handleClose();
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail;
      enqueueSnackbar(typeof detail === "string" ? detail : "Request failed", { variant: "error" });
    },
  });

  const handleClose = () => {
    setReason(""); setReasonCode(""); onClose();
  };

  const preview: PartnerCancelPreview | null = mutation.data?.preview ?? null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Avatar sx={{ bgcolor: "warning.main" }}><Cancel /></Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Request cancellation — {bookingType}
            </Typography>
            <Typography variant="caption" color="text.secondary">{bookingNumber}</Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="info" icon={<HourglassBottom />} sx={{ mb: 2 }}>
          You cannot cancel a booking directly. Submit a request and admin will approve or reject
          per the platform cancellation policy. Refund below is the auto-computed preview — admin
          may override only the request outcome, not the numbers.
        </Alert>

        <Stack gap={2}>
          <FormControl fullWidth>
            <InputLabel>Reason category</InputLabel>
            <Select
              label="Reason category"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
            >
              <MenuItem value=""><em>Select a reason…</em></MenuItem>
              {REJECT_REASONS.map(r => (
                <MenuItem key={r.code} value={r.code}>{r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Details *"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth multiline rows={3}
            placeholder="What is the operational reason? (Visible to admin.)"
          />

          {preview && (
            <Box p={2} bgcolor="grey.50" borderRadius={2} border="1px solid" borderColor="grey.200">
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <Policy fontSize="small" color="primary" />
                <Typography variant="subtitle2" fontWeight={700}>Admin will see this refund preview</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <Chip
                  size="small"
                  color="primary"
                  label={TIER_LABEL_TEXT[preview.tier_label] || preview.tier_label}
                />
              </Stack>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Cancellation charge</Typography>
                  <Typography variant="h6" color="error" fontWeight={700}>
                    ₹{Number(preview.charge).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Refund (advance capped)</Typography>
                  <Typography variant="h6" color="success.main" fontWeight={700}>
                    ₹{Number(preview.refund_amount).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit">Close</Button>
        <Button
          variant="contained" color="warning"
          startIcon={mutation.isPending ? <CircularProgress size={14} color="inherit" /> : <Cancel />}
          disabled={!reason.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Submitting…" : "Submit Request"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
