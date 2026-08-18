// ============================================================
// HOTEL ROOM STATUS MODAL — shared between the partner hotel
// detail Rooms tab and the new top-level HotelRoomsPage.
//
// Locks the form when the room is currently held by a CHECKED_IN
// or IN_HOUSE reservation (active_reservation populated by the
// backend). OCCUPIED is filtered out of the selectable statuses
// because that state is booking-driven only — partners can never
// set it by hand.
// ============================================================
import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, InputLabel, LinearProgress, MenuItem,
  Select, Stack, TextField, Typography,
} from "@mui/material";
import {
  MeetingRoom, CheckCircle, DoNotDisturb, Build, Block, Lock,
} from "@mui/icons-material";
import { alpha } from "@mui/material";
import { COLORS } from "../../../theme";
import {
  hotelService,
  type HotelRoom,
  type RoomActiveReservation,
} from "../../../services/hotel.service";

/** Statuses the partner may set. OCCUPIED is intentionally absent — it is
 *  set automatically at check-in and cleared at check-out, so offering it
 *  would invite phantom-occupied rooms that no booking can release. */
export const PARTNER_SELECTABLE_ROOM_STATUSES = [
  "AVAILABLE",
  "MAINTENANCE",
  "BLOCKED",
] as const;

export const ROOM_STATUS_META: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  AVAILABLE:   { label: "Available",    color: COLORS.success,        icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  OCCUPIED:    { label: "Occupied",     color: COLORS.error,          icon: <DoNotDisturb sx={{ fontSize: 14 }} /> },
  MAINTENANCE: { label: "Maintenance",  color: COLORS.warning,        icon: <Build sx={{ fontSize: 14 }} /> },
  BLOCKED:     { label: "Blocked",      color: COLORS.textSecondary,  icon: <Block sx={{ fontSize: 14 }} /> },
};

interface HotelRoomStatusModalProps {
  open: boolean;
  room: HotelRoom | null;
  hotelId: number;
  onClose: () => void;
  onSuccess: (updated: HotelRoom) => void;
}

export function HotelRoomStatusModal({
  open, room, hotelId, onClose, onSuccess,
}: HotelRoomStatusModalProps) {
  const lock = room?.active_reservation ?? null;
  const isLocked = lock !== null && lock !== undefined;

  const [status, setStatus]   = useState(room?.room_status ?? "AVAILABLE");
  const [remarks, setRemarks] = useState(room?.remarks ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (room) {
      // When locked, force the form to display the OCCUPIED status without
      // letting the user mutate it. The Select is disabled anyway, but the
      // initial state must agree with what they see.
      setStatus(isLocked ? "OCCUPIED" : room.room_status);
      setRemarks(room.remarks ?? "");
      setError(null);
    }
  }, [room, isLocked]);

  const handleSave = async () => {
    if (!room) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await hotelService.updateRoomStatus(
        hotelId, room.id, status, remarks || undefined,
      );
      onSuccess(updated);
    } catch (e: any) {
      setError(
        e?.response?.data?.detail
          ?? e?.response?.data?.message
          ?? "Failed to update room status",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, boxShadow: "0 24px 64px rgba(0,0,0,0.15)" } }}
    >
      <DialogTitle sx={{ pb: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 2,
          background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {isLocked
            ? <Lock sx={{ fontSize: 18, color: "#000" }} />
            : <MeetingRoom sx={{ fontSize: 18, color: "#000" }} />}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>
            {isLocked ? "Room Locked" : "Update Room Status"}
          </Typography>
          {room && (
            <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>
              Room {room.room_number}
              {room.floor_number ? ` · Floor ${room.floor_number}` : ""}
            </Typography>
          )}
        </Box>
      </DialogTitle>

      {loading && <LinearProgress />}

      <DialogContent sx={{ pt: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {isLocked && lock && (
          <Alert
            severity="warning"
            icon={<Lock fontSize="inherit" />}
            sx={{ mb: 2, borderRadius: 2, alignItems: "center" }}
          >
            <Stack spacing={0.25}>
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>
                Held by reservation
                {lock.reservation_number ? ` ${lock.reservation_number}` : ` #${lock.reservation_id}`}
              </Typography>
              <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                {lock.guest_name ? `Guest: ${lock.guest_name}` : "Guest on file"}
                {lock.check_out_date
                  ? ` · Expected check-out ${formatDate(lock.check_out_date)}`
                  : ""}
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.5 }}>
                This room is released automatically when the guest checks out.
              </Typography>
            </Stack>
          </Alert>
        )}

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            label="Status"
            disabled={isLocked}
          >
            {Object.entries(ROOM_STATUS_META).map(([k, v]) => (
              <MenuItem key={k} value={k} disabled={k === "OCCUPIED"}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ color: v.color, display: "flex" }}>{v.icon}</Box>
                  <Typography sx={{ fontSize: "0.85rem" }}>{v.label}</Typography>
                  {k === "OCCUPIED" && (
                    <Chip
                      label="auto"
                      size="small"
                      sx={{
                        ml: 0.5, height: 18, fontSize: 10,
                        bgcolor: alpha(COLORS.textSecondary, 0.1),
                        color: COLORS.textSecondary,
                      }}
                    />
                  )}
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Remarks (optional)"
          multiline
          minRows={2}
          fullWidth
          size="small"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Reason for status change…"
          disabled={isLocked}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1, alignItems: "center" }}>
        {isLocked && (
          <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary, mr: "auto" }}>
            Locked until check-out
          </Typography>
        )}
        <Button onClick={onClose} variant="outlined" disabled={loading}>
          {isLocked ? "Close" : "Cancel"}
        </Button>
        {!isLocked && (
          <Button variant="contained" onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export default HotelRoomStatusModal;