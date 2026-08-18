// ============================================================
// WAYTERO PARTNER PORTAL — HOTELS PAGE
// Doc Ref: BRD_PART_4 §59-§65 — partner views their own hotels,
// sees status, readiness, uploads docs/images.
// Uses /admin/hotels filtered by partner_id (server enforces ownership).
// Full CRUD is admin-only; partner can upload documents and images only.
// ============================================================
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Stack, Paper, Chip, Button, Alert,
  TextField, InputAdornment, CircularProgress, Avatar,
  Divider, alpha, Tooltip, LinearProgress,
  Skeleton, Select, MenuItem, FormControl, InputLabel,
} from "@mui/material";
import {
  Hotel, Search, Refresh, UploadFile,
  CheckCircle, HourglassTop, FactCheck, Block,
  EditNote, PauseCircle, Cancel, TaskAlt, Description,
  StarRounded, OpenInNew,
} from "@mui/icons-material";
import { COLORS } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import apiClient from "../../services/api";

// ── Types ────────────────────────────────────────────────────
interface HotelListItem {
  id: number;
  hotel_code: string;
  hotel_name: string;
  hotel_type: string;
  status: string;
  city_name: string | null;
  state_name: string | null;
  star_rating: number | null;
  primary_image_url: string | null;
  total_rooms: number;
  room_category_count: number;       // backend field name
  completeness_percent: number;      // backend field name
  readiness_passed: number;
  readiness_total: number;
  is_own_risk_approved: boolean;     // backend field name
  category_label: string | null;
}

interface HotelPage {
  items: HotelListItem[];
  total: number;
  page: number;
  page_size: number;
}

// ── Status meta ──────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  DRAFT:            { label: "Draft",            color: COLORS.textSecondary, icon: <EditNote sx={{ fontSize: 14 }} /> },
  PENDING:          { label: "Pending",          color: COLORS.warning,       icon: <HourglassTop sx={{ fontSize: 14 }} /> },
  UNDER_REVIEW:     { label: "Under Review",     color: COLORS.info,          icon: <FactCheck sx={{ fontSize: 14 }} /> },
  DOCUMENT_PENDING: { label: "Document Pending", color: COLORS.warning,       icon: <Description sx={{ fontSize: 14 }} /> },
  APPROVED:         { label: "Approved",         color: "#6366F1",            icon: <TaskAlt sx={{ fontSize: 14 }} /> },
  ACTIVE:           { label: "Active",           color: COLORS.success,       icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  INACTIVE:         { label: "Inactive",         color: COLORS.textSecondary, icon: <PauseCircle sx={{ fontSize: 14 }} /> },
  SUSPENDED:        { label: "Suspended",        color: COLORS.warning,       icon: <PauseCircle sx={{ fontSize: 14 }} /> },
  BLOCKED:          { label: "Blocked",          color: COLORS.error,         icon: <Block sx={{ fontSize: 14 }} /> },
  REJECTED:         { label: "Rejected",         color: COLORS.error,         icon: <Cancel sx={{ fontSize: 14 }} /> },
};

const STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "DOCUMENT_PENDING", label: "Doc Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
];

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: JSX.Element }) {
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

// ── Readiness bar ─────────────────────────────────────────────
function ReadinessBar({ score }: { score: number }) {
  const color = score >= 80 ? COLORS.success : score >= 50 ? COLORS.warning : COLORS.error;
  return (
    <Tooltip title={`Readiness: ${score}%`}>
      <Box sx={{ width: 80 }}>
        <LinearProgress
          variant="determinate"
          value={Math.min(score, 100)}
          sx={{
            height: 6, borderRadius: 3,
            bgcolor: alpha(color, 0.15),
            "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 },
          }}
        />
        <Typography sx={{ fontSize: 10, color, fontWeight: 700, mt: 0.25 }}>{score}%</Typography>
      </Box>
    </Tooltip>
  );
}

// ── Hotel card ────────────────────────────────────────────────
function HotelCard({ hotel }: { hotel: HotelListItem }) {
  const meta = STATUS_META[hotel.status] ?? STATUS_META.DRAFT;
  const navigate = useNavigate();

  return (
    <Paper elevation={0} sx={{
      p: 2.5, borderRadius: 3, border: `1px solid ${COLORS.border}`,
      bgcolor: COLORS.bgCard, transition: "all 0.15s",
      "&:hover": { borderColor: alpha(COLORS.navy, 0.2), boxShadow: "0 4px 20px rgba(0,0,0,0.07)" },
    }}>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        {/* Image / avatar */}
        <Avatar
          src={hotel.primary_image_url ?? undefined}
          sx={{
            width: 56, height: 56, borderRadius: 2, flexShrink: 0,
            bgcolor: alpha(COLORS.navy, 0.08),
          }}
        >
          <Hotel sx={{ fontSize: 24, color: COLORS.navy }} />
        </Avatar>

        {/* Main info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Typography sx={{ fontWeight: 800, fontSize: "0.95rem", color: COLORS.textPrimary }} noWrap>
              {hotel.hotel_name}
            </Typography>
            {hotel.star_rating && (
              <Stack direction="row" alignItems="center" spacing={0.25}>
                {Array.from({ length: hotel.star_rating }).map((_, i) => (
                  <StarRounded key={i} sx={{ fontSize: 12, color: COLORS.gold }} />
                ))}
              </Stack>
            )}
          </Stack>

          <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary, mb: 1 }}>
            {hotel.hotel_code} · {hotel.city_name ?? "—"}, {hotel.state_name ?? "—"}
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            {/* Status */}
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
            {hotel.category_label && (
              <Chip label={hotel.category_label} size="small" variant="outlined"
                sx={{ height: 22, fontSize: 11 }} />
            )}
            {hotel.is_own_risk_approved && (
              <Chip label="Own-risk" size="small" color="warning"
                sx={{ height: 22, fontSize: 11 }} />
            )}
          </Stack>
        </Box>

        {/* Right side: rooms + readiness + action */}
        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
          <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: COLORS.textPrimary }}>
            {hotel.total_rooms} rooms
          </Typography>
          <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary, mb: 0.75 }}>
            {hotel.room_category_count} categories
          </Typography>
          <ReadinessBar score={hotel.completeness_percent} />
          <Button
            size="small"
            variant="outlined"
            startIcon={<OpenInNew sx={{ fontSize: 13 }} />}
            onClick={() => navigate(`/dashboard/hotels/${hotel.id}`)}
            sx={{
              mt: 1, fontSize: "0.72rem", fontWeight: 700,
              borderColor: alpha(COLORS.navy, 0.25), color: COLORS.navy,
              height: 26, px: 1.25,
              "&:hover": { borderColor: COLORS.navy, bgcolor: alpha(COLORS.navy, 0.04) },
            }}
          >
            View Details
          </Button>
        </Box>
      </Stack>

      {/* Action hint based on status */}
      {(hotel.status === "DRAFT" || hotel.status === "DOCUMENT_PENDING" || hotel.status === "REJECTED") && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Alert
            severity={hotel.status === "REJECTED" ? "error" : "warning"}
            icon={hotel.status === "REJECTED" ? <Cancel sx={{ fontSize: 16 }} /> : <UploadFile sx={{ fontSize: 16 }} />}
            sx={{ py: 0.5, fontSize: 12 }}
          >
            {hotel.status === "DRAFT" && "Documents and images are required before this hotel can be submitted for verification."}
            {hotel.status === "DOCUMENT_PENDING" && "Additional documents have been requested. Please upload the missing items."}
            {hotel.status === "REJECTED" && "This hotel was rejected. Please contact support or re-submit with the required corrections."}
          </Alert>
        </>
      )}
    </Paper>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function HotelsPage() {
  const { user } = useAuthStore();
  const partnerId = user?.partner_id;

  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Stats derived from current page (approximate)
  const stats = useMemo(() => ({
    total: hotels.length,
    active: hotels.filter(h => h.status === "ACTIVE").length,
    pending: hotels.filter(h => ["PENDING", "UNDER_REVIEW"].includes(h.status)).length,
    action: hotels.filter(h => ["DRAFT", "DOCUMENT_PENDING", "REJECTED"].includes(h.status)).length,
  }), [hotels]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchHotels = async () => {
    if (!partnerId) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        partner_id: partnerId,
        page: 1,
        page_size: 50,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== "ALL") params.status = statusFilter;

      const res = await apiClient.get<HotelPage>("/admin/hotels", { params });
      setHotels(res.data.items);
      setTotal(res.data.total);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load hotels");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchHotels(); }, [partnerId, debouncedSearch, statusFilter]);

  if (!partnerId) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">Partner account not linked. Please contact support.</Alert>
      </Box>
    );
  }

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
            <Hotel sx={{ fontSize: 22, color: COLORS.gold }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: "1.25rem", color: COLORS.textPrimary }}>
              My Hotels
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>
              View and manage your hotel properties
            </Typography>
          </Box>
        </Stack>

        <Tooltip title="Refresh">
          <Button
            variant="outlined"
            size="small"
            onClick={fetchHotels}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={14} /> : <Refresh />}
            sx={{ borderColor: COLORS.border, color: COLORS.textSecondary }}
          >
            Refresh
          </Button>
        </Tooltip>
      </Stack>

      {/* Stat cards */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 3 }}>
        <StatCard label="Total Hotels" value={total || stats.total} color={COLORS.navy} icon={<Hotel />} />
        <StatCard label="Active" value={stats.active} color={COLORS.success} icon={<CheckCircle />} />
        <StatCard label="In Review" value={stats.pending} color={COLORS.info} icon={<FactCheck />} />
        <StatCard label="Action Needed" value={stats.action} color={COLORS.warning} icon={<HourglassTop />} />
      </Stack>

      {/* Info: onboarding is admin-driven */}
      <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
        To add a new hotel or update room inventory, contact your account manager or the WayTero admin team. You can upload supporting documents directly here.
      </Alert>

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2.5, border: `1px solid ${COLORS.border}`, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
          <TextField
            size="small"
            placeholder="Search hotels…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: COLORS.textSecondary }} /></InputAdornment>,
            }}
            sx={{ flex: 1, bgcolor: COLORS.bgMain, borderRadius: 1.5, "& fieldset": { borderColor: COLORS.border } }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
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
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Hotel list */}
      {loading ? (
        <Stack spacing={1.5}>
          {[1, 2, 3].map(i => (
            <Paper key={i} elevation={0} sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${COLORS.border}` }}>
              <Stack direction="row" spacing={2}>
                <Skeleton variant="rectangular" width={56} height={56} sx={{ borderRadius: 2 }} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="60%" height={20} />
                  <Skeleton width="40%" height={16} sx={{ mt: 0.5 }} />
                  <Skeleton width="30%" height={24} sx={{ mt: 1 }} />
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : hotels.length === 0 ? (
        <Paper elevation={0} sx={{
          p: 6, borderRadius: 3, border: `1px solid ${COLORS.border}`, textAlign: "center",
        }}>
          <Box sx={{
            width: 72, height: 72, borderRadius: 4, mx: "auto", mb: 2,
            bgcolor: alpha(COLORS.navy, 0.06),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Hotel sx={{ fontSize: 32, color: alpha(COLORS.navy, 0.3) }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: COLORS.textPrimary, mb: 0.5 }}>
            {statusFilter !== "ALL" || search ? "No hotels found" : "No hotels yet"}
          </Typography>
          <Typography sx={{ fontSize: "0.85rem", color: COLORS.textSecondary, maxWidth: 340, mx: "auto" }}>
            {statusFilter !== "ALL" || search
              ? "Try adjusting your filters."
              : "Contact the WayTero admin team to onboard your first hotel property."}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {hotels.map(h => <HotelCard key={h.id} hotel={h} />)}
          {total > hotels.length && (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", py: 1 }}>
              Showing {hotels.length} of {total} hotels
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );
}
