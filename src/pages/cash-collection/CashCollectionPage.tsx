// ============================================================
// WAYTERO PARTNER PORTAL — DRIVER CASH COLLECTION
// Select a driver → review their uncollected cash bookings →
// select all or specific rows → collect with amount verification.
//
// Endpoints: /partners/me/cash-collection/*
// Domain: cab_bookings.cash_pending_at moves DRIVER → PARTNER here.
// ============================================================
import { useMemo, useState } from "react";
import {
  Box, Card, Stack, Typography, Chip, Avatar, alpha, TextField,
  InputAdornment, Checkbox, Button, Skeleton, Divider, Tooltip,
  IconButton, Table, TableBody, TableCell, TableHead, TableRow,
  Tabs, Tab, Badge,
} from "@mui/material";
import {
  Search, Payments, Phone, DirectionsCar, Refresh, AccountBalanceWallet,
  PersonSearch, HistoryToggleOff, ReceiptLong, EventBusy, CheckCircle,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { COLORS } from "../../theme";
import {
  cashCollectionService,
  type DriverCashSummary,
  type CollectResponse,
} from "../../services/cashCollection.service";
import CollectCashModal from "./components/CollectCashModal";

const fmtINR = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const daysAgo = (iso: string | null): number | null => {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
};

// ── KPI tile ─────────────────────────────────────────────────
function StatTile({
  icon, label, value, accent,
}: { icon: JSX.Element; label: string; value: string; accent: string }) {
  return (
    <Card sx={{ p: 2, flex: 1, minWidth: 180 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{
          width: 42, height: 42, borderRadius: 2, flexShrink: 0,
          bgcolor: alpha(accent, 0.12),
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accent,
        }}>
          {icon}
        </Box>
        <Box minWidth={0}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}
            sx={{ display: "block", lineHeight: 1.2 }}>
            {label}
          </Typography>
          <Typography fontWeight={900} fontSize="1.25rem" noWrap lineHeight={1.3}>
            {value}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}

// ── Empty state ──────────────────────────────────────────────
function EmptyState({ icon, title, subtitle }: { icon: JSX.Element; title: string; subtitle: string }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.2} sx={{ py: 7, px: 3 }}>
      <Box sx={{
        width: 64, height: 64, borderRadius: "50%",
        bgcolor: alpha(COLORS.navy, 0.05),
        display: "flex", alignItems: "center", justifyContent: "center",
        color: COLORS.textSecondary,
      }}>
        {icon}
      </Box>
      <Typography fontWeight={800} fontSize="0.95rem">{title}</Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={320}>
        {subtitle}
      </Typography>
    </Stack>
  );
}

export default function CashCollectionPage() {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<DriverCashSummary | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [tab, setTab] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [collectError, setCollectError] = useState("");
  const [collectResult, setCollectResult] = useState<CollectResponse | null>(null);

  // ── Queries ────────────────────────────────────────────────
  const driversQ = useQuery({
    queryKey: ["cash-drivers", search],
    queryFn: () => cashCollectionService.listDrivers(search || undefined),
  });

  const pendingQ = useQuery({
    queryKey: ["cash-pending", selectedDriver?.driver_id],
    queryFn: () => cashCollectionService.getDriverPending(selectedDriver!.driver_id),
    enabled: !!selectedDriver,
  });

  const historyQ = useQuery({
    queryKey: ["cash-history", selectedDriver?.driver_id],
    queryFn: () => cashCollectionService.getHistory(
      selectedDriver ? { driver_id: selectedDriver.driver_id } : {}
    ),
    enabled: tab === 1,
  });

  const bookings = pendingQ.data?.bookings ?? [];

  const selectedBookings = useMemo(
    () => bookings.filter((b) => selectedIds.includes(b.cab_booking_id)),
    [bookings, selectedIds]
  );

  const selectedTotal = useMemo(
    () => selectedBookings.reduce((s, b) => s + b.cash_amount, 0),
    [selectedBookings]
  );

  const allSelected = bookings.length > 0 && selectedIds.length === bookings.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  // ── Mutation ───────────────────────────────────────────────
  const collectMut = useMutation({
    mutationFn: (p: { entered_amount: number; payment_method: string; reference_note: string }) =>
      cashCollectionService.collect({
        driver_id: selectedDriver!.driver_id,
        cab_booking_ids: selectedIds,
        entered_amount: p.entered_amount,
        payment_method: p.payment_method,
        reference_note: p.reference_note || null,
      }),
    onSuccess: (res) => {
      setCollectResult(res);
      setCollectError("");
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ["cash-drivers"] });
      qc.invalidateQueries({ queryKey: ["cash-pending"] });
      qc.invalidateQueries({ queryKey: ["cash-history"] });
    },
    onError: (e: any) => {
      setCollectError(e?.response?.data?.detail ?? "Collection failed. Please try again.");
    },
  });

  function handleSelectDriver(d: DriverCashSummary) {
    setSelectedDriver(d);
    setSelectedIds([]);
    setTab(0);
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : bookings.map((b) => b.cab_booking_id));
  }

  function toggleOne(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function openModal() {
    setCollectError("");
    setCollectResult(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setCollectResult(null);
    setCollectError("");
  }

  const summary = driversQ.data;

  return (
    <Box>
      {/* ── Header ──────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
        <Box flex={1}>
          <Typography variant="h5" fontWeight={900} lineHeight={1.2}>
            Cash Collection
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Collect cash your drivers received from customers.
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["cash-drivers"] });
              qc.invalidateQueries({ queryKey: ["cash-pending"] });
            }}
            sx={{ bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
          >
            <Refresh />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* ── KPI row ─────────────────────────────────────────── */}
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
        <StatTile
          icon={<AccountBalanceWallet />}
          label="Total Pending"
          value={driversQ.isLoading ? "…" : fmtINR(summary?.total_pending_amount ?? 0)}
          accent={COLORS.gold}
        />
        <StatTile
          icon={<PersonSearch />}
          label="Drivers Holding Cash"
          value={driversQ.isLoading ? "…" : String(summary?.total_drivers ?? 0)}
          accent={COLORS.info}
        />
        <StatTile
          icon={<ReceiptLong />}
          label="Pending Bookings"
          value={driversQ.isLoading ? "…" : String(summary?.total_pending_count ?? 0)}
          accent={COLORS.navyMid}
        />
      </Stack>

      {/* ── Two-pane layout ─────────────────────────────────── */}
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="flex-start">

        {/* ── Left: driver list ─────────────────────────────── */}
        <Card sx={{ width: { xs: "100%", lg: 340 }, flexShrink: 0, overflow: "hidden" }}>
          <Box sx={{ p: 2, borderBottom: `1px solid ${COLORS.border}` }}>
            <Typography fontWeight={800} fontSize="0.9rem" sx={{ mb: 1.2 }}>
              Select a Driver
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Search name, code, mobile"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: COLORS.textSecondary }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box sx={{ maxHeight: 560, overflowY: "auto" }}>
            {driversQ.isLoading ? (
              <Stack spacing={1} sx={{ p: 2 }}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} variant="rounded" height={68} />
                ))}
              </Stack>
            ) : (summary?.drivers.length ?? 0) === 0 ? (
              <EmptyState
                icon={<CheckCircle sx={{ fontSize: 30 }} />}
                title="No pending cash"
                subtitle="None of your drivers are holding uncollected cash right now."
              />
            ) : (
              summary!.drivers.map((d) => {
                const active = selectedDriver?.driver_id === d.driver_id;
                const age = daysAgo(d.oldest_pending_at);
                return (
                  <Box
                    key={d.driver_id}
                    onClick={() => handleSelectDriver(d)}
                    sx={{
                      p: 1.75, cursor: "pointer",
                      borderBottom: `1px solid ${COLORS.border}`,
                      borderLeft: `3px solid ${active ? COLORS.gold : "transparent"}`,
                      bgcolor: active ? alpha(COLORS.gold, 0.06) : "transparent",
                      transition: "background 0.15s",
                      "&:hover": { bgcolor: active ? alpha(COLORS.gold, 0.09) : COLORS.bgMain },
                    }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Avatar sx={{
                        width: 40, height: 40, fontSize: "0.85rem", fontWeight: 800,
                        background: active
                          ? `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`
                          : alpha(COLORS.navy, 0.08),
                        color: active ? "#000" : COLORS.navy,
                      }}>
                        {d.driver_name?.[0]?.toUpperCase() ?? "D"}
                      </Avatar>
                      <Box flex={1} minWidth={0}>
                        <Typography fontWeight={800} fontSize="0.86rem" noWrap>
                          {d.driver_name}
                        </Typography>
                        <Stack direction="row" spacing={0.4} alignItems="center">
                          <Phone sx={{ fontSize: 12, color: COLORS.textSecondary }} />
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {d.driver_mobile ?? "—"}
                          </Typography>
                        </Stack>
                      </Box>
                      <Box textAlign="right">
                        <Typography fontWeight={900} fontSize="0.9rem" color={COLORS.goldDark}>
                          {fmtINR(d.pending_amount)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {d.pending_count} trip{d.pending_count === 1 ? "" : "s"}
                        </Typography>
                      </Box>
                    </Stack>
                    {age !== null && age >= 3 && (
                      <Chip
                        size="small"
                        icon={<EventBusy sx={{ fontSize: 13 }} />}
                        label={`Oldest ${age}d`}
                        sx={{
                          mt: 1, height: 20, fontSize: "0.63rem", fontWeight: 700,
                          bgcolor: alpha(COLORS.warning, 0.12), color: COLORS.goldDark,
                        }}
                      />
                    )}
                  </Box>
                );
              })
            )}
          </Box>
        </Card>

        {/* ── Right: pending records ────────────────────────── */}
        <Card sx={{ flex: 1, width: "100%", overflow: "hidden" }}>
          {!selectedDriver ? (
            <EmptyState
              icon={<PersonSearch sx={{ fontSize: 30 }} />}
              title="Select a driver"
              subtitle="Choose a driver on the left to see the cash bookings pending collection from them."
            />
          ) : (
            <>
              {/* Driver header */}
              <Box sx={{
                px: 2.5, py: 2,
                background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 100%)`,
              }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{
                    width: 44, height: 44, fontWeight: 800,
                    background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
                    color: "#000",
                  }}>
                    {selectedDriver.driver_name?.[0]?.toUpperCase() ?? "D"}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography color="#fff" fontWeight={800} fontSize="1rem" noWrap>
                      {selectedDriver.driver_name}
                    </Typography>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap">
                      <Typography variant="caption" sx={{ color: alpha("#fff", 0.7) }}>
                        {selectedDriver.driver_mobile ?? "—"}
                      </Typography>
                      {selectedDriver.vehicle_reg && (
                        <Stack direction="row" spacing={0.4} alignItems="center">
                          <DirectionsCar sx={{ fontSize: 13, color: alpha("#fff", 0.7) }} />
                          <Typography variant="caption" sx={{ color: alpha("#fff", 0.7) }}>
                            {selectedDriver.vehicle_reg}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="caption" sx={{ color: alpha("#fff", 0.6), display: "block" }}>
                      Pending
                    </Typography>
                    <Typography color={COLORS.goldLight} fontWeight={900} fontSize="1.15rem">
                      {fmtINR(pendingQ.data?.pending_amount ?? selectedDriver.pending_amount)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{ px: 2, borderBottom: `1px solid ${COLORS.border}`, minHeight: 44 }}
              >
                <Tab
                  label={
                    <Badge badgeContent={bookings.length} color="warning"
                      sx={{ "& .MuiBadge-badge": { fontSize: "0.6rem", height: 15, minWidth: 15, right: -10 } }}>
                      <span>Pending Collection</span>
                    </Badge>
                  }
                  sx={{ fontWeight: 700, fontSize: "0.82rem", minHeight: 44, textTransform: "none" }}
                />
                <Tab
                  label="Collection History"
                  sx={{ fontWeight: 700, fontSize: "0.82rem", minHeight: 44, textTransform: "none" }}
                />
              </Tabs>

              {/* ── Tab 0: pending ───────────────────────────── */}
              {tab === 0 && (
                pendingQ.isLoading ? (
                  <Stack spacing={1} sx={{ p: 2 }}>
                    {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={52} />)}
                  </Stack>
                ) : bookings.length === 0 ? (
                  <EmptyState
                    icon={<CheckCircle sx={{ fontSize: 30 }} />}
                    title="All settled"
                    subtitle="This driver has no cash pending collection."
                  />
                ) : (
                  <>
                    <Box sx={{ overflowX: "auto" }}>
                      <Table size="small" sx={{ minWidth: 720 }}>
                        <TableHead>
                          <TableRow sx={{ bgcolor: COLORS.bgMain }}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={allSelected}
                                indeterminate={someSelected}
                                onChange={toggleAll}
                                size="small"
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: "0.72rem" }}>BOOKING</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: "0.72rem" }}>CUSTOMER</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: "0.72rem" }}>TRIP ENDED</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, fontSize: "0.72rem" }}>
                              CASH
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {bookings.map((b) => {
                            const checked = selectedIds.includes(b.cab_booking_id);
                            return (
                              <TableRow
                                key={b.cab_booking_id}
                                hover
                                onClick={() => toggleOne(b.cab_booking_id)}
                                sx={{
                                  cursor: "pointer",
                                  bgcolor: checked ? alpha(COLORS.gold, 0.06) : "inherit",
                                }}
                              >
                                <TableCell padding="checkbox">
                                  <Checkbox checked={checked} size="small" />
                                </TableCell>
                                <TableCell>
                                  <Typography fontWeight={700} fontSize="0.78rem">
                                    {b.booking_number}
                                  </Typography>
                                  <Stack direction="row" spacing={0.6} alignItems="center">
                                    {b.trip_type && (
                                      <Typography variant="caption" color="text.secondary">
                                        {b.trip_type}
                                      </Typography>
                                    )}
                                    {b.invoice_number && (
                                      <Typography variant="caption" color="text.secondary"
                                        sx={{ fontSize: "0.63rem" }}>
                                        · {b.invoice_number}
                                      </Typography>
                                    )}
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  <Typography fontSize="0.78rem" fontWeight={600}>
                                    {b.customer_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {b.customer_mobile ?? "—"}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography fontSize="0.76rem">
                                    {fmtDate(b.trip_ended_at)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography fontWeight={800} fontSize="0.85rem"
                                    color={COLORS.goldDark}>
                                    {fmtINR(b.cash_amount)}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Box>

                    <Divider />

                    {/* Sticky action bar */}
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                      alignItems={{ xs: "stretch", sm: "center" }}
                      sx={{
                        p: 2,
                        position: "sticky", bottom: 0,
                        bgcolor: COLORS.bgCard,
                        borderTop: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <Box flex={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {selectedIds.length} of {bookings.length} selected
                        </Typography>
                        <Typography fontWeight={900} fontSize="1.2rem" lineHeight={1.2}>
                          {fmtINR(selectedTotal)}
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        startIcon={<Payments />}
                        disabled={selectedIds.length === 0}
                        onClick={openModal}
                        sx={{ fontWeight: 800, minWidth: 200 }}
                      >
                        Collect Selected
                      </Button>
                    </Stack>
                  </>
                )
              )}

              {/* ── Tab 1: history ───────────────────────────── */}
              {tab === 1 && (
                historyQ.isLoading ? (
                  <Stack spacing={1} sx={{ p: 2 }}>
                    {[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={56} />)}
                  </Stack>
                ) : (historyQ.data?.items.length ?? 0) === 0 ? (
                  <EmptyState
                    icon={<HistoryToggleOff sx={{ fontSize: 30 }} />}
                    title="No collections yet"
                    subtitle="Cash you collect from this driver will be listed here."
                  />
                ) : (
                  <Box sx={{ overflowX: "auto" }}>
                    <Table size="small" sx={{ minWidth: 640 }}>
                      <TableHead>
                        <TableRow sx={{ bgcolor: COLORS.bgMain }}>
                          <TableCell sx={{ fontWeight: 800, fontSize: "0.72rem" }}>COLLECTION</TableCell>
                          <TableCell sx={{ fontWeight: 800, fontSize: "0.72rem" }}>DATE</TableCell>
                          <TableCell sx={{ fontWeight: 800, fontSize: "0.72rem" }}>TRIPS</TableCell>
                          <TableCell sx={{ fontWeight: 800, fontSize: "0.72rem" }}>VIA</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, fontSize: "0.72rem" }}>
                            AMOUNT
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {historyQ.data!.items.map((h) => (
                          <TableRow key={h.id} hover>
                            <TableCell>
                              <Typography fontWeight={700} fontSize="0.78rem">
                                {h.collection_number}
                              </Typography>
                              {h.reference_note && (
                                <Typography variant="caption" color="text.secondary" noWrap
                                  sx={{ display: "block", maxWidth: 220 }}>
                                  {h.reference_note}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography fontSize="0.76rem">{fmtDate(h.collected_at)}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography fontSize="0.78rem" fontWeight={600}>
                                {h.bookings_count}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={h.payment_method} size="small"
                                sx={{ height: 20, fontSize: "0.63rem", fontWeight: 700 }} />
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={800} fontSize="0.85rem" color={COLORS.success}>
                                {fmtINR(h.collected_amount)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )
              )}
            </>
          )}
        </Card>
      </Stack>

      {/* ── Collect modal ───────────────────────────────────── */}
      {selectedDriver && (
        <CollectCashModal
          open={modalOpen}
          driverName={selectedDriver.driver_name}
          driverCode={selectedDriver.driver_code}
          driverMobile={selectedDriver.driver_mobile}
          vehicleReg={selectedDriver.vehicle_reg}
          bookings={selectedBookings}
          busy={collectMut.isPending}
          error={collectError}
          result={collectResult}
          onClose={closeModal}
          onConfirm={(p) => collectMut.mutate(p)}
        />
      )}
    </Box>
  );
}
