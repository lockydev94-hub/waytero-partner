// ============================================================
// WAYTERO PARTNER PORTAL — HOTEL DETAIL PAGE
// Doc Ref: BRD Part 4 §59-§65, API Doc 09_HOTEL_API
// Route: /dashboard/hotels/:hotelId
// Tabs: Overview | Rooms | Documents | Images | Policies
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Chip, Button, Stack, Avatar, Skeleton, Alert,
  alpha, Tabs, Tab, IconButton, Tooltip,
} from "@mui/material";
import {
  ArrowBack, Hotel, CheckCircle, HourglassTop, FactCheck,
  EditNote, PauseCircle, Cancel, TaskAlt, Description, Block,
  StarRounded, Refresh, MeetingRoom, Image, Policy,
  Dashboard,
} from "@mui/icons-material";
import { COLORS } from "../../theme";
import { hotelService, type HotelDetail } from "../../services/hotel.service";
import HotelOverviewTab   from "./components/HotelOverviewTab";
import HotelRoomsTab      from "./components/HotelRoomsTab";
import HotelDocumentsTab  from "./components/HotelDocumentsTab";
import HotelImagesTab     from "./components/HotelImagesTab";
import HotelPoliciesTab   from "./components/HotelPoliciesTab";

// ── Status meta ───────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
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

const TABS = [
  { key: "overview",   label: "Overview",   icon: <Dashboard sx={{ fontSize: 16 }} /> },
  { key: "rooms",      label: "Rooms",      icon: <MeetingRoom sx={{ fontSize: 16 }} /> },
  { key: "images",     label: "Images",     icon: <Image sx={{ fontSize: 16 }} /> },
  { key: "documents",  label: "Documents",  icon: <Description sx={{ fontSize: 16 }} /> },
  { key: "policies",   label: "Policies",   icon: <Policy sx={{ fontSize: 16 }} /> },
];

// ── Loading skeleton ──────────────────────────────────────────
function HotelDetailSkeleton() {
  return (
    <Box>
      <Skeleton height={40} width={120} sx={{ mb: 2 }} />
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <Skeleton variant="rectangular" width={72} height={72} sx={{ borderRadius: 2 }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton width="50%" height={28} />
          <Skeleton width="35%" height={20} sx={{ mt: 0.5 }} />
          <Skeleton width="25%" height={24} sx={{ mt: 1 }} />
        </Box>
      </Box>
      <Skeleton height={48} sx={{ mb: 2 }} />
      <Skeleton height={300} sx={{ borderRadius: 3 }} />
    </Box>
  );
}

export default function HotelDetailPage() {
  const { hotelId } = useParams<{ hotelId: string }>();
  const navigate = useNavigate();
  const id = Number(hotelId);

  const [hotel, setHotel] = useState<HotelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setHotel(await hotelService.getHotel(id));
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load hotel details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <HotelDetailSkeleton />;

  if (error && !hotel) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate("/dashboard/hotels")} sx={{ mb: 2 }}>
          Back to Hotels
        </Button>
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      </Box>
    );
  }

  if (!hotel) return null;

  const statusMeta = STATUS_META[hotel.status] ?? STATUS_META.DRAFT;

  return (
    <Box>
      {/* ── Back ── */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate("/dashboard/hotels")}
        sx={{ mb: 1.5, color: COLORS.textSecondary, px: 0, "&:hover": { bgcolor: "transparent", color: COLORS.textPrimary } }}
      >
        Back to Hotels
      </Button>

      {/* ── Header card ── */}
      <Box sx={{
        p: { xs: 2, md: 2.5 }, mb: 2.5, borderRadius: 3,
        border: `1px solid ${COLORS.border}`,
        bgcolor: COLORS.bgCard,
        background: `linear-gradient(135deg, ${alpha(COLORS.navy, 0.03)} 0%, ${alpha(COLORS.gold, 0.02)} 100%)`,
      }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-start" }} justifyContent="space-between">
          {/* Left: avatar + info */}
          <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ flex: 1, minWidth: 0 }}>
            <Avatar
              sx={{
                width: 72, height: 72, borderRadius: 2.5, flexShrink: 0,
                background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyMid})`,
              }}
            >
              <Hotel sx={{ fontSize: 32, color: COLORS.gold }} />
            </Avatar>

            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 0.5 }}>
                <Typography sx={{ fontWeight: 900, fontSize: "1.25rem", color: COLORS.textPrimary }}>
                  {hotel.hotel_name}
                </Typography>
                {hotel.star_rating && (
                  <Stack direction="row" alignItems="center" spacing={0.25}>
                    {Array.from({ length: hotel.star_rating }).map((_, i) => (
                      <StarRounded key={i} sx={{ fontSize: 14, color: COLORS.gold }} />
                    ))}
                  </Stack>
                )}
              </Stack>

              <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary, mb: 1 }}>
                {hotel.hotel_code}
                {hotel.city_name && ` · ${hotel.city_name}`}
                {hotel.state_name && `, ${hotel.state_name}`}
                {hotel.category_label && ` · ${hotel.category_label}`}
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                <Chip
                  icon={statusMeta.icon as any}
                  label={statusMeta.label}
                  size="small"
                  sx={{
                    height: 24, fontSize: 11, fontWeight: 700,
                    bgcolor: alpha(statusMeta.color, 0.1), color: statusMeta.color,
                    border: `1px solid ${alpha(statusMeta.color, 0.3)}`,
                    "& .MuiChip-icon": { color: statusMeta.color },
                  }}
                />
                {hotel.is_own_risk_approved && (
                  <Chip label="Own-risk" size="small" color="warning" sx={{ height: 24, fontSize: 11 }} />
                )}
                {hotel.is_featured && (
                  <Chip label="Featured" size="small" sx={{ height: 24, fontSize: 11, bgcolor: alpha(COLORS.gold, 0.1), color: COLORS.goldDark, fontWeight: 700 }} />
                )}
              </Stack>

              {/* Rejection banner */}
              {hotel.status === "REJECTED" && hotel.rejection_reason && (
                <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2, py: 0.5, fontSize: "0.78rem" }}>
                  Rejected: {hotel.rejection_reason}
                </Alert>
              )}
              {hotel.status === "DOCUMENT_PENDING" && (
                <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2, py: 0.5, fontSize: "0.78rem" }}>
                  Additional documents requested — see the Documents tab.
                </Alert>
              )}
            </Box>
          </Stack>

          {/* Right: quick stats + refresh */}
          <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ flexShrink: 0 }}>
            {/* Room summary */}
            <Stack spacing={0.25} sx={{ textAlign: "center" }}>
              <Typography sx={{ fontWeight: 900, fontSize: "1.4rem", color: COLORS.textPrimary, lineHeight: 1 }}>
                {hotel.total_rooms}
              </Typography>
              <Typography sx={{ fontSize: "0.65rem", color: COLORS.textSecondary }}>Rooms</Typography>
            </Stack>
            <Box sx={{ width: 1, alignSelf: "stretch", bgcolor: COLORS.border }} />
            <Stack spacing={0.25} sx={{ textAlign: "center" }}>
              <Typography sx={{ fontWeight: 900, fontSize: "1.4rem", color: COLORS.textPrimary, lineHeight: 1 }}>
                {hotel.room_category_count}
              </Typography>
              <Typography sx={{ fontSize: "0.65rem", color: COLORS.textSecondary }}>Categories</Typography>
            </Stack>
            <Box sx={{ width: 1, alignSelf: "stretch", bgcolor: COLORS.border }} />
            <Stack spacing={0.25} sx={{ textAlign: "center" }}>
              <Typography sx={{ fontWeight: 900, fontSize: "1.4rem", color: hotel.readiness.completeness_percent >= 80 ? COLORS.success : COLORS.warning, lineHeight: 1 }}>
                {hotel.readiness.completeness_percent}%
              </Typography>
              <Typography sx={{ fontSize: "0.65rem", color: COLORS.textSecondary }}>Readiness</Typography>
            </Stack>

            <Tooltip title="Refresh">
              <IconButton onClick={load} size="small" sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 1.5, ml: 1 }}>
                <Refresh sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* ── Tabs ── */}
      <Box sx={{
        mb: 2.5, borderRadius: 2.5,
        border: `1px solid ${COLORS.border}`,
        bgcolor: COLORS.bgCard, overflow: "hidden",
      }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1,
            "& .MuiTab-root": {
              fontSize: "0.82rem", fontWeight: 600, textTransform: "none",
              minHeight: 48, color: COLORS.textSecondary,
              "&.Mui-selected": { color: COLORS.textPrimary, fontWeight: 700 },
            },
            "& .MuiTabs-indicator": { bgcolor: COLORS.gold, height: 3, borderRadius: "3px 3px 0 0" },
          }}
        >
          {TABS.map((tab, i) => (
            <Tab key={tab.key} label={tab.label} icon={tab.icon} iconPosition="start" value={i}
              sx={{ gap: 0.5, "& .MuiTab-iconWrapper": { mb: "0 !important" } }}
            />
          ))}
        </Tabs>
      </Box>

      {/* ── Tab content ── */}
      <Box>
        {activeTab === 0 && <HotelOverviewTab hotel={hotel} />}
        {activeTab === 1 && <HotelRoomsTab hotelId={id} />}
        {activeTab === 2 && <HotelImagesTab hotelId={id} />}
        {activeTab === 3 && <HotelDocumentsTab hotelId={id} />}
        {activeTab === 4 && <HotelPoliciesTab hotelId={id} />}
      </Box>
    </Box>
  );
}
