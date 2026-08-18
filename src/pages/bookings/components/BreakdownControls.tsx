// ============================================================
// WAYTERO PARTNER — BREAKDOWN / SWAP CONTROLS
// File: src/pages/bookings/components/BreakdownControls.tsx
// Doc Ref: Spec — Cab Breakdown → Vehicle Swap (in-trip)
//
// Renders two action buttons for active-trip bookings:
//   • "Report Breakdown" — opens a dialog to log a vehicle issue on
//     behalf of the driver. Allowed when status is DRIVER_ASSIGNED or
//     STARTED.
//   • "Swap Vehicle" — opens a dialog to swap to another vehicle/driver
//     in the partner's own fleet. Allowed when status is
//     DRIVER_ASSIGNED, STARTED, BREAKDOWN_REPORTED or AWAITING_SWAP,
//     and PARTNER_SELF_SERVE_SWAP_ENABLED is true.
//
// On success, the parent reloads the booking so timeline / assignment
// fields refresh.
// ============================================================

import { useEffect, useState } from "react";
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, Typography, Chip, RadioGroup, FormControlLabel, Radio, FormControl,
  InputLabel, Select, MenuItem, TextField, Alert, Skeleton, Divider,
} from "@mui/material";
import { BuildCircle, SwapHoriz, Warning, CheckCircle } from "@mui/icons-material";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSnackbar } from "notistack";

import { bookingService } from "../../../services/booking.service";
import { apiErrorMessage } from "../../../utils/apiError";
import { COLORS } from "../../../theme";

interface BreakdownControlsProps {
  bookingNumber: string;
  bookingStatus: string;
  availableVehicles: Array<{
    id: number;
    registration_number: string;
    status: string;
    category_name: string | null;
  }>;
  availableDrivers: Array<{
    id: number;
    full_name: string;
    mobile: string;
    availability_status: string;
  }>;
  onChanged: () => void;
}

export default function BreakdownControls({
  bookingNumber,
  bookingStatus,
  availableVehicles,
  availableDrivers,
  onChanged,
}: BreakdownControlsProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [reportOpen, setReportOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);

  const canReport = ["DRIVER_ASSIGNED", "STARTED"].includes(bookingStatus);
  const canSwap = ["DRIVER_ASSIGNED", "STARTED", "BREAKDOWN_REPORTED", "AWAITING_SWAP"].includes(bookingStatus);

  if (!canReport && !canSwap) return null;

  return (
    <Box>
      <Divider sx={{ my: 1.5 }} />
      <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary, fontSize: "0.82rem", mb: 1, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Issue / Vehicle
      </Typography>
      <Stack direction="row" spacing={1}>
        {canReport && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<BuildCircle />}
            onClick={() => setReportOpen(true)}
            sx={{ fontWeight: 700, flex: 1 }}
          >
            Report Breakdown
          </Button>
        )}
        {canSwap && (
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<SwapHoriz />}
            onClick={() => setSwapOpen(true)}
            sx={{ fontWeight: 700, flex: 1 }}
            disabled={availableVehicles.filter((v) => v.status === "ACTIVE").length === 0}
          >
            Swap Vehicle
          </Button>
        )}
      </Stack>

      <ReportBreakdownDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        bookingNumber={bookingNumber}
        onSuccess={() => { setReportOpen(false); onChanged(); }}
      />
      <SwapVehicleDialog
        open={swapOpen}
        onClose={() => setSwapOpen(false)}
        bookingNumber={bookingNumber}
        availableVehicles={availableVehicles}
        availableDrivers={availableDrivers}
        onSuccess={() => { setSwapOpen(false); onChanged(); }}
      />
    </Box>
  );
}

// ── Report Breakdown dialog ──────────────────────────────────

function ReportBreakdownDialog({
  open,
  onClose,
  bookingNumber,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  bookingNumber: string;
  onSuccess: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useQuery({
    queryKey: ["partner-breakdown-reasons"],
    queryFn: () => bookingService.listBreakdownReasons(),
    enabled: open,
    staleTime: 600_000,
  });
  const reasons = data ?? [];

  const [reasonCode, setReasonCode] = useState("VEHICLE_BREAKDOWN");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setReasonCode("VEHICLE_BREAKDOWN");
      setNotes("");
    }
  }, [open]);

  const report = useMutation({
    mutationFn: () =>
      bookingService.reportBreakdown(bookingNumber, {
        reason_code: reasonCode,
        notes: notes.trim() || null,
      }),
    onSuccess: (res) => {
      enqueueSnackbar(res.message ?? "Breakdown reported — ops has been notified", { variant: "success" });
      onSuccess();
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e, "Report failed"), { variant: "error" }),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Warning color="error" /> Report Breakdown
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Use this when your driver cannot reach the app. The trip is
          paused until ops arranges a replacement vehicle.
        </Alert>
        <Stack spacing={2}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={56} />
          ) : (
            <FormControl fullWidth size="small">
              <InputLabel id="bd-reason-lbl">Reason</InputLabel>
              <Select
                labelId="bd-reason-lbl"
                label="Reason"
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
              >
                {reasons.map((r) => (
                  <MenuItem key={r.code} value={r.code}>{r.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField
            label="Notes (optional)"
            multiline
            minRows={2}
            size="small"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. engine overheating near Durgapur toll"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={report.isPending}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => report.mutate()}
          disabled={report.isPending}
          startIcon={<BuildCircle />}
        >
          Report
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Swap Vehicle dialog ──────────────────────────────────────

function SwapVehicleDialog({
  open,
  onClose,
  bookingNumber,
  availableVehicles,
  availableDrivers,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  bookingNumber: string;
  availableVehicles: Array<{
    id: number;
    registration_number: string;
    status: string;
    category_name: string | null;
  }>;
  availableDrivers: Array<{
    id: number;
    full_name: string;
    mobile: string;
    availability_status: string;
  }>;
  onSuccess: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const activeVehicles = availableVehicles.filter((v) => v.status === "ACTIVE");
  const onlineDrivers = availableDrivers.filter((d) => d.availability_status === "ONLINE");

  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedVehicle(null);
      setSelectedDriver(null);
    }
  }, [open]);

  const swap = useMutation({
    mutationFn: () =>
      bookingService.swapVehicle(bookingNumber, {
        new_vehicle_id: selectedVehicle!,
        new_driver_id: selectedDriver!,
      }),
    onSuccess: (res) => {
      enqueueSnackbar(res.message ?? "Vehicle swapped", { variant: "success" });
      onSuccess();
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e, "Swap failed"), { variant: "error" }),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <SwapHoriz color="primary" /> Swap to another fleet vehicle
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }} icon={<CheckCircle />}>
          Same-partner swap — your commission / payout does not change.
          Cross-partner handovers require admin.
        </Alert>

        <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary, letterSpacing: 0.5 }}>
          VEHICLE
        </Typography>
        {activeVehicles.length === 0 ? (
          <Alert severity="warning" sx={{ my: 1 }}>No ACTIVE vehicles in your fleet right now.</Alert>
        ) : (
          <FormControl component="fieldset" sx={{ mt: 0.5, mb: 2 }}>
            <RadioGroup
              value={selectedVehicle ?? ""}
              onChange={(e) => setSelectedVehicle(Number(e.target.value))}
            >
              {activeVehicles.map((v) => (
                <FormControlLabel
                  key={v.id}
                  value={String(v.id)}
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{v.registration_number}</Typography>
                      {v.category_name && (
                        <Typography variant="caption" color="text.secondary">{v.category_name}</Typography>
                      )}
                    </Box>
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>
        )}

        <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary, letterSpacing: 0.5 }}>
          DRIVER (ONLINE)
        </Typography>
        {onlineDrivers.length === 0 ? (
          <Alert severity="warning" sx={{ my: 1 }}>No ONLINE drivers in your fleet right now.</Alert>
        ) : (
          <FormControl component="fieldset" sx={{ mt: 0.5 }}>
            <RadioGroup
              value={selectedDriver ?? ""}
              onChange={(e) => setSelectedDriver(Number(e.target.value))}
            >
              {onlineDrivers.map((d) => (
                <FormControlLabel
                  key={d.id}
                  value={String(d.id)}
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{d.full_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{d.mobile}</Typography>
                    </Box>
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={swap.isPending}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => swap.mutate()}
          disabled={swap.isPending || !selectedVehicle || !selectedDriver}
        >
          Swap
        </Button>
      </DialogActions>
    </Dialog>
  );
}
