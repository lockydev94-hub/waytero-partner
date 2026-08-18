// ============================================================
// HOTEL OVERVIEW TAB — readiness checklist + key hotel info
// ============================================================
import {
  Box, Grid, Typography, Chip, LinearProgress, Stack,
  Divider, alpha, Paper,
} from "@mui/material";
import {
  CheckCircle, Cancel, Hotel, LocationOn, Phone, Email,
  Business, Star, TaskAlt,
} from "@mui/icons-material";
import { COLORS } from "../../../theme";
import type { HotelDetail } from "../../../services/hotel.service";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.875, alignItems: "flex-start", gap: 2 }}>
      <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary, flexShrink: 0 }}>{label}</Typography>
      <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: COLORS.textPrimary, textAlign: "right" }}>
        {value ?? "—"}
      </Typography>
    </Box>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Paper elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden" }}>
      <Box sx={{ px: 2.5, py: 1.75, display: "flex", alignItems: "center", gap: 1, borderBottom: `1px solid ${COLORS.border}`, bgcolor: alpha(COLORS.bgMain, 0.5) }}>
        <Box sx={{ color: COLORS.gold, display: "flex" }}>{icon}</Box>
        <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: COLORS.textPrimary }}>{title}</Typography>
      </Box>
      <Box sx={{ px: 2.5, py: 0.5 }}>{children}</Box>
    </Paper>
  );
}

export default function HotelOverviewTab({ hotel }: { hotel: HotelDetail }) {
  const { readiness } = hotel;
  const color = readiness.completeness_percent >= 80 ? COLORS.success : readiness.completeness_percent >= 50 ? COLORS.warning : COLORS.error;

  return (
    <Grid container spacing={2.5}>
      {/* Readiness */}
      <Grid item xs={12}>
        <Paper elevation={0} sx={{
          p: 2.5, borderRadius: 3,
          border: `1.5px solid ${alpha(color, 0.35)}`,
          background: `linear-gradient(135deg, ${alpha(color, 0.04)}, transparent)`,
        }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", color: COLORS.textPrimary }}>
              Readiness Score
            </Typography>
            <Chip
              label={`${readiness.completeness_percent}%`}
              sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 800, fontSize: "0.85rem", height: 28, border: `1px solid ${alpha(color, 0.3)}` }}
            />
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(readiness.completeness_percent, 100)}
            sx={{
              height: 8, borderRadius: 4, mb: 2,
              bgcolor: alpha(color, 0.12),
              "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 4 },
            }}
          />
          <Grid container spacing={1}>
            {readiness.checks.map(item => (
              <Grid item xs={12} sm={6} key={item.key}>
                <Box sx={{
                  display: "flex", alignItems: "center", gap: 1, p: 1.25,
                  borderRadius: 2, bgcolor: alpha(COLORS.bgMain, 0.7),
                  border: `1px solid ${item.passed ? alpha(COLORS.success, 0.15) : alpha(COLORS.error, 0.12)}`,
                }}>
                  {item.passed
                    ? <CheckCircle sx={{ fontSize: 15, color: COLORS.success, flexShrink: 0 }} />
                    : <Cancel sx={{ fontSize: 15, color: COLORS.error, flexShrink: 0 }} />}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: COLORS.textPrimary }}>{item.label}</Typography>
                    {item.hint && (
                      <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary }} noWrap>{item.hint}</Typography>
                    )}
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Grid>

      {/* Hotel Info */}
      <Grid item xs={12} md={6}>
        <SectionCard title="Hotel Details" icon={<Hotel sx={{ fontSize: 18 }} />}>
          <InfoRow label="Hotel Code" value={hotel.hotel_code} />
          <Divider />
          <InfoRow label="Type" value={hotel.hotel_type} />
          <Divider />
          <InfoRow label="Category" value={hotel.category_label} />
          <Divider />
          <InfoRow label="Star Rating" value={hotel.star_rating ? `${hotel.star_rating} Star` : null} />
          <Divider />
          <InfoRow label="Total Rooms" value={String(hotel.total_rooms)} />
          <Divider />
          <InfoRow label="Room Categories" value={String(hotel.room_category_count)} />
          <Divider />
          <InfoRow label="Images" value={String(hotel.image_count)} />
          <Divider />
          <InfoRow label="Documents" value={String(hotel.document_count)} />
        </SectionCard>
      </Grid>

      {/* Location + Contact */}
      <Grid item xs={12} md={6}>
        <Stack spacing={2}>
          <SectionCard title="Location" icon={<LocationOn sx={{ fontSize: 18 }} />}>
            <InfoRow label="City" value={hotel.city_name} />
            <Divider />
            <InfoRow label="State" value={hotel.state_name} />
          </SectionCard>

          <SectionCard title="Lifecycle" icon={<TaskAlt sx={{ fontSize: 18 }} />}>
            <InfoRow label="Submitted" value={hotel.submitted_at ? new Date(hotel.submitted_at).toLocaleDateString("en-IN") : null} />
            <Divider />
            <InfoRow label="Approved" value={hotel.approved_at ? new Date(hotel.approved_at).toLocaleDateString("en-IN") : null} />
            <Divider />
            <InfoRow label="Activated" value={hotel.activated_at ? new Date(hotel.activated_at).toLocaleDateString("en-IN") : null} />
            <Divider />
            <InfoRow label="Created" value={new Date(hotel.created_at).toLocaleDateString("en-IN")} />
          </SectionCard>
        </Stack>
      </Grid>
    </Grid>
  );
}
