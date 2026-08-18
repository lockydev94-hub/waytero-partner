// ============================================================
// WAYTERO PARTNER PORTAL — REJECT DIALOG
// Doc Ref: BRD Part 3 §42 — Partner rejects a cab booking
// Asks the partner for a reason (dropdown) + optional notes.
// The reason "OTHER" requires notes to be filled in.
// ============================================================
import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Stack, MenuItem, TextField,
  Alert, CircularProgress, Avatar,
} from "@mui/material";
import { Cancel, Close, Block } from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { bookingService, REJECT_REASON_OTHER } from "../../services/booking.service";

interface Props {
  open: boolean;
  onClose: () => void;
  bookingNumber: string;
  bookingId: number;
  onAccepted?: () => void;  // unused — kept for symmetry with future "accept" dialog
}

export default function RejectDialog({ open, onClose, bookingNumber, bookingId }: Props) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [reasonCode, setReasonCode] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch the dropdown once when the dialog opens.
  const { data: reasons = [], isLoading: loadingReasons } = useQuery({
    queryKey: ["partner-reject-reasons"],
    queryFn: () => bookingService.listRejectReasons(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  // Reset form when the dialog is opened/closed.
  useEffect(() => {
    if (open) {
      setReasonCode("");
      setNotes("");
      setValidationError(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => bookingService.rejectBooking(bookingNumber, {
      reason_code: reasonCode,
      notes: notes.trim() || undefined,
    }),
    onSuccess: (res) => {
      enqueueSnackbar(res?.message ?? "Booking rejected. Admin will reassign.", { variant: "success" });
      qc.invalidateQueries({ queryKey: ["partner-booking", bookingNumber] });
      qc.invalidateQueries({ queryKey: ["partner-bookings"] });
      qc.invalidateQueries({ queryKey: ["partner-booking-counts"] });
      onClose();
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail ?? e?.response?.data?.message ?? "Failed to reject booking.";
      setValidationError(detail);
    },
  });

  const notesRequired = reasonCode === REJECT_REASON_OTHER;
  const canSubmit = !!reasonCode && !mutation.isPending && (!notesRequired || notes.trim().length > 0);

  const handleSubmit = () => {
    if (!reasonCode) {
      setValidationError("Please select a reason.");
      return;
    }
    if (notesRequired && !notes.trim()) {
      setValidationError("Please describe the issue when selecting 'Other'.");
      return;
    }
    setValidationError(null);
    mutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: "90vh" } }}
    >
      <DialogTitle sx={{ pb: 1.5, pt: 2.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Avatar sx={{ bgcolor: "error.main", width: 38, height: 38 }}>
              <Block fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
                Reject Booking
              </Typography>
              <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                {bookingNumber}
              </Typography>
            </Box>
          </Stack>
          <Button size="small" onClick={onClose} sx={{ minWidth: 0, p: 0.5, color: "text.secondary" }}>
            <Close fontSize="small" />
          </Button>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 1.5 }}>
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Rejecting will return this booking to <strong>Pending Assignment</strong> so admin can reassign it to another partner.
        </Alert>

        {validationError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{validationError}</Alert>
        )}

        <TextField
          select
          fullWidth
          size="small"
          label="Reason"
          required
          value={reasonCode}
          onChange={(e) => { setReasonCode(e.target.value); setValidationError(null); }}
          disabled={loadingReasons}
          sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        >
          {loadingReasons && (
            <MenuItem value="" disabled><em>Loading…</em></MenuItem>
          )}
          {reasons.map((r) => (
            <MenuItem key={r.code} value={r.code}>{r.label}</MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          size="small"
          label={notesRequired ? "Describe the issue (required)" : "Notes (optional)"}
          multiline
          rows={3}
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setValidationError(null); }}
          placeholder={notesRequired ? "What went wrong?" : "Any additional context for admin…"}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="error"
          disabled={!canSubmit}
          startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : <Cancel />}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          {mutation.isPending ? "Rejecting…" : "Reject Booking"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
