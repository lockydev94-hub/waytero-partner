// ============================================================
// WAYTERO PARTNER PORTAL — TOUR DETAIL PAGE
// Doc Ref: BRD_PART_5_TOUR_PACKAGE_MANAGEMENT §3
// Route: /dashboard/tours/:id
// Read-only detail view of the partner's own tour package,
// with quick links to bookings and edit.
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Chip, Button, Stack, Avatar, Skeleton, Alert,
  alpha, Card, CardContent, Divider, IconButton, Tabs, Tab, Grid, Paper,
  TextField,
} from "@mui/material";
import {
  ArrowBack, TravelExplore, CheckCircle, HourglassTop, Cancel, EditNote,
  PauseCircle, Send, Edit, BookOnline, Refresh, Description, Image as ImageIcon,
  LocationOn, AccessTime, People, AttachMoney, Star, StarBorder,
  Visibility, WarningAmber, Schedule, FlightTakeoff, Groups, Bookmark,
  Verified, LocalActivity, CalendarMonth, Policy, Save,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { COLORS } from "../../../theme";
import { tourService, PartnerTourPackage, PartnerTourPolicy } from "../../../services/tour.service";

// ── Status meta ──────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  DRAFT:            { label: "Draft",            color: COLORS.textSecondary, bg: alpha(COLORS.textSecondary, 0.1), icon: <EditNote sx={{ fontSize: 16 }} /> },
  PENDING_APPROVAL: { label: "Pending Review",   color: COLORS.warning,       bg: alpha(COLORS.warning, 0.12),      icon: <HourglassTop sx={{ fontSize: 16 }} /> },
  APPROVED:         { label: "Approved",         color: "#6366F1",            bg: alpha("#6366F1", 0.12),            icon: <CheckCircle sx={{ fontSize: 16 }} /> },
  ACTIVE:           { label: "Live",             color: COLORS.success,       bg: alpha(COLORS.success, 0.12),      icon: <CheckCircle sx={{ fontSize: 16 }} /> },
  INACTIVE:         { label: "Inactive",         color: COLORS.textSecondary, bg: alpha(COLORS.textSecondary, 0.1), icon: <PauseCircle sx={{ fontSize: 16 }} /> },
  SUSPENDED:        { label: "Suspended",        color: COLORS.warning,       bg: alpha(COLORS.warning, 0.12),      icon: <PauseCircle sx={{ fontSize: 16 }} /> },
  REJECTED:         { label: "Rejected",         color: COLORS.error,         bg: alpha(COLORS.error, 0.12),        icon: <Cancel sx={{ fontSize: 16 }} /> },
};

const POLICY_FIELDS: Array<{ key: keyof PartnerTourPolicy; label: string; hint: string; unit: string }> = [
  { key: "cancellation_free_days", label: "Free-cancel window", hint: "Days before travel → 100% refund", unit: "days" },
  { key: "cancellation_tier_1_days", label: "Tier-1 cutoff", hint: "Days before travel → Tier 1 refund", unit: "days" },
  { key: "refund_percent_tier_1", label: "Tier-1 refund percent", hint: "Refund % at Tier 1", unit: "%" },
  { key: "cancellation_tier_2_days", label: "Tier-2 cutoff", hint: "Days before travel → Tier 2 refund", unit: "days" },
  { key: "refund_percent_tier_2", label: "Tier-2 refund percent", hint: "Refund % at Tier 2", unit: "%" },
  { key: "refund_percent_tier_3", label: "Tier-3 refund percent", hint: "Refund % inside tier-2 window", unit: "%" },
  { key: "refund_percent_last_minute", label: "Last-minute refund percent", hint: "Refund % in the final window", unit: "%" },
];

const PACKAGE_TYPE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  FIXED:      { label: "Fixed Departure", icon: <Schedule /> },
  PRIVATE:    { label: "Private Tour",    icon: <Verified /> },
  GROUP:      { label: "Group Tour",      icon: <Groups /> },
  PILGRIMAGE: { label: "Pilgrimage",      icon: <Bookmark /> },
  CORPORATE:  { label: "Corporate / MICE",icon: <LocalActivity /> },
};

// ── Loading skeleton ─────────────────────────────────────────
function TourDetailSkeleton() {
  return (
    <Box>
      <Skeleton height={40} width={140} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 3, mb: 2 }} />
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" width={200} height={120} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" width={200} height={120} sx={{ borderRadius: 2 }} />
      </Stack>
    </Box>
  );
}

// ── Section card ─────────────────────────────────────────────
function SectionCard({ title, icon, children, action }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card sx={{ borderRadius: 3, border: `1px solid ${COLORS.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${COLORS.border}` }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ color: COLORS.navy, display: "flex" }}>{icon}</Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: COLORS.textPrimary }}>{title}</Typography>
          </Stack>
          {action}
        </Stack>
        <Box sx={{ p: 2.5 }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

export default function TourDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pkgId = Number(id);

  const [pkg, setPkg] = useState<PartnerTourPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [policy, setPolicy] = useState<PartnerTourPolicy | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const load = useCallback(async () => {
    if (!pkgId) return;
    setLoading(true);
    setError(null);
    try {
      setPkg(await tourService.get(pkgId));
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.response?.data?.message ?? "Failed to load tour package");
    } finally {
      setLoading(false);
    }
  }, [pkgId]);

  useEffect(() => { load(); }, [load]);

  // Load the per-package cancellation policy (defaults when none set yet).
  useEffect(() => {
    if (!pkgId) return;
    setPolicyLoading(true);
    tourService.getCancellationPolicy(pkgId)
      .then(setPolicy)
      .catch(() => setPolicy(null))
      .finally(() => setPolicyLoading(false));
  }, [pkgId]);

  const handleSavePolicy = async () => {
    if (!pkg || !policy) return;
    setPolicySaving(true);
    try {
      await tourService.updateCancellationPolicy(pkg.id, {
        cancellation_free_days: Number(policy.cancellation_free_days),
        cancellation_tier_1_days: Number(policy.cancellation_tier_1_days),
        refund_percent_tier_1: Number(policy.refund_percent_tier_1),
        cancellation_tier_2_days: Number(policy.cancellation_tier_2_days),
        refund_percent_tier_2: Number(policy.refund_percent_tier_2),
        refund_percent_tier_3: Number(policy.refund_percent_tier_3),
        refund_percent_last_minute: Number(policy.refund_percent_last_minute),
        cancellation_policy_text: policy.cancellation_policy_text,
      });
      enqueueSnackbar("Cancellation policy saved.", { variant: "success" });
      setPolicy({ ...policy, has_policy: true });
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.detail ?? "Failed to save policy", { variant: "error" });
    } finally {
      setPolicySaving(false);
    }
  };

  const setPolicyField = (key: keyof PartnerTourPolicy, value: number | string | null) =>
    setPolicy((p) => (p ? { ...p, [key]: value } : p));

  const handleSubmit = async () => {
    if (!pkg) return;
    if (!window.confirm(`Submit "${pkg.package_name}" for admin review?`)) return;
    setSubmitting(true);
    try {
      const updated = await tourService.submit(pkg.id);
      setPkg(updated);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.response?.data?.message ?? "Failed to submit package");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <TourDetailSkeleton />
    </Box>
  );

  if (error && !pkg) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate("/dashboard/tours")} sx={{ mb: 2 }}>
          Back to Tours
        </Button>
        <Alert severity="error" action={<Button onClick={load}>Retry</Button>}>{error}</Alert>
      </Box>
    );
  }

  if (!pkg) return null;

  const meta = STATUS_META[pkg.status] ?? STATUS_META.DRAFT;
  const typeMeta = PACKAGE_TYPE_META[pkg.package_type || "FIXED"];
  const hero = pkg.media.find(m => m.is_primary)?.media_url || pkg.media[0]?.media_url;
  const startingPrice = pkg.pricing.length > 0
    ? Math.min(...pkg.pricing.map(p => p.package_price))
    : 0;
  const canEdit = !["ACTIVE", "SUSPENDED"].includes(pkg.status);
  const canSubmit = ["DRAFT", "REJECTED"].includes(pkg.status);
  const hasMissingFields = pkg.itinerary.length === 0 || pkg.pricing.length === 0 || pkg.media.length === 0;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Back button */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate("/dashboard/tours")}>
          Back to Tours
        </Button>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<Refresh />} onClick={load} size="small">Refresh</Button>
          {canEdit && (
            <Button
              startIcon={<Edit />}
              variant="outlined"
              onClick={() => navigate(`/dashboard/tours?edit=${pkg.id}`)}
            >
              Edit
            </Button>
          )}
          {canSubmit && (
            <Button
              startIcon={<Send />}
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting || hasMissingFields}
            >
              {submitting ? "Submitting…" : "Submit for Review"}
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Rejection banner */}
      {pkg.status === "REJECTED" && pkg.rejection_reason && (
        <Alert
          severity="error"
          icon={<WarningAmber />}
          sx={{ mb: 2 }}
          action={
            canEdit ? (
              <Button color="inherit" size="small" startIcon={<Edit />} onClick={() => navigate(`/dashboard/tours?edit=${pkg.id}`)}>
                Fix & re-submit
              </Button>
            ) : undefined
          }
        >
          <Typography variant="body2" fontWeight={700}>Admin rejected this package</Typography>
          <Typography variant="body2">{pkg.rejection_reason}</Typography>
        </Alert>
      )}

      {/* Hero image / banner */}
      <Card sx={{ borderRadius: 3, overflow: "hidden", mb: 3, border: `1px solid ${COLORS.border}` }}>
        <Box sx={{
          height: 320,
          backgroundImage: hero ? `url(${hero})` : undefined,
          backgroundSize: "cover", backgroundPosition: "center",
          background: hero ? undefined : `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyMid})`,
          display: "flex", alignItems: "flex-end", p: 3,
          position: "relative",
        }}>
          {!hero && (
            <TravelExplore sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 80, color: alpha(COLORS.gold, 0.3) }} />
          )}
          <Box sx={{
            position: "absolute", top: 16, right: 16,
            display: "flex", gap: 1,
          }}>
            <Chip
              icon={meta.icon as any}
              label={meta.label}
              sx={{
                bgcolor: meta.bg, color: meta.color,
                fontWeight: 800, fontSize: 12,
                "& .MuiChip-icon": { color: meta.color },
              }}
            />
            {pkg.package_type && (
              <Chip
                icon={typeMeta.icon as any}
                label={typeMeta.label}
                sx={{
                  bgcolor: "rgba(255,255,255,0.95)",
                  color: COLORS.navy,
                  fontWeight: 800, fontSize: 12,
                }}
              />
            )}
          </Box>

          <Box sx={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
            p: 3, color: "#fff",
          }}>
            <Typography variant="caption" sx={{ opacity: 0.8, fontFamily: "monospace", fontSize: 11 }}>
              {pkg.package_code}
            </Typography>
            <Typography variant="h4" fontWeight={900} sx={{ color: "#fff" }}>
              {pkg.package_name}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <LocationOn sx={{ fontSize: 16 }} />
                <Typography variant="body2">{pkg.destination}{pkg.city_name ? `, ${pkg.city_name}` : ""}</Typography>
              </Stack>
              <Typography variant="body2" sx={{ opacity: 0.6 }}>·</Typography>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <AccessTime sx={{ fontSize: 16 }} />
                <Typography variant="body2">{pkg.duration_days}D / {pkg.duration_nights}N</Typography>
              </Stack>
              <Typography variant="body2" sx={{ opacity: 0.6 }}>·</Typography>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <People sx={{ fontSize: 16 }} />
                <Typography variant="body2">{pkg.minimum_persons}–{pkg.maximum_persons || "∞"} pax</Typography>
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Card>

      <Grid container spacing={3}>
        {/* Left main content */}
        <Grid item xs={12} md={8}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              mb: 2,
              "& .MuiTab-root": { fontWeight: 700, textTransform: "none", minHeight: 44 },
              "& .Mui-selected": { color: `${COLORS.navy} !important` },
              "& .MuiTabs-indicator": { backgroundColor: COLORS.gold, height: 3, borderRadius: 2 },
            }}
          >
            <Tab label="Overview" />
            <Tab label={`Itinerary (${pkg.itinerary.length})`} />
            <Tab label={`Media (${pkg.media.length})`} />
            <Tab label="Terms" />
            <Tab label="Cancellation policy" />
          </Tabs>

          {activeTab === 0 && (
            <Stack spacing={3}>
              <SectionCard title="Description" icon={<Description />}>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {pkg.description || pkg.short_description || "No description provided."}
                </Typography>
                {pkg.short_description && pkg.description && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>SHORT DESCRIPTION</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{pkg.short_description}</Typography>
                  </>
                )}
              </SectionCard>

              <SectionCard
                title="What's included"
                icon={<CheckCircle color="success" />}
                action={<Chip label={`${pkg.inclusions.length} items`} size="small" />}
              >
                {pkg.inclusions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No inclusions listed.</Typography>
                ) : (
                  <Stack spacing={0.75}>
                    {pkg.inclusions.map((x, i) => (
                      <Stack key={i} direction="row" spacing={1} alignItems="center">
                        <CheckCircle sx={{ fontSize: 16, color: COLORS.success }} />
                        <Typography variant="body2">{x.text}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </SectionCard>

              <SectionCard
                title="What's not included"
                icon={<Cancel color="error" />}
                action={<Chip label={`${pkg.exclusions.length} items`} size="small" />}
              >
                {pkg.exclusions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No exclusions listed.</Typography>
                ) : (
                  <Stack spacing={0.75}>
                    {pkg.exclusions.map((x, i) => (
                      <Stack key={i} direction="row" spacing={1} alignItems="center">
                        <Cancel sx={{ fontSize: 16, color: COLORS.error }} />
                        <Typography variant="body2">{x.text}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </SectionCard>
            </Stack>
          )}

          {activeTab === 1 && (
            <SectionCard title="Day-by-day itinerary" icon={<CalendarMonth />}>
              {pkg.itinerary.length === 0 ? (
                <Alert severity="info">No itinerary days yet. Add them in the editor.</Alert>
              ) : (
                <Stack spacing={2}>
                  {pkg.itinerary.map((day, i) => (
                    <Box key={day.id ?? i} sx={{ p: 2, borderRadius: 2, bgcolor: COLORS.bgMain, border: `1px solid ${COLORS.border}` }}>
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                        <Box sx={{
                          minWidth: 36, height: 36, borderRadius: 1.5,
                          bgcolor: COLORS.navy, color: "#fff",
                          display: "grid", placeItems: "center",
                          fontWeight: 800, fontSize: 14,
                        }}>D{day.day_number}</Box>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={800}>{day.title || `Day ${day.day_number}`}</Typography>
                        </Box>
                      </Stack>
                      {day.description && (
                        <Typography variant="body2" sx={{ mb: 1 }}>{day.description}</Typography>
                      )}
                      {day.activities && day.activities.length > 0 && (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                          {day.activities.map((a, j) => (
                            <Chip key={j} label={a} size="small" icon={<StarBorder sx={{ fontSize: 12 }} />} />
                          ))}
                        </Stack>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </SectionCard>
          )}

          {activeTab === 2 && (
            <SectionCard title="Media gallery" icon={<ImageIcon />}>
              {pkg.media.length === 0 ? (
                <Alert severity="info">No images yet.</Alert>
              ) : (
                <Grid container spacing={2}>
                  {pkg.media.map((m, i) => (
                    <Grid item xs={12} sm={6} key={m.id ?? i}>
                      <Box sx={{
                        aspectRatio: "4/3", borderRadius: 2, overflow: "hidden",
                        position: "relative",
                        border: m.is_primary ? `3px solid ${COLORS.gold}` : `1px solid ${COLORS.border}`,
                      }}>
                        <img
                          src={m.media_url}
                          alt={m.caption || `image-${i}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }}
                        />
                        {m.is_primary && (
                          <Chip
                            icon={<Star sx={{ fontSize: 12 }} />}
                            label="Primary"
                            size="small"
                            sx={{
                              position: "absolute", top: 6, right: 6,
                              bgcolor: COLORS.gold, color: "#000",
                              fontWeight: 800, fontSize: 10,
                            }}
                          />
                        )}
                      </Box>
                      {m.caption && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                          {m.caption}
                        </Typography>
                      )}
                    </Grid>
                  ))}
                </Grid>
              )}
            </SectionCard>
          )}

          {activeTab === 3 && (
            <SectionCard title="Terms & conditions" icon={<Description />}>
              {pkg.terms_and_conditions ? (
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {pkg.terms_and_conditions}
                </Typography>
              ) : (
                <Alert severity="info">No T&C set for this package.</Alert>
              )}
            </SectionCard>
          )}

          {activeTab === 4 && (
            <SectionCard
              title="Cancellation policy"
              icon={<Policy />}
              action={
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Save />}
                  disabled={policyLoading || policySaving || !policy}
                  onClick={handleSavePolicy}
                >
                  {policySaving ? "Saving…" : "Save policy"}
                </Button>
              }
            >
              {policyLoading ? (
                <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
              ) : !policy ? (
                <Alert severity="info">Could not load the cancellation policy.</Alert>
              ) : (
                <Stack spacing={2}>
                  <Alert severity="info" sx={{ mb: 1 }}>
                    This ladder applies to every booking of this package (BRD Part 5 §119).
                    {!policy.has_policy && " No policy is set yet — the global tour ladder applies until you save your own."}
                  </Alert>
                  <Grid container spacing={2}>
                    {POLICY_FIELDS.map((f) => (
                      <Grid item xs={12} sm={6} key={f.key}>
                        <TextField
                          label={`${f.label} (${f.unit})`}
                          size="small"
                          fullWidth
                          type="number"
                          value={policy[f.key] ?? 0}
                          onChange={(e) => setPolicyField(f.key, Number(e.target.value))}
                          inputProps={{
                            min: 0,
                            max: f.unit === "%" ? 100 : undefined,
                            step: f.unit === "%" ? "0.01" : "1",
                          }}
                          helperText={f.hint}
                        />
                      </Grid>
                    ))}
                    <Grid item xs={12}>
                      <TextField
                        label="Cancellation policy text (shown to customers)"
                        size="small"
                        fullWidth
                        multiline rows={3}
                        value={policy.cancellation_policy_text ?? ""}
                        onChange={(e) => setPolicyField("cancellation_policy_text", e.target.value)}
                        placeholder="e.g. Free cancellation up to 30 days before travel; 75% refund up to 15 days; 50% up to 7 days."
                      />
                    </Grid>
                  </Grid>
                </Stack>
              )}
            </SectionCard>
          )}
        </Grid>

        {/* Right sidebar */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Quick info */}
            <SectionCard title="Package info" icon={<TravelExplore />}>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Code</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontFamily: "monospace" }}>{pkg.package_code}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Type</Typography>
                  <Typography variant="body2" fontWeight={700}>{typeMeta.label}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Destination</Typography>
                  <Typography variant="body2" fontWeight={700}>{pkg.destination}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Duration</Typography>
                  <Typography variant="body2" fontWeight={700}>{pkg.duration_days}D / {pkg.duration_nights}N</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Pax range</Typography>
                  <Typography variant="body2" fontWeight={700}>{pkg.minimum_persons}–{pkg.maximum_persons || "∞"}</Typography>
                </Stack>
              </Stack>
            </SectionCard>

            {/* Pricing */}
            <SectionCard
              title="Pricing slabs"
              icon={<AttachMoney />}
              action={startingPrice > 0 && <Chip label={`From ₹${startingPrice.toLocaleString("en-IN")}`} size="small" color="primary" />}
            >
              {pkg.pricing.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No pricing set.</Typography>
              ) : (
                <Stack spacing={1}>
                  {pkg.pricing.sort((a, b) => a.persons_count - b.persons_count).map((p, i) => (
                    <Stack key={p.id ?? i} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.5, bgcolor: COLORS.bgMain, borderRadius: 1.5 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <People sx={{ fontSize: 14, color: COLORS.textSecondary }} />
                        <Typography variant="body2" fontWeight={700}>{p.persons_count} pax</Typography>
                      </Stack>
                      <Typography variant="body1" fontWeight={900} color={COLORS.navy}>
                        ₹{p.package_price.toLocaleString("en-IN")}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </SectionCard>

            {/* Audit trail */}
            <SectionCard title="Audit trail" icon={<Visibility />}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Created</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {pkg.created_at ? new Date(pkg.created_at).toLocaleString() : "—"}
                  </Typography>
                </Stack>
                {pkg.submitted_at && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Submitted</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {new Date(pkg.submitted_at).toLocaleString()}
                    </Typography>
                  </Stack>
                )}
                {pkg.approved_at && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Approved</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {new Date(pkg.approved_at).toLocaleString()}
                    </Typography>
                  </Stack>
                )}
                {pkg.activated_at && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Activated</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {new Date(pkg.activated_at).toLocaleString()}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </SectionCard>

            {/* Bookings shortcut */}
            <Button
              fullWidth
              variant="contained"
              startIcon={<BookOnline />}
              onClick={() => navigate(`/dashboard/tours/${pkg.id}/bookings`)}
              sx={{ py: 1.5, fontWeight: 800 }}
            >
              View Bookings
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
