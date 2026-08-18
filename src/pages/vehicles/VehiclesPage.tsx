// ============================================================
// WAYTERO PARTNER PORTAL — VEHICLES PAGE
// Doc Ref: Frontend Architecture §14 Vehicle Management
//          Vehicle API §3–§15 | DB Schema Part 3 §12–§15
//
// Lifecycle: PENDING → UNDER_REVIEW → APPROVED → ACTIVE → ON_TRIP → MAINTENANCE → SUSPENDED
// Partner flow:
//   1. Register vehicle (POST /vehicles)
//   2. Upload documents: RC, INSURANCE, FITNESS, PERMIT, PUC (POST /vehicles/{uuid}/documents)
//   3. Admin / Verification Officer reviews → APPROVED → ACTIVE
// ============================================================
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box, Typography, Button, Grid, alpha, Chip, InputAdornment,
  TextField, ToggleButtonGroup, ToggleButton, CircularProgress,
  Alert, Skeleton, Tooltip, Fade, Paper, Badge,
} from "@mui/material";
import {
  Add, DirectionsCar, GridView, ViewList, Search,
  Refresh, FilterList, CheckCircle, HourglassTop,
  VerifiedUser, Block, LocalTaxi, Build,
} from "@mui/icons-material";
import { COLORS } from "../../theme";
import { vehicleService } from "../../services/vehicle.service";
import type {
  VehicleListItem, Vehicle, VehicleCategory, City,
} from "../../services/vehicle.service";
import { useAuthStore } from "../../store/authStore";

import AddVehicleModal from "./components/AddVehicleModal";
import UploadDocumentModal from "./components/UploadDocumentModal";
import VehicleCard from "./components/VehicleCard";
import VehicleDetailDrawer from "./components/VehicleDetailDrawer";
import VehicleStatusBadge from "./components/VehicleStatusBadge";

// ── Status filter tabs ────────────────────────────────────
const STATUS_TABS = [
  { value: "ALL",          label: "All",          icon: <DirectionsCar sx={{ fontSize: 14 }} /> },
  { value: "PENDING",      label: "Pending",      icon: <HourglassTop sx={{ fontSize: 14 }} /> },
  { value: "UNDER_REVIEW", label: "Under Review", icon: <VerifiedUser sx={{ fontSize: 14 }} /> },
  { value: "APPROVED",     label: "Approved",     icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  { value: "ACTIVE",       label: "Active",       icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  { value: "SUSPENDED",    label: "Suspended",    icon: <Block sx={{ fontSize: 14 }} /> },
] as const;

type StatusFilter = typeof STATUS_TABS[number]["value"];

// ── Stat card ─────────────────────────────────────────────
function StatCard({
  label, value, color, icon,
}: { label: string; value: number; color: string; icon: JSX.Element }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2, borderRadius: 3, border: `1px solid ${COLORS.border}`,
        display: "flex", alignItems: "center", gap: 1.5,
        background: `linear-gradient(135deg, ${alpha(color, 0.06)}, ${alpha(color, 0.02)})`,
        flex: 1, minWidth: 120,
      }}
    >
      <Box
        sx={{
          width: 40, height: 40, borderRadius: 2,
          bgcolor: alpha(color, 0.12),
          display: "flex", alignItems: "center", justifyContent: "center",
          "& svg": { fontSize: 20, color },
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: "1.4rem", fontWeight: 900, color: COLORS.textPrimary, lineHeight: 1 }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary, fontWeight: 500, mt: 0.25 }}>
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}

// ── Row view item ─────────────────────────────────────────
function VehicleRow({
  vehicle, categoryName, docCount, onView,
}: {
  vehicle: VehicleListItem; categoryName: string; docCount: number; onView: (uuid: string) => void;
}) {
  const REQUIRED = 5;
  const progress = Math.min((docCount / REQUIRED) * 100, 100);

  return (
    <Box
      onClick={() => onView(vehicle.uuid)}
      sx={{
        display: "flex", alignItems: "center", gap: 2,
        p: 2, borderRadius: 2.5,
        border: `1px solid ${COLORS.border}`,
        bgcolor: COLORS.bgCard,
        cursor: "pointer",
        transition: "all 0.15s",
        "&:hover": { borderColor: alpha(COLORS.navy, 0.2), boxShadow: "0 4px 16px rgba(0,0,0,0.06)" },
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: 42, height: 42, borderRadius: 2,
          bgcolor: alpha(COLORS.navy, 0.06),
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <DirectionsCar sx={{ fontSize: 20, color: COLORS.navy }} />
      </Box>

      {/* Reg + model */}
      <Box sx={{ flex: "0 0 160px", minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: "0.88rem", color: COLORS.textPrimary, fontFamily: "monospace" }}>
          {vehicle.registration_number}
        </Typography>
        <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }} noWrap>
          {vehicle.vehicle_brand ?? "—"} {vehicle.vehicle_model ?? ""}
        </Typography>
      </Box>

      {/* Category */}
      <Box sx={{ flex: "0 0 110px", display: { xs: "none", md: "block" } }}>
        <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>{categoryName}</Typography>
      </Box>

      {/* Fuel / seats */}
      <Box sx={{ flex: "0 0 120px", display: { xs: "none", sm: "flex" }, gap: 0.75 }}>
        {vehicle.fuel_type && (
          <Chip label={vehicle.fuel_type} size="small"
            sx={{ height: 20, fontSize: "0.65rem", bgcolor: alpha(COLORS.info, 0.08), color: COLORS.info, borderRadius: 1 }} />
        )}
        {vehicle.seating_capacity && (
          <Chip label={`${vehicle.seating_capacity}S`} size="small"
            sx={{ height: 20, fontSize: "0.65rem", bgcolor: alpha(COLORS.navy, 0.06), color: COLORS.navy, borderRadius: 1 }} />
        )}
      </Box>

      {/* Doc progress */}
      <Box sx={{ flex: "0 0 80px", display: { xs: "none", lg: "block" } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.4 }}>
          <Typography sx={{ fontSize: "0.65rem", color: docCount >= REQUIRED ? COLORS.success : COLORS.warning, fontWeight: 700 }}>
            {docCount}/{REQUIRED} docs
          </Typography>
        </Box>
        <Box sx={{ height: 4, borderRadius: 2, bgcolor: alpha(COLORS.border, 0.8) }}>
          <Box sx={{
            height: "100%", borderRadius: 2, width: `${progress}%`,
            bgcolor: docCount >= REQUIRED ? COLORS.success : COLORS.warning,
            transition: "width 0.3s",
          }} />
        </Box>
      </Box>

      {/* Status */}
      <Box sx={{ ml: "auto", flexShrink: 0 }}>
        <VehicleStatusBadge status={vehicle.status} />
      </Box>
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function VehiclesPage() {
  const { user } = useAuthStore();
  const partnerId = user?.partner_id ?? 0;  // Integer partners.id from auth response

  // Data
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  // ── Load meta (categories + cities) once ─────────────
  useEffect(() => {
    Promise.all([vehicleService.getCategories(), vehicleService.getCities()])
      .then(([cats, ctys]) => {
        setCategories(cats);
        setCities(ctys);
      })
      .catch(() => {}); // non-blocking
  }, []);

  // ── Fetch vehicle list ────────────────────────────────
  const fetchVehicles = useCallback(async (showRefreshing = false) => {
    if (!partnerId) return;
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await vehicleService.listMyVehicles(partnerId, 1, 100);
      setVehicles(res.items ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to load vehicles.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [partnerId]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  // ── Open detail drawer — fetch full vehicle ───────────
  const openDetail = async (uuid: string) => {
    setDrawerOpen(true);
    try {
      const v = await vehicleService.getVehicle(uuid);
      setDetailVehicle(v);
      // Update doc count cache
      setDocCounts((prev) => ({
        ...prev,
        [uuid]: v.documents.filter(
          (d) => ["RC", "INSURANCE", "FITNESS_CERTIFICATE", "PERMIT", "PUC"].includes(d.document_type ?? "")
        ).length,
      }));
    } catch {}
  };

  // ── Register vehicle ───────────────────────────────────
  const handleRegister = async (payload: Parameters<typeof vehicleService.registerVehicle>[1]) => {
    const v = await vehicleService.registerVehicle(partnerId, payload);
    await fetchVehicles(true);
    // Immediately open detail so partner can upload docs/photos
    openDetail(v.uuid);
    return v;
  };

  // ── Upload document ────────────────────────────────────
  const handleUploadDoc = async (
    payload: Parameters<typeof vehicleService.uploadDocument>[2]
  ) => {
    if (!detailVehicle) return;
    await vehicleService.uploadDocument(detailVehicle.uuid, partnerId, payload);
    // Refresh detail view
    const updated = await vehicleService.getVehicle(detailVehicle.uuid);
    setDetailVehicle(updated);
    const count = updated.documents.filter(
      (d) => ["RC", "INSURANCE", "FITNESS_CERTIFICATE", "PERMIT", "PUC"].includes(d.document_type ?? "")
    ).length;
    setDocCounts((prev) => ({ ...prev, [detailVehicle.uuid]: count }));
    await fetchVehicles(true);
  };

  // ── Upload file to Cloudinary ─────────────────────────
  const handleUploadFile = async (file: File, type: "document") => {
    return vehicleService.uploadFile(file, type);
  };

  // ── Derived stats ─────────────────────────────────────
  const stats = useMemo(() => ({
    total:      vehicles.length,
    active:     vehicles.filter((v) => v.status === "ACTIVE").length,
    pending:    vehicles.filter((v) => ["PENDING", "UNDER_REVIEW"].includes(v.status)).length,
    onTrip:     vehicles.filter((v) => v.status === "ON_TRIP").length,
    suspended:  vehicles.filter((v) => v.status === "SUSPENDED").length,
  }), [vehicles]);

  // ── Filtered list ─────────────────────────────────────
  const filtered = useMemo(() => {
    let list = vehicles;
    if (statusFilter !== "ALL") list = list.filter((v) => v.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.registration_number.toLowerCase().includes(q) ||
          (v.vehicle_brand ?? "").toLowerCase().includes(q) ||
          (v.vehicle_model ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [vehicles, statusFilter, search]);

  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.category_name])),
    [categories]
  );

  // ── Render ────────────────────────────────────────────
  return (
    <Box>
      {/* ── Page header ── */}
      <Box
        sx={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          mb: 3, flexWrap: "wrap", gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{ fontWeight: 900, fontSize: { xs: "1.4rem", sm: "1.75rem" }, color: COLORS.textPrimary, lineHeight: 1.1 }}
          >
            My Fleet
          </Typography>
          <Typography sx={{ fontSize: "0.82rem", color: COLORS.textSecondary, mt: 0.5 }}>
            Register vehicles, upload documents and track verification status
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Tooltip title="Refresh">
            <Button
              variant="outlined" size="small"
              onClick={() => fetchVehicles(true)}
              disabled={refreshing}
              sx={{
                borderRadius: 2.5, minWidth: 36, px: 1.5,
                borderColor: COLORS.border, color: COLORS.textSecondary,
              }}
            >
              {refreshing
                ? <CircularProgress size={16} />
                : <Refresh sx={{ fontSize: 18 }} />}
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddOpen(true)}
            sx={{
              borderRadius: 2.5, fontWeight: 700, px: 2.5,
              background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyMid})`,
              color: "#fff",
              "&:hover": { background: `linear-gradient(135deg, ${COLORS.navyMid}, ${COLORS.navy})` },
            }}
          >
            Add Vehicle
          </Button>
        </Box>
      </Box>

      {/* ── Error banner ── */}
      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* ── Stats row ── */}
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 3 }}>
        <StatCard label="Total Vehicles" value={stats.total} color={COLORS.navy} icon={<DirectionsCar />} />
        <StatCard label="Active" value={stats.active} color={COLORS.success} icon={<CheckCircle />} />
        <StatCard label="Pending Review" value={stats.pending} color={COLORS.warning} icon={<HourglassTop />} />
        <StatCard label="On Trip" value={stats.onTrip} color="#8B5CF6" icon={<LocalTaxi />} />
        <StatCard label="Suspended" value={stats.suspended} color={COLORS.error} icon={<Block />} />
      </Box>

      {/* ── Filter toolbar ── */}
      <Paper
        elevation={0}
        sx={{
          p: 2, mb: 2.5, borderRadius: 3,
          border: `1px solid ${COLORS.border}`,
          display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <TextField
          size="small"
          placeholder="Search by reg. number or model…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 18, color: COLORS.textSecondary }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 280, "& .MuiOutlinedInput-root": { borderRadius: 2.5, height: 38 } }}
        />

        {/* Status tabs */}
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
          {STATUS_TABS.map((tab) => {
            const count = tab.value === "ALL"
              ? vehicles.length
              : vehicles.filter((v) => v.status === tab.value).length;
            const active = statusFilter === tab.value;
            return (
              <Chip
                key={tab.value}
                label={`${tab.label}${count > 0 ? ` (${count})` : ""}`}
                size="small"
                onClick={() => setStatusFilter(tab.value)}
                sx={{
                  height: 28, fontSize: "0.72rem", fontWeight: active ? 700 : 600,
                  borderRadius: 2, cursor: "pointer",
                  bgcolor: active ? alpha(COLORS.navy, 0.9) : alpha(COLORS.navy, 0.05),
                  color: active ? "#fff" : COLORS.textSecondary,
                  border: active ? "none" : `1px solid ${COLORS.border}`,
                  transition: "all 0.15s",
                  "&:hover": {
                    bgcolor: active ? alpha(COLORS.navy, 0.9) : alpha(COLORS.navy, 0.1),
                  },
                }}
              />
            );
          })}
        </Box>

        {/* View toggle */}
        <Box sx={{ ml: "auto" }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
            size="small"
            sx={{ "& .MuiToggleButton-root": { px: 1.25, py: 0.625, borderRadius: "8px !important", border: `1px solid ${COLORS.border} !important` } }}
          >
            <ToggleButton value="grid"><GridView sx={{ fontSize: 18 }} /></ToggleButton>
            <ToggleButton value="list"><ViewList sx={{ fontSize: 18 }} /></ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* ── Content ── */}
      {loading ? (
        /* Skeleton grid */
        <Grid container spacing={2}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={12} sm={6} lg={4} key={i}>
              <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <Fade in>
          <Box
            sx={{
              py: 10, textAlign: "center",
              border: `2px dashed ${COLORS.border}`,
              borderRadius: 4, bgcolor: alpha(COLORS.bgMain, 0.5),
            }}
          >
            <Box
              sx={{
                width: 72, height: 72, borderRadius: "50%",
                bgcolor: alpha(COLORS.navy, 0.06),
                display: "flex", alignItems: "center", justifyContent: "center",
                mx: "auto", mb: 2.5,
              }}
            >
              <DirectionsCar sx={{ fontSize: 36, color: alpha(COLORS.navy, 0.35) }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: COLORS.textPrimary, mb: 0.75 }}>
              {search || statusFilter !== "ALL" ? "No vehicles match your filter" : "No vehicles registered yet"}
            </Typography>
            <Typography sx={{ fontSize: "0.82rem", color: COLORS.textSecondary, mb: 3, maxWidth: 360, mx: "auto" }}>
              {search || statusFilter !== "ALL"
                ? "Try adjusting your search or filter criteria."
                : "Add your first vehicle to get started. Once registered and verified, it will be available for bookings."}
            </Typography>
            {!search && statusFilter === "ALL" && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setAddOpen(true)}
                sx={{
                  borderRadius: 2.5, fontWeight: 700,
                  background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
                  color: "#000",
                }}
              >
                Register First Vehicle
              </Button>
            )}
          </Box>
        </Fade>
      ) : viewMode === "grid" ? (
        /* Grid view */
        <Fade in>
          <Grid container spacing={2}>
            {filtered.map((v) => (
              <Grid item xs={12} sm={6} lg={4} key={v.uuid}>
                <VehicleCard
                  vehicle={v}
                  categoryName={catMap[v.vehicle_category_id] ?? `Cat #${v.vehicle_category_id}`}
                  docCount={docCounts[v.uuid] ?? v.doc_count}
                  onView={openDetail}
                />
              </Grid>
            ))}
          </Grid>
        </Fade>
      ) : (
        /* List view */
        <Fade in>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {/* List header */}
            <Box
              sx={{
                display: "flex", alignItems: "center", gap: 2,
                px: 2, py: 1, borderRadius: 2,
                bgcolor: alpha(COLORS.navy, 0.04),
              }}
            >
              <Box sx={{ flex: "0 0 42px" }} />
              <Typography sx={{ flex: "0 0 160px", fontSize: "0.7rem", fontWeight: 700, color: COLORS.textSecondary }}>VEHICLE</Typography>
              <Typography sx={{ flex: "0 0 110px", fontSize: "0.7rem", fontWeight: 700, color: COLORS.textSecondary, display: { xs: "none", md: "block" } }}>CATEGORY</Typography>
              <Typography sx={{ flex: "0 0 120px", fontSize: "0.7rem", fontWeight: 700, color: COLORS.textSecondary, display: { xs: "none", sm: "block" } }}>SPECS</Typography>
              <Typography sx={{ flex: "0 0 80px", fontSize: "0.7rem", fontWeight: 700, color: COLORS.textSecondary, display: { xs: "none", lg: "block" } }}>DOCUMENTS</Typography>
              <Typography sx={{ ml: "auto", fontSize: "0.7rem", fontWeight: 700, color: COLORS.textSecondary }}>STATUS</Typography>
            </Box>
            {filtered.map((v) => (
              <VehicleRow
                key={v.uuid}
                vehicle={v}
                categoryName={catMap[v.vehicle_category_id] ?? `Cat #${v.vehicle_category_id}`}
                docCount={docCounts[v.uuid] ?? v.doc_count}
                onView={openDetail}
              />
            ))}
          </Box>
        </Fade>
      )}

      {/* ── Modals ── */}
      <AddVehicleModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        categories={categories}
        cities={cities}
        partnerId={partnerId}
        onSubmit={handleRegister}
      />

      {detailVehicle && (
        <UploadDocumentModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          vehicleReg={detailVehicle.registration_number}
          uploadedTypes={detailVehicle.documents.map((d) => d.document_type ?? "")}
          onUploadFile={handleUploadFile}
          onSubmit={handleUploadDoc}
        />
      )}

      {/* ── Detail drawer ── */}
      <VehicleDetailDrawer
        open={drawerOpen}
        vehicle={detailVehicle}
        categories={categories}
        cities={cities}
        onClose={() => { setDrawerOpen(false); setDetailVehicle(null); }}
        onUploadDoc={() => setUploadOpen(true)}
        onVehicleUpdated={(updated) => setDetailVehicle(updated)}
      />
    </Box>
  );
}
