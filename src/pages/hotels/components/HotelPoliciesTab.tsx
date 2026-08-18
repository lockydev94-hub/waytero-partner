// ============================================================
// HOTEL POLICIES TAB — check-in/out times, guest policies, cancellation
// ============================================================
import { useState, useEffect, useCallback } from "react";
import {
  Box, Grid, Typography, Alert, CircularProgress, alpha, Paper, Divider,
} from "@mui/material";
import {
  Schedule, People, Cancel, House,
} from "@mui/icons-material";
import { COLORS } from "../../../theme";
import { hotelService, type HotelPolicy } from "../../../services/hotel.service";

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Paper elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden", height: "100%" }}>
      <Box sx={{ px: 2.5, py: 1.75, display: "flex", alignItems: "center", gap: 1, borderBottom: `1px solid ${COLORS.border}`, bgcolor: alpha(COLORS.bgMain, 0.5) }}>
        <Box sx={{ color: COLORS.gold, display: "flex" }}>{icon}</Box>
        <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: COLORS.textPrimary }}>{title}</Typography>
      </Box>
      <Box sx={{ px: 2.5, py: 0.5 }}>{children}</Box>
    </Paper>
  );
}

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

function BoolRow({ label, value }: { label: string; value: boolean }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.875, alignItems: "center" }}>
      <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>{label}</Typography>
      <Box sx={{
        px: 1, py: 0.25, borderRadius: 1,
        bgcolor: alpha(value ? COLORS.success : COLORS.error, 0.1),
        border: `1px solid ${alpha(value ? COLORS.success : COLORS.error, 0.25)}`,
      }}>
        <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: value ? COLORS.success : COLORS.error }}>
          {value ? "Yes" : "No"}
        </Typography>
      </Box>
    </Box>
  );
}

export default function HotelPoliciesTab({ hotelId }: { hotelId: number }) {
  const [policy, setPolicy] = useState<HotelPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPolicy(await hotelService.getPolicy(hotelId));
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load policies");
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
      <CircularProgress size={32} sx={{ color: COLORS.gold }} />
    </Box>
  );

  if (error) return <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>;

  if (!policy) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <House sx={{ fontSize: 48, color: alpha(COLORS.textSecondary, 0.3), mb: 1.5 }} />
        <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary }}>No policies configured yet</Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2.5}>
      {/* Check-in / Check-out */}
      <Grid item xs={12} md={6}>
        <SectionCard title="Check-in & Check-out" icon={<Schedule sx={{ fontSize: 18 }} />}>
          <InfoRow label="Check-in Time"  value={policy.check_in_time} />
          <Divider />
          <InfoRow label="Check-out Time" value={policy.check_out_time} />
          <Divider />
          <BoolRow label="Early Check-in Allowed"  value={policy.early_check_in_allowed} />
          <Divider />
          <BoolRow label="Late Check-out Allowed"  value={policy.late_check_out_allowed} />
          {policy.min_guest_age !== null && (
            <>
              <Divider />
              <InfoRow label="Min Guest Age" value={`${policy.min_guest_age} years`} />
            </>
          )}
          {policy.child_free_age_limit !== null && (
            <>
              <Divider />
              <InfoRow label="Children Free Under" value={`${policy.child_free_age_limit} years`} />
            </>
          )}
          {policy.extra_bed_charge !== null && (
            <>
              <Divider />
              <InfoRow label="Extra Bed Charge" value={`₹${Number(policy.extra_bed_charge).toLocaleString("en-IN")}`} />
            </>
          )}
        </SectionCard>
      </Grid>

      {/* Guest policies */}
      <Grid item xs={12} md={6}>
        <SectionCard title="Guest Policies" icon={<People sx={{ fontSize: 18 }} />}>
          <BoolRow label="Couples Allowed"           value={policy.couples_allowed} />
          <Divider />
          <BoolRow label="Unmarried Couples Allowed" value={policy.unmarried_couples_allowed} />
          <Divider />
          <BoolRow label="Local ID Accepted"         value={policy.local_id_accepted} />
          <Divider />
          <BoolRow label="Pets Allowed"              value={policy.pets_allowed} />
          <Divider />
          <BoolRow label="Smoking Allowed"           value={policy.smoking_allowed} />
          <Divider />
          <BoolRow label="Alcohol Allowed"           value={policy.alcohol_allowed} />
        </SectionCard>
      </Grid>

      {/* Cancellation */}
      <Grid item xs={12} md={6}>
        <SectionCard title="Cancellation Policy" icon={<Cancel sx={{ fontSize: 18 }} />}>
          {policy.cancellation_free_hours !== null && (
            <>
              <InfoRow label="Free Cancellation Before" value={`${policy.cancellation_free_hours}h before check-in`} />
              <Divider />
              <InfoRow label="Refund (Tier 1)" value={policy.refund_percent_tier_1 ? `${policy.refund_percent_tier_1}%` : null} />
            </>
          )}
          {policy.cancellation_tier_2_hours !== null && (
            <>
              <Divider />
              <InfoRow label="Tier 2 Cutoff" value={`${policy.cancellation_tier_2_hours}h`} />
              <Divider />
              <InfoRow label="Refund (Tier 2)" value={policy.refund_percent_tier_2 ? `${policy.refund_percent_tier_2}%` : null} />
            </>
          )}
          {policy.cancellation_tier_3_hours !== null && (
            <>
              <Divider />
              <InfoRow label="Tier 3 Cutoff" value={`${policy.cancellation_tier_3_hours}h`} />
              <Divider />
              <InfoRow label="Refund (Tier 3)" value={policy.refund_percent_tier_3 ? `${policy.refund_percent_tier_3}%` : null} />
            </>
          )}
          {policy.refund_percent_same_day !== null && (
            <>
              <Divider />
              <InfoRow label="Same-Day Refund" value={`${policy.refund_percent_same_day}%`} />
            </>
          )}
          {policy.no_show_refund_percent !== null && (
            <>
              <Divider />
              <InfoRow label="No-Show Refund" value={`${policy.no_show_refund_percent}%`} />
            </>
          )}
          {policy.cancellation_policy_text && (
            <Box sx={{ mt: 1.5, mb: 1, p: 1.5, borderRadius: 2, bgcolor: alpha(COLORS.bgMain, 0.7), border: `1px solid ${COLORS.border}` }}>
              <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary, mb: 0.25 }}>Policy Text</Typography>
              <Typography sx={{ fontSize: "0.78rem", color: COLORS.textPrimary, whiteSpace: "pre-wrap" }}>
                {policy.cancellation_policy_text}
              </Typography>
            </Box>
          )}
        </SectionCard>
      </Grid>

      {/* House rules */}
      {policy.house_rules && (
        <Grid item xs={12} md={6}>
          <SectionCard title="House Rules" icon={<House sx={{ fontSize: 18 }} />}>
            <Box sx={{ py: 1.5 }}>
              <Typography sx={{ fontSize: "0.82rem", color: COLORS.textPrimary, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {policy.house_rules}
              </Typography>
            </Box>
          </SectionCard>
        </Grid>
      )}
    </Grid>
  );
}
