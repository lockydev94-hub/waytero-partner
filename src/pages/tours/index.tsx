// ============================================================
// WAYTERO PARTNER PORTAL — TOURS PAGE (REWRITE)
// Doc Ref: BRD_PART_5_TOUR_PACKAGE_MANAGEMENT §3
// Pattern mirrors partner Hotels page: stat cards, search,
// status filter, card list of own packages, drawer-based
// PackageEditor (create / edit), submit-for-review action.
// ============================================================
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Stack, Paper, Chip, Button, Alert,
  TextField, InputAdornment, CircularProgress, Avatar, Divider,
  alpha, Tooltip, Skeleton, Select, MenuItem, FormControl, InputLabel,
  Drawer, IconButton,
} from "@mui/material";
import {
  TravelExplore, Search, Refresh, Add,
  CheckCircle, HourglassTop, Cancel, EditNote, PauseCircle, Visibility,
  StarRounded, AttachMoney, CalendarMonth, People, AccessTime,
  LocationOn, Edit, Send, Close, BookOnline, Star, FlightTakeoff,
  WarningAmber, Image as ImageIcon,
} from "@mui/icons-material";
import { COLORS } from "../../theme";
import { tourService, PartnerTourPackage, PartnerTourStats } from "../../services/tour.service";
import PartnerPackageEditor from "../../components/tours/PackageEditor";

// ── Status meta ──────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  DRAFT:             { label: "Draft",             color: COLORS.textSecondary, icon: <EditNote sx={{ fontSize: 14 }} /> },
  PENDING_APPROVAL:  { label: "Pending Review",    color: COLORS.warning,       icon: <HourglassTop sx={{ fontSize: 14 }} /> },
  APPROVED:          { label: "Approved",          color: "#6366F1",            icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  ACTIVE:            { label: "Live",              color: COLORS.success,       icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  INACTIVE:          { label: "Inactive",          color: COLORS.textSecondary, icon: <PauseCircle sx={{ fontSize: 14 }} /> },
  SUSPENDED:         { label: "Suspended",         color: COLORS.warning,       icon: <PauseCircle sx={{ fontSize: 14 }} /> },
  REJECTED:          { label: "Rejected",          color: COLORS.error,         icon: <Cancel sx={{ fontSize: 14 }} /> },
};

const STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "ACTIVE", label: "Live" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "REJECTED", label: "Rejected" },
];

const PACKAGE_TYPE_LABELS: Record<string, string> = {
  FIXED: "Fixed Departure",
  PRIVATE: "Private Tour",
  GROUP: "Group Tour",
  PILGRIMAGE: "Pilgrimage",
  CORPORATE: "Corporate / MICE",
};

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: JSX.Element }) {
  return (
    <Paper elevation={0} sx={{
      p: 2, borderRadius: 3, border: `1px solid ${COLORS.border}`,
      display: "flex", alignItems: "center", gap: 1.5,
      background: `linear-gradient(135deg, ${alpha(color, 0.08)}, ${alpha(color, 0.02)})`,
      flex: 1, minWidth: 100,
    }}>
      <Box sx={{
        width: 40, height: 40, borderRadius: 2,
        bgcolor: alpha(color, 0.12),
        display: "flex", alignItems: "center", justifyContent: "center",
        "& svg": { fontSize: 20, color }, flexShrink: 0,
      }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontSize: "1.35rem", fontWeight: 900, color: COLORS.textPrimary, lineHeight: 1 }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary, fontWeight: 500, mt: 0.25 }}>
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}

// ── Tour card ─────────────────────────────────────────────────
function TourCard({
  pkg, onEdit, onSubmit, onViewBookings, onView, onPreview,
}: {
  pkg: PartnerTourPackage;
  onEdit: () => void;
  onSubmit: () => void;
  onViewBookings: () => void;
  onView: () => void;
  onPreview: () => void;
}) {
  const meta = STATUS_META[pkg.status] ?? STATUS_META.DRAFT;
  const hero = pkg.media.find(m => m.is_primary)?.media_url || pkg.media[0]?.media_url;
  const startingPrice = pkg.pricing.length > 0
    ? Math.min(...pkg.pricing.map(p => p.package_price))
    : 0;
  const isLocked = ["ACTIVE", "SUSPENDED"].includes(pkg.status);
  const canSubmit = ["DRAFT", "REJECTED"].includes(pkg.status);
  const hasMissingFields = pkg.itinerary.length === 0 || pkg.pricing.length === 0 || pkg.media.length === 0;

  return (
    <Paper elevation={0} sx={{
      p: 2.5, borderRadius: 3, border: `1px solid ${COLORS.border}`,
      bgcolor: COLORS.bgCard, transition: "all 0.15s",
      "&:hover": { borderColor: alpha(COLORS.navy, 0.2), boxShadow: "0 4px 20px rgba(0,0,0,0.07)" },
    }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
        {/* Hero image / icon */}
        <Box sx={{
          width: { xs: "100%", sm: 140 }, height: { xs: 160, sm: 110 },
          borderRadius: 2.5, overflow: "hidden", flexShrink: 0,
          bgcolor: alpha(COLORS.navy, 0.08),
          backgroundImage: hero ? `url(${hero})` : undefined,
          backgroundSize: "cover", backgroundPosition: "center",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
        }}>
          {!hero && <TravelExplore sx={{ fontSize: 36, color: alpha(COLORS.navy, 0.4) }} />}
          {pkg.package_type && (
            <Chip
              size="small"
              label={PACKAGE_TYPE_LABELS[pkg.package_type] || pkg.package_type}
              icon={pkg.package_type === "PILGRIMAGE" ? <Star sx={{ fontSize: 12 }} /> : <FlightTakeoff sx={{ fontSize: 12 }} />}
              sx={{
                position: "absolute", top: 6, left: 6,
                height: 22, fontSize: 10, fontWeight: 800,
                bgcolor: "rgba(255,255,255,0.95)", color: COLORS.navy,
                "& .MuiChip-icon": { color: COLORS.gold },
              }}
            />
          )}
        </Box>

        {/* Main info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 0.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: COLORS.textPrimary }} noWrap>
              {pkg.package_name}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
            <LocationOn sx={{ fontSize: 14, color: COLORS.textSecondary }} />
            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>
              {pkg.destination}{pkg.city_name ? ` · ${pkg.city_name}` : ""}
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary, mx: 0.5 }}>·</Typography>
            <AccessTime sx={{ fontSize: 14, color: COLORS.textSecondary }} />
            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>
              {pkg.duration_days}D / {pkg.duration_nights}N
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary, mx: 0.5 }}>·</Typography>
            <People sx={{ fontSize: 14, color: COLORS.textSecondary }} />
            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>
              {pkg.minimum_persons}–{pkg.maximum_persons || "∞"} pax
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1, gap: 0.5 }}>
            <Chip
              icon={meta.icon}
              label={meta.label}
              size="small"
              sx={{
                height: 22, fontSize: 11, fontWeight: 700,
                bgcolor: alpha(meta.color, 0.1),
                color: meta.color,
                border: `1px solid ${alpha(meta.color, 0.25)}`,
                "& .MuiChip-icon": { color: meta.color },
              }}
            />
            <Chip
              size="small"
              variant="outlined"
              label={pkg.package_code}
              sx={{ height: 22, fontSize: 10, fontFamily: "monospace" }}
            />
          </Stack>

          <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }} noWrap>
            {pkg.short_description || "No short description yet."}
          </Typography>

          {/* Inline status hints */}
          {pkg.status === "REJECTED" && pkg.rejection_reason && (
            <Alert
              severity="error"
              icon={<WarningAmber sx={{ fontSize: 16 }} />}
              sx={{ mt: 1, py: 0.5, fontSize: 12 }}
            >
              <b>Admin feedback:</b> {pkg.rejection_reason}
            </Alert>
          )}
          {pkg.status === "DRAFT" && hasMissingFields && (
            <Alert
              severity="warning"
              icon={<WarningAmber sx={{ fontSize: 16 }} />}
              sx={{ mt: 1, py: 0.5, fontSize: 12 }}
            >
              Add itinerary, pricing, and an image before submitting for review.
            </Alert>
          )}
          {pkg.status === "PENDING_APPROVAL" && (
            <Alert
              severity="info"
              icon={<HourglassTop sx={{ fontSize: 16 }} />}
              sx={{ mt: 1, py: 0.5, fontSize: 12 }}
            >
              Awaiting admin review. We typically respond within 1 business day.
            </Alert>
          )}
        </Box>

        {/* Right side: pricing + actions */}
        <Box sx={{ textAlign: "right", flexShrink: 0, minWidth: 140 }}>
          {startingPrice > 0 ? (
            <>
              <Typography sx={{ fontSize: "0.65rem", color: COLORS.textSecondary, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Starting from
              </Typography>
              <Typography sx={{ fontSize: "1.2rem", fontWeight: 900, color: COLORS.navy, lineHeight: 1.1 }}>
                ₹{startingPrice.toLocaleString("en-IN")}
              </Typography>
              <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary, mb: 1 }}>
                {pkg.pricing.length} pricing slab{pkg.pricing.length === 1 ? "" : "s"}
              </Typography>
            </>
          ) : (
            <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary, fontStyle: "italic", mb: 1 }}>
              No pricing set
            </Typography>
          )}

          <Stack direction="column" spacing={0.75} alignItems="stretch">
            <Button
              size="small"
              variant="outlined"
              startIcon={<Visibility sx={{ fontSize: 14 }} />}
              onClick={onView}
              sx={{
                fontSize: "0.72rem", fontWeight: 700,
                borderColor: alpha(COLORS.navy, 0.25), color: COLORS.navy,
                height: 28, px: 1.25,
                "&:hover": { borderColor: COLORS.navy, bgcolor: alpha(COLORS.navy, 0.04) },
              }}
            >
              View
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Edit sx={{ fontSize: 14 }} />}
              onClick={onEdit}
              disabled={isLocked}
              sx={{
                fontSize: "0.72rem", fontWeight: 700,
                borderColor: alpha(COLORS.navy, 0.25), color: COLORS.navy,
                height: 28, px: 1.25,
                "&:hover": { borderColor: COLORS.navy, bgcolor: alpha(COLORS.navy, 0.04) },
              }}
            >
              Edit
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<BookOnline sx={{ fontSize: 14 }} />}
              onClick={onViewBookings}
              sx={{
                fontSize: "0.72rem", fontWeight: 700,
                borderColor: alpha(COLORS.gold, 0.4), color: COLORS.goldDark,
                height: 28, px: 1.25,
                "&:hover": { borderColor: COLORS.gold, bgcolor: alpha(COLORS.gold, 0.06) },
              }}
            >
              Bookings
            </Button>
            {canSubmit && (
              <Button
                size="small"
                variant="contained"
                startIcon={<Send sx={{ fontSize: 14 }} />}
                onClick={onSubmit}
                disabled={hasMissingFields}
                sx={{
                  fontSize: "0.72rem", fontWeight: 700,
                  height: 28, px: 1.25,
                }}
              >
                Submit
              </Button>
            )}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function ToursPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<PartnerTourPackage[]>([]);
  const [stats, setStats] = useState<PartnerTourStats | null>(null);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Editor drawer state
  const [editing, setEditing] = useState<PartnerTourPackage | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // Fetch all data
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, statsData, citiesData] = await Promise.all([
        tourService.list(),
        tourService.getStats().catch(() => null),
        tourService.getCities(),
      ]);
      setItems(list);
      if (statsData) setStats(statsData);
      setCities(citiesData);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.response?.data?.message ?? "Failed to load tour packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Filtered list
  const filtered = useMemo(() => {
    return items.filter(p => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${p.package_name} ${p.destination} ${p.city_name ?? ""} ${p.package_code}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, statusFilter]);

  const handleEdit = (p: PartnerTourPackage) => {
    setEditing(p);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const handleSubmit = async (p: PartnerTourPackage) => {
    if (!window.confirm(`Submit "${p.package_name}" for admin review? You won't be able to edit until reviewed.`)) return;
    try {
      await tourService.submit(p.id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.response?.data?.message ?? "Failed to submit package");
    }
  };

  const handleViewBookings = (p: PartnerTourPackage) => {
    navigate(`/dashboard/tours/${p.id}/bookings`);
  };

  const handleView = (p: PartnerTourPackage) => {
    navigate(`/dashboard/tours/${p.id}`);
  };

  const onSaved = async () => {
    setEditorOpen(false);
    setEditing(null);
    await load();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{
            width: 44, height: 44, borderRadius: 2.5,
            background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyMid})`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <TravelExplore sx={{ fontSize: 22, color: COLORS.gold }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: "1.25rem", color: COLORS.textPrimary }}>
              Tour Packages
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>
              Build and manage your tour products
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <Button
              variant="outlined"
              size="small"
              onClick={load}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={14} /> : <Refresh />}
              sx={{ borderColor: COLORS.border, color: COLORS.textSecondary }}
            >
              Refresh
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreate}
            sx={{ fontWeight: 700 }}
          >
            Create Package
          </Button>
        </Stack>
      </Stack>

      {/* Stat cards */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 3 }}>
        <StatCard
          label="Total Packages"
          value={stats?.total_packages ?? items.length}
          color={COLORS.navy}
          icon={<TravelExplore />}
        />
        <StatCard
          label="Live on Website"
          value={stats?.active ?? items.filter(p => p.status === "ACTIVE").length}
          color={COLORS.success}
          icon={<CheckCircle />}
        />
        <StatCard
          label="Awaiting Review"
          value={stats?.pending_review ?? items.filter(p => p.status === "PENDING_APPROVAL").length}
          color={COLORS.warning}
          icon={<HourglassTop />}
        />
        <StatCard
          label="Total Bookings"
          value={stats?.total_bookings ?? 0}
          color={COLORS.info}
          icon={<BookOnline />}
        />
      </Stack>

      {/* Info banner */}
      <Alert
        severity="info"
        icon={<FlightTakeoff sx={{ fontSize: 18 }} />}
        sx={{ mb: 2, fontSize: 12, "& .MuiAlert-message": { width: "100%" } }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" spacing={1}>
          <span>
            Commission for tour bookings is set by admin in <b>Settings → Commission</b>. Your payout is calculated automatically.
          </span>
          {stats && (
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.success }}>
              Lifetime revenue: ₹{(stats.revenue_lifetime || 0).toLocaleString("en-IN")}
            </Typography>
          )}
        </Stack>
      </Alert>

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2.5, border: `1px solid ${COLORS.border}`, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
          <TextField
            size="small"
            placeholder="Search packages…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: COLORS.textSecondary }} /></InputAdornment>,
            }}
            sx={{ flex: 1, bgcolor: COLORS.bgMain, borderRadius: 1.5, "& fieldset": { borderColor: COLORS.border } }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} label="Status">
              {STATUS_FILTERS.map(s => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* List */}
      {loading ? (
        <Stack spacing={1.5}>
          {[1, 2, 3].map(i => (
            <Paper key={i} elevation={0} sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${COLORS.border}` }}>
              <Stack direction="row" spacing={2}>
                <Skeleton variant="rectangular" width={140} height={110} sx={{ borderRadius: 2.5 }} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="50%" height={20} />
                  <Skeleton width="40%" height={16} sx={{ mt: 0.5 }} />
                  <Skeleton width="30%" height={24} sx={{ mt: 1 }} />
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : filtered.length === 0 ? (
        <Paper elevation={0} sx={{
          p: 6, borderRadius: 3, border: `1px solid ${COLORS.border}`, textAlign: "center",
        }}>
          <Box sx={{
            width: 72, height: 72, borderRadius: 4, mx: "auto", mb: 2,
            bgcolor: alpha(COLORS.navy, 0.06),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <TravelExplore sx={{ fontSize: 32, color: alpha(COLORS.navy, 0.3) }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: COLORS.textPrimary, mb: 0.5 }}>
            {items.length === 0 ? "Start your tour catalog" : "No packages match your filters"}
          </Typography>
          <Typography sx={{ fontSize: "0.85rem", color: COLORS.textSecondary, maxWidth: 420, mx: "auto", mb: 2 }}>
            {items.length === 0
              ? "Create your first tour package with a realistic itinerary, transparent pricing, and great photos. Admin will review and activate it within 1 business day."
              : "Try adjusting your search or status filter to find what you're looking for."}
          </Typography>
          {items.length === 0 && (
            <Button startIcon={<Add />} variant="contained" onClick={handleCreate}>
              Add your first package
            </Button>
          )}
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {filtered.map(p => (
            <TourCard
              key={p.id}
              pkg={p}
              onEdit={() => handleEdit(p)}
              onSubmit={() => handleSubmit(p)}
              onViewBookings={() => handleViewBookings(p)}
              onView={() => handleView(p)}
              onPreview={() => handleView(p)}
            />
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", py: 1 }}>
            Showing {filtered.length} of {items.length} packages
          </Typography>
        </Stack>
      )}

      {/* Editor Drawer */}
      <Drawer
        anchor="right"
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditing(null); }}
        PaperProps={{ sx: { width: { xs: "100%", md: 960 }, maxWidth: "100%" } }}
      >
        <Box sx={{ p: 2.5, borderBottom: `1px solid ${COLORS.border}`, bgcolor: COLORS.bgMain }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{
                width: 40, height: 40, borderRadius: 2,
                background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyMid})`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <TravelExplore sx={{ fontSize: 20, color: COLORS.gold }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: "1.1rem", color: COLORS.textPrimary }}>
                  {editing ? `Edit: ${editing.package_name}` : "Create Tour Package"}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
                  {editing
                    ? "Make changes and re-submit for review"
                    : "Build a sellable tour product step by step"}
                </Typography>
              </Box>
            </Stack>
            <IconButton onClick={() => { setEditorOpen(false); setEditing(null); }}>
              <Close />
            </IconButton>
          </Stack>
        </Box>
        <Box sx={{ p: 3, overflow: "auto", flex: 1 }}>
          <PartnerPackageEditor
            open={editorOpen}
            initial={editing}
            cities={cities}
            onClose={() => { setEditorOpen(false); setEditing(null); }}
            onSaved={onSaved}
          />
        </Box>
      </Drawer>
    </Box>
  );
}
