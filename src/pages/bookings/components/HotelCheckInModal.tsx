// ============================================================
// WAYTERO PARTNER PORTAL — CHECK-IN MODAL
// Endpoint: POST /partners/me/hotel-bookings/{id}/check-in
// Guard: CONFIRMED only
//
// 2-step rewrite: the flat `datetime-local` field is replaced by
// `DateTimeStepPicker`, and the backend's 409 `CHECKIN_DATE_MISMATCH`
// response is surfaced as an in-modal confirm step. The user sees a
// clear delta and explicitly confirms with `confirm_date_mismatch=true`
// before the row mutates.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, CircularProgress,
  Stack, Avatar, Divider, Alert, MenuItem,
  Checkbox, FormControlLabel, Chip, Paper,
} from "@mui/material";
import {
  Login, Close, KingBed, AccessTime, WarningAmber,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import {
  hotelBookingService,
  type AvailableRoom,
} from "../../../services/hotel-booking.service";
import { COLORS } from "../../../theme";
import DateTimeStepPicker from "../../../components/forms/DateTimeStepPicker";

const ID_PROOF_OPTIONS = [
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DL",      label: "Driving Licence" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  reservationId: number;
  /** Booked check-in date "YYYY-MM-DD" — drives the mismatch warning copy. */
  bookedCheckInDate?: string | null;
  /** Platform timezone label (e.g. "Asia/Kolkata") — shown in the picker. */
  platformTimezone?: string | null;
  /** Number of rooms the partner should assign (from the booking). */
  numRooms?: number | null;
}

export default function HotelCheckInModal({
  open, onClose, onDone, reservationId,
  bookedCheckInDate, platformTimezone, numRooms,
}: Props) {
  const [idProof, setIdProof] = useState("AADHAAR");
  const [idNumber, setIdNumber] = useState("");
  const [checkInDate, setCheckInDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [checkInTime, setCheckInTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [remarks, setRemarks] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [roomsNeeded, setRoomsNeeded] = useState<number>(numRooms ?? 1);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  /** Pending mismatch descriptor from the server — drives the warning card. */
  const [pendingMismatch, setPendingMismatch] = useState<{
    bookingDate: string;
    actualDate: string;
    deltaDays: number;
    message: string;
  } | null>(null);

  const { enqueueSnackbar } = useSnackbar();

  // Reset state when the modal opens.
  useEffect(() => {
    if (!open) return;
    const d = new Date();
    setIdProof("AADHAAR");
    setIdNumber("");
    setCheckInDate(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
    setCheckInTime(
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
    );
    setRemarks("");
    setSelectedRoomIds([]);
    setPendingMismatch(null);
    setErr(null);
    // Load available rooms for this reservation's hotel.
    setRoomsLoading(true);
    hotelBookingService
      .getAvailableRooms(reservationId)
      .then((r) => {
        setAvailableRooms(r.data);
        setRoomsNeeded(r.rooms_needed);
      })
      .catch(() => {
        // Silently fall back to "no rooms configured" path.
        setAvailableRooms([]);
        setRoomsNeeded(numRooms ?? 1);
      })
      .finally(() => setRoomsLoading(false));
  }, [open, reservationId, numRooms]);

  const toggleRoom = (id: number) => {
    setSelectedRoomIds((prev) => {
      if (prev.includes(id)) return prev.filter((r) => r !== id);
      if (prev.length >= roomsNeeded) {
        // Replace oldest selection when at limit
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  // Build a local-zone ISO from the picker's date+time, then to UTC ISO Z.
  const isoCheckInAt = useMemo(() => {
    if (!checkInDate || !checkInTime) return undefined;
    const local = new Date(`${checkInDate}T${checkInTime}`);
    if (Number.isNaN(local.getTime())) return undefined;
    return local.toISOString();
  }, [checkInDate, checkInTime]);

  async function submit(confirmMismatch: boolean) {
    setBusy(true); setErr(null);
    try {
      await hotelBookingService.checkIn(reservationId, {
        id_proof: idProof,
        id_number: idNumber,
        actual_check_in_at: isoCheckInAt,
        room_ids: selectedRoomIds,
        remarks: remarks.trim() || undefined,
        confirm_date_mismatch: confirmMismatch || undefined,
      });
      enqueueSnackbar("Guest checked in successfully", { variant: "success" });
      onDone();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (
        e?.response?.status === 409 &&
        detail &&
        typeof detail === "object" &&
        detail.code === "CHECKIN_DATE_MISMATCH"
      ) {
        // Surface the server's mismatch descriptor in-modal — the user must
        // explicitly confirm before the row is mutated.
        setPendingMismatch({
          bookingDate: detail.booking_date,
          actualDate: detail.actual_date,
          deltaDays: detail.delta_days,
          message: detail.message,
        });
      } else {
        const msg = typeof detail === "string"
          ? detail
          : (detail?.message || "Check-in failed");
        setErr(msg);
        enqueueSnackbar(msg, { variant: "error" });
      }
    } finally {
      setBusy(false);
    }
  }

  const handleClose = () => {
    setPendingMismatch(null);
    onClose();
  };

  const hasRoomsConfigured = availableRooms.length > 0;
  const canSubmit =
    idNumber.trim().length > 0 &&
    !!checkInDate &&
    !!checkInTime &&
    (!hasRoomsConfigured || selectedRoomIds.length === roomsNeeded) &&
    !busy;

  return (
    <Dialog
      open={open} onClose={handleClose}
      maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, m: 2 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Avatar sx={{ bgcolor: COLORS.gold, width: 40, height: 40 }}>
              <Login />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} fontSize="1rem">
                Check In Guest
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

        <Stack gap={2.5}>
          {/* ID Proof */}
          <TextField
            select label="ID Proof Type *"
            value={idProof}
            onChange={(e) => setIdProof(e.target.value)}
            size="small"
            fullWidth
          >
            {ID_PROOF_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="ID Number *"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            size="small"
            fullWidth
            placeholder="Enter document number"
          />

          {/* Actual Check-In Time — 2-step picker */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <AccessTime fontSize="small" sx={{ color: COLORS.gold }} />
              <Typography variant="subtitle2" fontWeight={700}>
                Actual Check-In Time *
              </Typography>
            </Stack>
            <DateTimeStepPicker
              valueDate={checkInDate}
              valueTime={checkInTime}
              minDate={null}
              maxDate={null}
              timezoneLabel={platformTimezone || "Asia/Kolkata"}
              onChange={(next) => {
                setCheckInDate(next.date);
                setCheckInTime(next.time);
                setPendingMismatch(null);
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              When the guest actually arrived. Room charges are billed from this stamp.
              {bookedCheckInDate && (
                <> · Booked check-in: <strong>{bookedCheckInDate}</strong></>
              )}
            </Typography>
          </Box>

          {/* Date-mismatch warning (server-driven 409) */}
          {pendingMismatch && (
            <Alert
              severity="warning"
              icon={<WarningAmber />}
              sx={{ borderRadius: 2 }}
            >
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Check-in date is off by {Math.abs(pendingMismatch.deltaDays)} day
                {Math.abs(pendingMismatch.deltaDays) === 1 ? "" : "s"} from the booked date
              </Typography>
              <Typography variant="body2">
                Booked: <strong>{pendingMismatch.bookingDate}</strong> · Actual:{" "}
                <strong>{pendingMismatch.actualDate}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                {pendingMismatch.message}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setPendingMismatch(null)}
                  disabled={busy}
                >
                  Adjust date
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  onClick={() => submit(true)}
                  disabled={busy}
                  startIcon={busy ? <CircularProgress size={14} color="inherit" /> : null}
                >
                  Confirm anyway
                </Button>
              </Stack>
            </Alert>
          )}

          {/* Room Assignment */}
          <Box>
            <Stack direction="row" alignItems="center" gap={1} mb={1}>
              <KingBed fontSize="small" sx={{ color: COLORS.gold }} />
              <Typography variant="subtitle2" fontWeight={700}>
                Room Assignment
                {hasRoomsConfigured && (
                  <Typography component="span" variant="caption" color="text.secondary" ml={1}>
                    — select {roomsNeeded} room{roomsNeeded > 1 ? "s" : ""} ({selectedRoomIds.length}/{roomsNeeded} selected)
                  </Typography>
                )}
              </Typography>
            </Stack>

            {roomsLoading ? (
              <Stack direction="row" alignItems="center" gap={1} py={1}>
                <CircularProgress size={14} />
                <Typography variant="caption" color="text.secondary">Loading available rooms…</Typography>
              </Stack>
            ) : !hasRoomsConfigured ? (
              <Alert severity="warning" sx={{ borderRadius: 2, py: 0.5 }}>
                No rooms are configured for this property. Check-in will proceed without a room number — add rooms in hotel settings to enable assignment.
              </Alert>
            ) : (
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, maxHeight: 200, overflowY: "auto" }}>
                <Stack gap={0.5}>
                  {availableRooms.map((room) => {
                    const checked = selectedRoomIds.includes(room.id);
                    return (
                      <FormControlLabel
                        key={room.id}
                        control={
                          <Checkbox
                            size="small"
                            checked={checked}
                            onChange={() => toggleRoom(room.id)}
                          />
                        }
                        label={
                          <Stack direction="row" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight={600}>
                              Room {room.room_number}
                            </Typography>
                            {room.floor_number && (
                              <Chip label={`Floor ${room.floor_number}`} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
                            )}
                          </Stack>
                        }
                        sx={{ mx: 0, "&:hover": { bgcolor: "action.hover", borderRadius: 1 }, px: 0.5 }}
                      />
                    );
                  })}
                </Stack>
              </Paper>
            )}
          </Box>

          {/* Optional remarks */}
          <TextField
            label="Remarks (optional)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            size="small"
            fullWidth
            multiline
            rows={2}
            placeholder="Any notes about the check-in"
          />
        </Stack>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit" disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained" color="success"
          disabled={!canSubmit}
          onClick={() => submit(false)}
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <Login />}
          sx={{ fontWeight: 700 }}
        >
          {busy ? "Checking In…" : "Check In"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
