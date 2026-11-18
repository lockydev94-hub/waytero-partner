// ============================================================
// WAYTERO PARTNER PORTAL — LIVE DRIVER TRACKING
// One live view for every cab currently assigned or on a trip.
// Polls GET /partners/me/bookings/:bookingNumber/live-location
// every 15s while a booking is selected.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert, alpha, Avatar, Box, Button, Card, Chip, Divider,
  IconButton, InputAdornment, Skeleton, Stack, TextField,
  Tooltip, Typography,
} from "@mui/material";
import {
  AccessTime, ArrowForwardIos, DirectionsCar, GpsFixed, GpsOff,
  MyLocation, OpenInNew, PauseCircle, PersonPin, Refresh,
  Search, Speed, Straighten, Traffic,
} from "@mui/icons-material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bookingService, type BookingListItem } from "../../services/booking.service";
import {
  trackingService,
  type LiveLocation,
  type TrafficLevel,
} from "../../services/tracking.service";
import { COLORS } from "../../theme";

const ACTIVE_STATUSES = ["DRIVER_ASSIGNED", "STARTED"];

const TRAFFIC_CONFIG: Record<TrafficLevel, { label: string; color: string }> = {
  LIGHT: { label: "Light traffic", color: COLORS.success },
  MODERATE: { label: "Moderate traffic", color: COLORS.warning },
  HEAVY: { label: "Heavy traffic", color: COLORS.error },
  UNKNOWN: { label: "Traffic unknown", color: COLORS.textSecondary },
};

function apiError(error: any): string {
  return (
    error?.response?.data?.detail ??
    error?.response?.data?.message ??
    error?.message ??
    "Unable to load live tracking."
  );
}

function ageLabel(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "No fix time";
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function fmtKm(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(2)} km`;
}

function StatusChip({ data }: { data: LiveLocation }) {
  let label = "Awaiting start";
  let color = COLORS.warning;
  if (data.paused) {
    label = "Trip paused";
    color = COLORS.warning;
  } else if (data.tracking_active && data.location && !data.location.is_stale) {
    label = "Live";
    color = COLORS.success;
  } else if (data.tracking_active && !data.location) {
    label = "Waiting for GPS";
    color = COLORS.info;
  } else if (!data.tracking_active) {
    label = "Last known position";
    color = COLORS.textSecondary;
  } else if (data.location?.is_stale) {
    label = "GPS stale";
    color = COLORS.error;
  }
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        height: 24, fontSize: "0.7rem", fontWeight: 800,
        color, bgcolor: alpha(color, 0.12),
        border: `1px solid ${alpha(color, 0.3)}`,
      }}
    />
  );
}

function Metric({
  icon, label, value, accent,
}: { icon: JSX.Element; label: string; value: string; accent?: string }) {
  return (
    <Box sx={{ minWidth: 120 }}>
      <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mb: 0.3 }}>
        <Box sx={{ display: "flex", color: accent ?? COLORS.textSecondary, "& svg": { fontSize: 15 } }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary, fontWeight: 600 }}>
          {label}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: COLORS.textPrimary }}>
        {value}
      </Typography>
    </Box>
  );
}

function ActiveTripRow({
  booking, active, onClick,
}: { booking: BookingListItem; active: boolean; onClick: () => void }) {
  const waiting = booking.booking_status === "DRIVER_ASSIGNED";
  return (
    <Box
      onClick={onClick}
      sx={{
        p: 1.75, cursor: "pointer",
        borderBottom: `1px solid ${COLORS.border}`,
        borderLeft: `3px solid ${active ? COLORS.gold : "transparent"}`,
        bgcolor: active ? alpha(COLORS.gold, 0.06) : "transparent",
        transition: "background 0.15s",
        "&:hover": { bgcolor: active ? alpha(COLORS.gold, 0.09) : COLORS.bgMain },
      }}
    >
      <Stack direction="row" spacing={1.2} alignItems="center">
        <Box sx={{
          width: 38, height: 38, borderRadius: 2, flexShrink: 0,
          bgcolor: alpha(waiting ? COLORS.warning : COLORS.success, 0.1),
          color: waiting ? COLORS.warning : COLORS.success,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {waiting ? <PersonPin sx={{ fontSize: 20 }} /> : <GpsFixed sx={{ fontSize: 20 }} />}
        </Box>
        <Box minWidth={0} flex={1}>
          <Typography sx={{ fontSize: "0.8rem", fontWeight: 800, fontFamily: "monospace" }} noWrap>
            {booking.booking_number}
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }} noWrap>
            {booking.driver_name ?? "Driver assigned"}
            {booking.vehicle_reg ? ` · ${booking.vehicle_reg}` : ""}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={waiting ? "Waiting" : "In trip"}
          sx={{
            height: 20, fontSize: "0.62rem", fontWeight: 800,
            color: waiting ? COLORS.warning : COLORS.success,
            bgcolor: alpha(waiting ? COLORS.warning : COLORS.success, 0.1),
          }}
        />
      </Stack>
      <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary, mt: 0.9 }} noWrap>
        {booking.pickup_location ?? "Pickup —"} → {booking.drop_location ?? "Drop —"}
      </Typography>
    </Box>
  );
}

export default function LiveTrackingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(searchParams.get("booking") ?? "");

  const activeQ = useQuery({
    queryKey: ["tracking-active-bookings"],
    queryFn: async () => {
      const [started, assigned] = await Promise.all([
        bookingService.listBookings({ status: "STARTED", limit: 50 }),
        bookingService.listBookings({ status: "DRIVER_ASSIGNED", limit: 50 }),
      ]);
      const byNumber = new Map<string, BookingListItem>();
      [...started.items, ...assigned.items].forEach((item) => {
        byNumber.set(item.booking_number, item);
      });
      return [...byNumber.values()].filter((item) =>
        ACTIVE_STATUSES.includes(item.booking_status),
      );
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const activeTrips = activeQ.data ?? [];

  useEffect(() => {
    const fromUrl = searchParams.get("booking") ?? "";
    if (fromUrl && fromUrl !== selected) setSelected(fromUrl);
  }, [searchParams, selected]);

  useEffect(() => {
    if (!selected && activeTrips.length > 0) {
      setSelected(activeTrips[0].booking_number);
    }
  }, [activeTrips, selected]);

  const liveQ = useQuery({
    queryKey: ["live-location", selected],
    queryFn: () => trackingService.getLiveLocation(selected),
    enabled: Boolean(selected),
    refetchInterval: 15_000,
    retry: false,
  });

  const data = liveQ.data;
  const location = data?.location ?? null;
  const traffic = TRAFFIC_CONFIG[data?.traffic_level ?? "UNKNOWN"];

  const filteredTrips = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return activeTrips;
    return activeTrips.filter((trip) =>
      [trip.booking_number, trip.driver_name, trip.vehicle_reg, trip.pickup_location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [activeTrips, search]);

  const selectBooking = (bookingNumber: string) => {
    setSelected(bookingNumber.trim().toUpperCase());
    setSearchParams({ booking: bookingNumber.trim().toUpperCase() }, { replace: true });
  };

  const handleSearch = () => {
    if (search.trim()) selectBooking(search);
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["tracking-active-bookings"] });
    if (selected) qc.invalidateQueries({ queryKey: ["live-location", selected] });
    activeQ.refetch();
    if (selected) liveQ.refetch();
  };

  const openMap = () => {
    if (!location) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const waitingCount = activeTrips.filter((t) => t.booking_status === "DRIVER_ASSIGNED").length;
  const onTripCount = activeTrips.filter((t) => t.booking_status === "STARTED").length;

  return (
    <Box>
      <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ mb: 2.5 }}>
        <Box flex={1}>
          <Typography variant="h5" fontWeight={900} lineHeight={1.2}>
            Live Driver Tracking
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Follow your drivers on active trips. Positions refresh every 15 seconds.
          </Typography>
        </Box>
        <Tooltip title="Refresh tracking">
          <IconButton
            onClick={refresh}
            sx={{ bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
          >
            <Refresh />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
        {[
          { label: "Active assignments", value: activeTrips.length, color: COLORS.info, icon: <PersonPin /> },
          { label: "Trips on the road", value: onTripCount, color: COLORS.success, icon: <GpsFixed /> },
          { label: "Awaiting start", value: waitingCount, color: COLORS.warning, icon: <AccessTime /> },
        ].map((tile) => (
          <Card key={tile.label} sx={{ p: 2, flex: 1, minWidth: 180 }}>
            <Stack direction="row" spacing={1.4} alignItems="center">
              <Box sx={{
                width: 40, height: 40, borderRadius: 2,
                bgcolor: alpha(tile.color, 0.1), color: tile.color,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {tile.icon}
              </Box>
              <Box>
                <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary, fontWeight: 600 }}>
                  {tile.label}
                </Typography>
                <Typography sx={{ fontSize: "1.3rem", fontWeight: 900, lineHeight: 1.2 }}>
                  {activeQ.isLoading ? "…" : tile.value}
                </Typography>
              </Box>
            </Stack>
          </Card>
        ))}
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="flex-start">
        {/* Active trip selector */}
        <Card sx={{ width: { xs: "100%", lg: 350 }, flexShrink: 0, overflow: "hidden" }}>
          <Box sx={{ p: 2, borderBottom: `1px solid ${COLORS.border}` }}>
            <Typography fontWeight={800} fontSize="0.9rem" sx={{ mb: 1.2 }}>
              Active Trips
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Booking no., driver or vehicle"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: COLORS.textSecondary }} />
                  </InputAdornment>
                ),
                endAdornment: search.trim() ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleSearch}>
                      <ArrowForwardIos sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
            />
          </Box>

          <Box sx={{ maxHeight: 560, overflowY: "auto" }}>
            {activeQ.isLoading ? (
              <Stack spacing={1} sx={{ p: 2 }}>
                {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={72} />)}
              </Stack>
            ) : activeQ.isError ? (
              <Box sx={{ p: 2 }}>
                <Alert severity="error">{apiError(activeQ.error)}</Alert>
              </Box>
            ) : filteredTrips.length === 0 ? (
              <Stack alignItems="center" spacing={1} sx={{ py: 6, px: 3, textAlign: "center" }}>
                <GpsOff sx={{ fontSize: 40, color: alpha(COLORS.textSecondary, 0.4) }} />
                <Typography fontWeight={800} fontSize="0.9rem">
                  {activeTrips.length === 0 ? "No active trips" : "No matching trips"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activeTrips.length === 0
                    ? "Assigned and on-trip bookings will appear here."
                    : "Try another booking number, driver or vehicle."}
                </Typography>
                {search.trim() && (
                  <Button size="small" onClick={() => selectBooking(search)} sx={{ mt: 1 }}>
                    Track {search.trim().toUpperCase()}
                  </Button>
                )}
              </Stack>
            ) : (
              filteredTrips.map((trip) => (
                <ActiveTripRow
                  key={trip.booking_number}
                  booking={trip}
                  active={trip.booking_number === selected}
                  onClick={() => selectBooking(trip.booking_number)}
                />
              ))
            )}
          </Box>
        </Card>

        {/* Live detail */}
        <Card sx={{ flex: 1, width: "100%", overflow: "hidden" }}>
          {!selected ? (
            <Stack alignItems="center" spacing={1.2} sx={{ py: 10, px: 3, textAlign: "center" }}>
              <MyLocation sx={{ fontSize: 52, color: alpha(COLORS.textSecondary, 0.3) }} />
              <Typography fontWeight={800}>Select a trip</Typography>
              <Typography variant="body2" color="text.secondary" maxWidth={360}>
                Pick an active trip on the left to see the driver’s latest position,
                speed and traffic condition.
              </Typography>
            </Stack>
          ) : liveQ.isLoading ? (
            <Box sx={{ p: 3 }}>
              <Skeleton height={120} sx={{ borderRadius: 3 }} />
              <Skeleton height={80} sx={{ mt: 2 }} />
              <Skeleton height={80} sx={{ mt: 2 }} />
            </Box>
          ) : liveQ.isError ? (
            <Box sx={{ p: 3 }}>
              <Alert severity="error" sx={{ mb: 2 }}>
                {apiError(liveQ.error)}
              </Alert>
              <Typography variant="body2" color="text.secondary">
                Check the booking number, or choose another active trip.
              </Typography>
            </Box>
          ) : data ? (
            <>
              <Box sx={{
                px: { xs: 2, sm: 2.5 }, py: 2,
                background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyMid})`,
                color: "#fff",
              }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                  <Stack direction="row" spacing={1.4} alignItems="center" flex={1} minWidth={0}>
                    <Avatar sx={{
                      width: 46, height: 46, fontWeight: 900,
                      background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
                      color: "#000",
                    }}>
                      {data.driver.name?.[0]?.toUpperCase() ?? "D"}
                    </Avatar>
                    <Box minWidth={0}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography fontWeight={800} fontSize="1rem" noWrap>
                          {data.driver.name ?? "Driver"}
                        </Typography>
                        <StatusChip data={data} />
                      </Stack>
                      <Typography sx={{ fontSize: "0.76rem", color: alpha("#fff", 0.65) }}>
                        {data.booking_number}
                        {data.driver.mobile ? ` · ${data.driver.mobile}` : ""}
                      </Typography>
                      {data.vehicle_reg && (
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.3 }}>
                          <DirectionsCar sx={{ fontSize: 14, color: alpha("#fff", 0.6) }} />
                          <Typography sx={{ fontSize: "0.72rem", color: alpha("#fff", 0.7), fontFamily: "monospace" }}>
                            {data.vehicle_reg}
                          </Typography>
                        </Stack>
                      )}
                    </Box>
                  </Stack>
                  <Chip
                    icon={<Traffic sx={{ fontSize: "14px !important" }} />}
                    label={traffic.label}
                    sx={{
                      alignSelf: { xs: "flex-start", sm: "center" },
                      color: traffic.color, bgcolor: alpha(traffic.color, 0.15),
                      border: `1px solid ${alpha(traffic.color, 0.3)}`,
                      fontWeight: 800, fontSize: "0.7rem",
                      "& .MuiChip-icon": { color: traffic.color },
                    }}
                  />
                </Stack>
              </Box>

              <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                {!location ? (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    {data.message ?? "Waiting for the driver’s first GPS update."}
                  </Alert>
                ) : (
                  <>
                    <Box sx={{
                      p: 2, borderRadius: 2.5, mb: 2.5,
                      border: `1px solid ${COLORS.border}`,
                      background: `linear-gradient(135deg, ${alpha(COLORS.info, 0.05)}, ${alpha(COLORS.gold, 0.03)})`,
                    }}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                        <Box sx={{
                          width: 58, height: 58, borderRadius: "50%", flexShrink: 0,
                          bgcolor: alpha(location.is_stale ? COLORS.error : COLORS.success, 0.12),
                          color: location.is_stale ? COLORS.error : COLORS.success,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {location.is_stale ? <GpsOff sx={{ fontSize: 28 }} /> : <GpsFixed sx={{ fontSize: 28 }} />}
                        </Box>
                        <Box flex={1} minWidth={0}>
                          <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary, fontWeight: 700 }}>
                            LAST KNOWN POSITION
                          </Typography>
                          <Typography sx={{ fontSize: "1rem", fontWeight: 800, fontFamily: "monospace" }}>
                            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                          </Typography>
                          <Stack direction="row" spacing={1.2} flexWrap="wrap">
                            <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
                              {ageLabel(location.age_seconds)}
                            </Typography>
                            {location.accuracy_m !== null && (
                              <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
                                ±{Math.round(location.accuracy_m)} m
                              </Typography>
                            )}
                          </Stack>
                        </Box>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<OpenInNew />}
                          onClick={openMap}
                          sx={{ whiteSpace: "nowrap" }}
                        >
                          Open in Maps
                        </Button>
                      </Stack>
                      {location.is_stale && (
                        <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2 }}>
                          This fix is more than 3 minutes old. The driver’s phone may be offline.
                        </Alert>
                      )}
                    </Box>

                    <Box sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
                      gap: 2,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: COLORS.bgMain,
                      border: `1px solid ${COLORS.border}`,
                    }}>
                      <Metric
                        icon={<Speed />}
                        label="Speed"
                        value={`${location.speed_kmh.toFixed(0)} km/h`}
                        accent={COLORS.info}
                      />
                      <Metric
                        icon={<Straighten />}
                        label="GPS distance"
                        value={fmtKm(data.gps_distance_km)}
                        accent={COLORS.success}
                      />
                      <Metric
                        icon={<DirectionsCar />}
                        label="Odometer"
                        value={fmtKm(data.odometer_distance_km)}
                        accent={COLORS.goldDark}
                      />
                      <Metric
                        icon={<PauseCircle />}
                        label="Paused time"
                        value={`${Math.round((data.paused_seconds ?? 0) / 60)} min`}
                        accent={COLORS.warning}
                      />
                    </Box>
                  </>
                )}

                <Divider sx={{ my: 2.5 }} />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                  <Box flex={1}>
                    <Typography sx={{ fontSize: "0.76rem", color: COLORS.textSecondary }}>
                      Trip status: <strong>{data.trip_status ?? (data.tracking_active ? "STARTED" : "—")}</strong>
                      {data.paused ? " · movement is not being counted while paused" : ""}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(`/dashboard/bookings/${data.booking_number}`)}
                  >
                    View booking
                  </Button>
                </Stack>
              </Box>
            </>
          ) : null}
        </Card>
      </Stack>
    </Box>
  );
}
