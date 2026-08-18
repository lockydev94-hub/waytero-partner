// ============================================================
// WAYTERO PARTNER PORTAL — HOTEL ROOM MANAGEMENT PAGE
// Dedicated top-level view of every physical room across the
// partner's hotels. Rooms held by a CHECKED_IN / IN_HOUSE
// reservation are visually locked and cannot be edited until
// check-out (backend enforces the same rule).
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Divider, FormControl,
  Grid, IconButton, InputAdornment, InputLabel, LinearProgress, MenuItem,
  Paper, Select, Skeleton, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography, alpha,
} from "@mui/material";
import {
  MeetingRoom, Search, Refresh, Lock, Edit, Hotel,
  CheckCircle, DoNotDisturb, Build, Block, BedOutlined,
} from "@mui/icons-material";
import { COLORS } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import apiClient from "../../services/api";
import {
  hotelService, type HotelRoom,
} from "../../services/hotel.service";
import {
  HotelRoomStatusModal, ROOM_STATUS_META,
} from "./components/HotelRoomStatusModal";

const STATUS_FILTERS = [
  { key: "ALL",        label: "All" },
  { key: "AVAILABLE",  label: "Available" },
  { key: "OCCUPIED",   label: "Occupied" },
  { key: "MAINTENANCE",label: "Maintenance" },
  { key: "BLOCKED",    label: "Blocked" },
] as const;

// Hotel-list payload shape (mirrors HotelsPage's local type — kept here
// intentionally to avoid coupling this page to the list page).
interface HotelListItem {
  id: number;
  hotel_name: string;
  city_name: string | null;
}

interface HotelPageLite {
  items: HotelListItem[];
  total: number;
}

export default function HotelRoomsPage() {
  const { user } = useAuthStore();
  const partnerId = user?.partner_id;

  const [hotels, setHotels]       = useState<HotelListItem[]>([]);
  const [rooms, setRooms]         = useState<HotelRoom[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [hotelFilter, setHotelFilter]   = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch]             = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [editRoom, setEditRoom] = useState<HotelRoom | null>(null);

  // ── Debounce search ───────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch hotels (for selector) ──────────────────────────
  useEffect(() => {
    if (!partnerId) return;
    (async () => {
      try {
        const res = await apiClient.get<HotelPageLite>("/admin/hotels", {
          params: { partner_id: partnerId, page: 1, page_size: 100 },
        });
        setHotels(res.data.items);
      } catch (e: any) {
        // Don't block the page on a hotels-list failure; the room list is
        // already filtered to this partner by the backend, so we can render
        // without the selector populated.
        setHotels([]);
      }
    })();
  }, [partnerId]);

  // ── Fetch rooms ───────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    setError(null);
    try {
      const data = await hotelService.listAllRooms();
      setRooms(data);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(
        e?.response?.data?.message
          ?? e?.response?.data?.detail
          ?? "Failed to load rooms",
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchRooms();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchRooms]);

  // Auto-refresh every 60s so the lock indicator and status updates
  // reflect check-in / check-out done in other tabs without a manual
  // refresh. 60s matches the existing 60_000 staleTime on the QueryClient.
  useEffect(() => {
    const id = setInterval(() => { fetchRooms(); }, 60_000);
    return () => clearInterval(id);
  }, [fetchRooms]);

  // ── Derived data ──────────────────────────────────────────
  const roomCategoryById = useMemo(() => new Map<number, string>(), []);
  // We don't have a category-name lookup in this page yet; the room number
  // and status are enough for the table. If we need category names later we
  // can add a small helper fetch.

  const hotelNameById = useMemo(() => {
    const m = new Map<number, string>();
    hotels.forEach(h => m.set(h.id, h.hotel_name));
    return m;
  }, [hotels]);

  const filteredRooms = useMemo(() => {
    // Coerce to a defensive array — an upstream 401/refresh race or a future
    // service-shape change can briefly leave `rooms` as undefined; the page
    // should render empty rather than crash.
    let list = rooms ?? [];
    if (hotelFilter !== "ALL") {
      list = list.filter(r => String(r.hotel_id) === hotelFilter);
    }
    if (statusFilter !== "ALL") {
      list = list.filter(r => r.room_status === statusFilter);
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter(r => {
        if (r.room_number.toLowerCase().includes(q)) return true;
        if (r.remarks && r.remarks.toLowerCase().includes(q)) return true;
        const hn = hotelNameById.get(r.hotel_id)?.toLowerCase() ?? "";
        if (hn.includes(q)) return true;
        return false;
      });
    }
    return list;
  }, [rooms, hotelFilter, statusFilter, debouncedSearch, hotelNameById]);

  const stats = useMemo(() => {
    const list = rooms ?? [];
    return {
      total:      list.length,
      available:  list.filter(r => r.room_status === "AVAILABLE").length,
      occupied:   list.filter(r => r.room_status === "OCCUPIED").length,
      maintenance:list.filter(r => r.room_status === "MAINTENANCE").length,
      blocked:    list.filter(r => r.room_status === "BLOCKED").length,
    };
  }, [rooms]);

  // ── Handlers ──────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await fetchRooms(); } finally { setRefreshing(false); }
  };

  const handleRoomUpdated = (updated: HotelRoom) => {
    setRooms(prev => prev.map(r => r.id === updated.id ? updated : r));
    setEditRoom(null);
  };

  if (!partnerId) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">Partner account not linked. Please contact support.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{
            width: 44, height: 44, borderRadius: 2.5,
            background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyMid})`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <MeetingRoom sx={{ fontSize: 22, color: COLORS.gold }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: "1.25rem", color: COLORS.textPrimary }}>
              Hotel Room Management
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>
              Update room availability across your hotels
              {lastUpdated && (
                <Box component="span" sx={{ ml: 1 }}>
                  · Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </Box>
              )}
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="outlined"
          startIcon={refreshing ? <CircularProgress size={14} /> : <Refresh />}
          onClick={handleRefresh}
          disabled={refreshing || loading}
        >
          Refresh
        </Button>
      </Stack>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { key: "total",       label: "Total Rooms",     value: stats.total,       color: COLORS.navy },
          { key: "available",   label: "Available",       value: stats.available,   color: COLORS.success },
          { key: "occupied",    label: "Occupied (Locked)", value: stats.occupied,  color: COLORS.error },
          { key: "maintenance", label: "Maintenance",     value: stats.maintenance, color: COLORS.warning },
          { key: "blocked",     label: "Blocked",         value: stats.blocked,     color: COLORS.textSecondary },
        ].map(s => (
          <Grid item key={s.key} xs={6} sm={4} md={2.4 as any}>
            <Paper elevation={0} sx={{
              p: 2, borderRadius: 3, border: `1px solid ${COLORS.border}`,
              bgcolor: alpha(s.color, 0.04),
            }}>
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Box sx={{
                  width: 36, height: 36, borderRadius: 2,
                  bgcolor: alpha(s.color, 0.15), color: s.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <BedOutlined sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "1.4rem", fontWeight: 900, color: COLORS.textPrimary, lineHeight: 1 }}>
                    {s.value}
                  </Typography>
                  <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary, fontWeight: 600 }}>
                    {s.label}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── Filters ────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: `1px solid ${COLORS.border}`, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <TextField
            placeholder="Search by room #, hotel, remarks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 240 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18, color: COLORS.textSecondary }} />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Hotel</InputLabel>
            <Select
              value={hotelFilter}
              label="Hotel"
              onChange={(e) => setHotelFilter(e.target.value)}
            >
              <MenuItem value="ALL">All hotels ({hotels.length})</MenuItem>
              {hotels.map(h => (
                <MenuItem key={h.id} value={String(h.id)}>
                  {h.hotel_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {STATUS_FILTERS.map(f => {
            const isActive = statusFilter === f.key;
            const color =
              f.key === "AVAILABLE"  ? COLORS.success :
              f.key === "OCCUPIED"   ? COLORS.error :
              f.key === "MAINTENANCE"? COLORS.warning :
              f.key === "BLOCKED"    ? COLORS.textSecondary :
              COLORS.navy;
            const count =
              f.key === "ALL"        ? stats.total :
              f.key === "AVAILABLE"  ? stats.available :
              f.key === "OCCUPIED"   ? stats.occupied :
              f.key === "MAINTENANCE"? stats.maintenance :
              f.key === "BLOCKED"    ? stats.blocked : 0;
            return (
              <Chip
                key={f.key}
                label={`${f.label} · ${count}`}
                onClick={() => setStatusFilter(f.key)}
                sx={{
                  fontWeight: 700, fontSize: "0.78rem",
                  bgcolor: isActive ? alpha(color, 0.15) : alpha(color, 0.04),
                  color: isActive ? color : COLORS.textSecondary,
                  border: `1px solid ${alpha(color, isActive ? 0.5 : 0.25)}`,
                  "&:hover": { bgcolor: alpha(color, 0.12) },
                }}
              />
            );
          })}
        </Stack>
      </Paper>

      {/* ── Error ──────────────────────────────────────────── */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
      )}

      {/* ── Loading (initial) ──────────────────────────────── */}
      {loading ? (
        <Paper elevation={0} sx={{ p: 3, border: `1px solid ${COLORS.border}`, borderRadius: 3 }}>
          <Stack spacing={1}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={42} sx={{ borderRadius: 1.5 }} />
            ))}
          </Stack>
        </Paper>
      ) : filteredRooms.length === 0 ? (
        <Paper elevation={0} sx={{
          p: 6, textAlign: "center",
          border: `1px solid ${COLORS.border}`, borderRadius: 3,
        }}>
          <Hotel sx={{ fontSize: 48, color: alpha(COLORS.textSecondary, 0.3), mb: 1.5 }} />
          <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary }}>
            {rooms.length === 0
              ? "No rooms configured yet"
              : "No rooms match your filters"}
          </Typography>
          <Typography sx={{ fontSize: "0.82rem", color: COLORS.textSecondary, mt: 0.5 }}>
            {rooms.length === 0
              ? "Rooms are added by the WayTero admin team when your property is onboarded."
              : "Try clearing the search or status filter."}
          </Typography>
        </Paper>
      ) : (
        /* ── Rooms table ───────────────────────────────────── */
        <Paper elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden" }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(COLORS.navy, 0.04) }}>
                  <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", color: COLORS.textSecondary }}>HOTEL</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", color: COLORS.textSecondary }}>ROOM</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", color: COLORS.textSecondary }}>FLOOR</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", color: COLORS.textSecondary }}>STATUS</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", color: COLORS.textSecondary }}>LOCK HOLDER</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", color: COLORS.textSecondary }}>REMARKS</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: "0.75rem", color: COLORS.textSecondary }}>ACTION</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRooms.map(room => {
                  const meta = ROOM_STATUS_META[room.room_status] ?? ROOM_STATUS_META.AVAILABLE;
                  const isLocked = Boolean(room.active_reservation);
                  const lock = room.active_reservation ?? null;
                  return (
                    <TableRow
                      key={room.id}
                      sx={{
                        "&:hover": { bgcolor: alpha(COLORS.gold, 0.04) },
                        borderLeft: isLocked ? `3px solid ${COLORS.error}` : "3px solid transparent",
                        opacity: isLocked ? 0.92 : 1,
                      }}
                    >
                      <TableCell sx={{ fontSize: "0.82rem", color: COLORS.textPrimary, fontWeight: 600 }}>
                        {hotelNameById.get(room.hotel_id) ?? `#${room.hotel_id}`}
                      </TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontWeight: 800, fontSize: "0.85rem", color: COLORS.textPrimary }}>
                        {room.room_number}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>
                        {room.floor_number ? `Floor ${room.floor_number}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
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
                          {isLocked && (
                            <Chip
                              icon={<Lock sx={{ fontSize: 12 }} />}
                              label="Locked"
                              size="small"
                              sx={{
                                height: 22, fontSize: 11, fontWeight: 800,
                                bgcolor: alpha(COLORS.error, 0.15),
                                color: COLORS.error,
                                border: `1px solid ${alpha(COLORS.error, 0.4)}`,
                                "& .MuiChip-icon": { color: COLORS.error, fontSize: 12 },
                              }}
                            />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem" }}>
                        {isLocked && lock ? (
                          <Tooltip
                            title={lock.check_out_date
                              ? `Expected check-out: ${lock.check_out_date}`
                              : ""}
                            arrow
                          >
                            <Box>
                              <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: COLORS.textPrimary }}>
                                {lock.reservation_number ?? `#${lock.reservation_id}`}
                              </Typography>
                              <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary }}>
                                {lock.guest_name ?? "Guest on file"}
                              </Typography>
                            </Box>
                          </Tooltip>
                        ) : (
                          <Typography sx={{ fontSize: "0.78rem", color: alpha(COLORS.textSecondary, 0.6) }}>
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem", color: COLORS.textSecondary, maxWidth: 220 }}>
                        <Box sx={{
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          maxWidth: 200,
                        }}>
                          {room.remarks ?? "—"}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip
                          title={isLocked
                            ? `Held by ${lock?.reservation_number ?? `#${lock?.reservation_id}`}. Released at check-out.`
                            : "Update status"}
                          arrow
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => setEditRoom(room)}
                              disabled={isLocked}
                              sx={{
                                bgcolor: alpha(COLORS.gold, 0.1),
                                "&:hover": { bgcolor: alpha(COLORS.gold, 0.2) },
                                "&.Mui-disabled": {
                                  bgcolor: alpha(COLORS.textSecondary, 0.08),
                                  color: alpha(COLORS.textSecondary, 0.5),
                                },
                              }}
                            >
                              {isLocked ? <Lock sx={{ fontSize: 16 }} /> : <Edit sx={{ fontSize: 16 }} />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <HotelRoomStatusModal
        open={editRoom !== null}
        room={editRoom}
        hotelId={editRoom?.hotel_id ?? 0}
        onClose={() => setEditRoom(null)}
        onSuccess={handleRoomUpdated}
      />
    </Box>
  );
}