// ============================================================
// HOTEL ROOMS TAB — room categories + physical rooms with status update
// Partners can mark rooms as AVAILABLE / MAINTENANCE / BLOCKED.
// Rooms held by a CHECKED_IN/IN_HOUSE reservation are visually
// locked; the shared HotelRoomStatusModal enforces the lock.
// ============================================================
import { useState, useEffect, useCallback } from "react";
import {
  Box, Grid, Typography, Chip, Stack, alpha, Paper,
  CircularProgress, Alert, Avatar, Tooltip,
} from "@mui/material";
import {
  Lock, Edit, Hotel, BedOutlined, People, CurrencyRupee,
} from "@mui/icons-material";
import { COLORS } from "../../../theme";
import { hotelService, type RoomCategory, type HotelRoom } from "../../../services/hotel.service";
import {
  HotelRoomStatusModal,
  ROOM_STATUS_META,
} from "./HotelRoomStatusModal";

const MEAL_LABELS: Record<string, string> = {
  EP: "Room Only", CP: "Room + Breakfast", MAP: "Room + B + 1 Meal", AP: "Room + All Meals",
};

function StatusChip({ status }: { status: string }) {
  const meta = ROOM_STATUS_META[status] ?? ROOM_STATUS_META.AVAILABLE;
  return (
    <Chip
      icon={meta.icon as any}
      label={meta.label}
      size="small"
      sx={{
        height: 22, fontSize: 11, fontWeight: 700,
        bgcolor: alpha(meta.color, 0.1), color: meta.color,
        border: `1px solid ${alpha(meta.color, 0.25)}`,
        "& .MuiChip-icon": { color: meta.color },
      }}
    />
  );
}

export default function HotelRoomsTab({ hotelId }: { hotelId: number }) {
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editRoom, setEditRoom] = useState<HotelRoom | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, rms] = await Promise.all([
        hotelService.getRoomCategories(hotelId),
        hotelService.getRooms(hotelId),
      ]);
      setCategories(cats);
      setRooms(rms);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const handleRoomUpdated = (updated: HotelRoom) => {
    setRooms(prev => prev.map(r => r.id === updated.id ? updated : r));
    setEditRoom(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={32} sx={{ color: COLORS.gold }} />
      </Box>
    );
  }

  if (error) return <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>;

  if (categories.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <Hotel sx={{ fontSize: 48, color: alpha(COLORS.textSecondary, 0.3), mb: 1.5 }} />
        <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary }}>No room categories yet</Typography>
        <Typography sx={{ fontSize: "0.82rem", color: COLORS.textSecondary, mt: 0.5 }}>
          Contact the WayTero admin team to configure room categories.
        </Typography>
      </Box>
    );
  }

  // Status summary across all rooms
  const statusSummary = Object.entries(ROOM_STATUS_META).map(([k, v]) => ({
    ...v,
    key: k,
    count: rooms.filter(r => r.room_status === k).length,
  }));

  return (
    <Box>
      {/* Summary strip */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 3 }}>
        {statusSummary.map(s => (
          <Paper key={s.key} elevation={0} sx={{
            px: 2, py: 1.25, borderRadius: 2.5, border: `1px solid ${COLORS.border}`,
            display: "flex", alignItems: "center", gap: 1.25, flex: 1,
            bgcolor: alpha(s.color, 0.04),
          }}>
            <Box sx={{ color: s.color, display: "flex" }}>{s.icon}</Box>
            <Box>
              <Typography sx={{ fontSize: "1.2rem", fontWeight: 900, color: COLORS.textPrimary, lineHeight: 1 }}>{s.count}</Typography>
              <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary, fontWeight: 500 }}>{s.label}</Typography>
            </Box>
          </Paper>
        ))}
      </Stack>

      {/* Per-category sections */}
      <Stack spacing={3}>
        {categories.map(cat => {
          const catRooms = rooms.filter(r => r.room_category_id === cat.id);
          const primaryImg = cat.images.find(i => i.is_primary) ?? cat.images[0];
          return (
            <Paper key={cat.id} elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden" }}>
              {/* Category header */}
              <Box sx={{
                px: 2.5, py: 2,
                background: `linear-gradient(135deg, ${alpha(COLORS.navy, 0.04)}, transparent)`,
                borderBottom: `1px solid ${COLORS.border}`,
              }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                  <Avatar
                    src={primaryImg?.image_url}
                    variant="rounded"
                    sx={{ width: 64, height: 64, borderRadius: 2, bgcolor: alpha(COLORS.navy, 0.08), flexShrink: 0 }}
                  >
                    <BedOutlined sx={{ fontSize: 28, color: COLORS.navy }} />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                      <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: COLORS.textPrimary }}>
                        {cat.category_name}
                      </Typography>
                      {cat.room_type && (
                        <Chip label={cat.room_type} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                      )}
                      {!cat.is_active && (
                        <Chip label="Inactive" size="small" color="error" sx={{ height: 20, fontSize: 11 }} />
                      )}
                    </Stack>
                    <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 0.75 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <People sx={{ fontSize: 14, color: COLORS.textSecondary }} />
                        <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>
                          {cat.base_occupancy} base · max {cat.max_occupancy}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <CurrencyRupee sx={{ fontSize: 14, color: COLORS.gold }} />
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: COLORS.textPrimary }}>
                          ₹{Number(cat.base_price).toLocaleString("en-IN")}
                          {cat.published_price && cat.published_price !== cat.base_price && (
                            <Box component="span" sx={{ color: COLORS.textSecondary, fontWeight: 400, ml: 0.5 }}>
                              (pub ₹{Number(cat.published_price).toLocaleString("en-IN")})
                            </Box>
                          )}
                        </Typography>
                      </Box>
                      <Chip label={MEAL_LABELS[cat.meal_plan] ?? cat.meal_plan} size="small"
                        sx={{ height: 20, fontSize: 11, bgcolor: alpha(COLORS.gold, 0.1), color: COLORS.goldDark, fontWeight: 700 }} />
                      {cat.bed_type && <Chip label={cat.bed_type} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />}
                      {cat.view_type && cat.view_type !== "NO_VIEW" && (
                        <Chip label={cat.view_type.replace("_", " ")} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                      )}
                    </Stack>
                  </Box>
                  <Box sx={{ textAlign: { sm: "right" }, flexShrink: 0 }}>
                    <Typography sx={{ fontSize: "1.5rem", fontWeight: 900, color: COLORS.textPrimary, lineHeight: 1 }}>
                      {catRooms.length}
                    </Typography>
                    <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary }}>physical rooms</Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Physical rooms grid */}
              {catRooms.length === 0 ? (
                <Box sx={{ px: 2.5, py: 2 }}>
                  <Typography sx={{ fontSize: "0.82rem", color: COLORS.textSecondary, fontStyle: "italic" }}>
                    No physical rooms added yet.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ p: 2 }}>
                  <Grid container spacing={1}>
                    {catRooms.map(room => {
                      const meta = ROOM_STATUS_META[room.room_status] ?? ROOM_STATUS_META.AVAILABLE;
                      const isLocked = Boolean(room.active_reservation);
                      const lockLabel = isLocked
                        ? `Locked by reservation ${room.active_reservation?.reservation_number ?? room.active_reservation?.reservation_id}${room.active_reservation?.check_out_date ? ` until ${room.active_reservation.check_out_date}` : ""}`
                        : (room.remarks ? `Remarks: ${room.remarks}` : "Click to update status");
                      return (
                        <Grid item key={room.id} xs={6} sm={4} md={3} lg={2}>
                          <Tooltip title={lockLabel} arrow>
                            <Box
                              onClick={() => setEditRoom(room)}
                              sx={{
                                p: 1.25, borderRadius: 2, cursor: "pointer",
                                position: "relative",
                                border: `1.5px solid ${alpha(meta.color, 0.35)}`,
                                bgcolor: alpha(meta.color, 0.05),
                                transition: "all 0.15s",
                                "&:hover": { borderColor: meta.color, boxShadow: `0 2px 8px ${alpha(meta.color, 0.2)}` },
                                display: "flex", flexDirection: "column", gap: 0.75,
                              }}
                            >
                              {isLocked && (
                                <Chip
                                  icon={<Lock sx={{ fontSize: 12 }} />}
                                  label="Locked"
                                  size="small"
                                  sx={{
                                    position: "absolute", top: 6, right: 6,
                                    height: 18, fontSize: 10, fontWeight: 800,
                                    bgcolor: alpha(COLORS.error, 0.15),
                                    color: COLORS.error,
                                    border: `1px solid ${alpha(COLORS.error, 0.4)}`,
                                    "& .MuiChip-icon": { color: COLORS.error, fontSize: 12 },
                                  }}
                                />
                              )}
                              <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: COLORS.textPrimary, fontFamily: "monospace" }}>
                                  {room.room_number}
                                </Typography>
                                <Edit sx={{ fontSize: 12, color: alpha(COLORS.textSecondary, 0.5) }} />
                              </Stack>
                              {room.floor_number && (
                                <Typography sx={{ fontSize: "0.65rem", color: COLORS.textSecondary }}>
                                  Floor {room.floor_number}
                                </Typography>
                              )}
                              <Box sx={{
                                display: "flex", alignItems: "center", gap: 0.5,
                                bgcolor: alpha(meta.color, 0.12), borderRadius: 1, px: 0.75, py: 0.25,
                              }}>
                                <Box sx={{ color: meta.color, display: "flex" }}>{meta.icon}</Box>
                                <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: meta.color }}>{meta.label}</Typography>
                              </Box>
                            </Box>
                          </Tooltip>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              )}
            </Paper>
          );
        })}
      </Stack>

      <HotelRoomStatusModal
        open={editRoom !== null}
        room={editRoom}
        hotelId={hotelId}
        onClose={() => setEditRoom(null)}
        onSuccess={handleRoomUpdated}
      />
    </Box>
  );
}
