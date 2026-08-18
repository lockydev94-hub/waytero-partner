// ============================================================
// SERVICES SECTION — Active services overview (read-only display)
// Data from PartnerResponse.services[] + GET /partners/me/commission
// Shows the commission group assigned by admin and the commission
// deducted per service type (PERCENTAGE of booking value or FLAT ₹).
// ============================================================
import { Box, Stack, Typography, Chip, alpha, Alert } from "@mui/material";
import {
  DirectionsCar, Hotel, TravelExplore, CheckCircle, Cancel,
  Percent, CurrencyRupee, InfoOutlined,
} from "@mui/icons-material";
import { COLORS } from "../../../theme";
import SettingsSectionCard from "./SettingsSectionCard";
import type { CommissionInfo, CommissionRule } from "../../../services/settings.service";

const SERVICE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  CAB:   { label: "Cab Service",  icon: <DirectionsCar />,  color: COLORS.gold },
  HOTEL: { label: "Hotel",        icon: <Hotel />,          color: "#0EA5E9" },
  TOUR:  { label: "Tour Package", icon: <TravelExplore />,  color: "#8B5CF6" },
};

function formatRate(rule: CommissionRule): string {
  const value = Number(rule.commission_value) || 0;
  const scope = rule.city_name ? ` (${rule.city_name})` : "";
  if (rule.commission_type === "FLAT") {
    return `₹${value.toLocaleString("en-IN")} per booking${scope}`;
  }
  return `${value}% of booking value${scope}`;
}

function RateChip({ rule }: { rule: CommissionRule }) {
  const isFlat = rule.commission_type === "FLAT";
  return (
    <Chip
      icon={isFlat ? <CurrencyRupee sx={{ fontSize: "13px !important" }} /> : <Percent sx={{ fontSize: "13px !important" }} />}
      label={formatRate(rule)}
      size="small"
      sx={{
        height: 22, fontSize: "0.7rem", fontWeight: 700,
        bgcolor: alpha(COLORS.navy, 0.06),
        color: COLORS.textPrimary,
        border: `1px solid ${alpha(COLORS.navy, 0.15)}`,
      }}
    />
  );
}

interface Props {
  services: any[];
  commission?: CommissionInfo | null;
}

export default function ServicesSection({ services, commission }: Props) {
  const group = commission?.commission_group ?? null;
  const rules = commission?.rules ?? [];

  return (
    <SettingsSectionCard
      icon={<DirectionsCar />}
      title="Active Services"
      subtitle="Services enabled on your partner account"
      iconColor={COLORS.gold}
    >
      {/* ── Commission summary ─────────────────────────────────────────── */}
      {group ? (
        <Box
          sx={{
            mb: 2, p: 2, borderRadius: 2.5,
            border: `1.5px solid ${alpha(COLORS.navy, 0.15)}`,
            bgcolor: alpha(COLORS.navy, 0.04),
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 36, height: 36, borderRadius: 2, flexShrink: 0,
                bgcolor: alpha(COLORS.navy, 0.1),
                display: "flex", alignItems: "center", justifyContent: "center",
                "& svg": { fontSize: 19, color: COLORS.navy },
              }}
            >
              <Percent />
            </Box>
            <Box flex={1}>
              <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", color: COLORS.textPrimary }}>
                Commission group: {group.group_name}
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
                {group.description || "Platform commission is deducted from each booking before your payout."}
              </Typography>
            </Box>
          </Stack>
          {rules.length > 0 && (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 1.25, gap: 0.75 }}>
              {rules.map((r) => <RateChip key={r.id} rule={r} />)}
            </Stack>
          )}
        </Box>
      ) : (
        <Alert severity="info" icon={<InfoOutlined />} sx={{ mb: 2, borderRadius: 2 }}>
          No commission group assigned yet. Commission rates are set by your WayTero account manager.
        </Alert>
      )}

      {services.length === 0 ? (
        <Typography sx={{ fontSize: "0.85rem", color: COLORS.textSecondary }}>No services enabled.</Typography>
      ) : (
        <Stack spacing={1.25}>
          {services.map((svc) => {
            const meta = SERVICE_META[svc.service_type] ?? { label: svc.service_type, icon: <DirectionsCar />, color: COLORS.gold };
            const svcRules = rules.filter((r) => r.service_type === svc.service_type);
            return (
              <Box
                key={svc.id}
                sx={{
                  p: 2, borderRadius: 2.5,
                  display: "flex", alignItems: "center", gap: 2,
                  border: `1.5px solid ${svc.is_active ? alpha(meta.color, 0.3) : COLORS.border}`,
                  bgcolor: svc.is_active ? alpha(meta.color, 0.04) : alpha(COLORS.bgMain, 0.5),
                }}
              >
                <Box
                  sx={{
                    width: 40, height: 40, borderRadius: 2, flexShrink: 0,
                    bgcolor: svc.is_active ? alpha(meta.color, 0.12) : alpha(COLORS.textSecondary, 0.08),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    "& svg": { fontSize: 20, color: svc.is_active ? meta.color : COLORS.textSecondary },
                  }}
                >
                  {meta.icon}
                </Box>
                <Box flex={1} minWidth={0}>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: COLORS.textPrimary }}>
                    {meta.label}
                  </Typography>
                  <Typography sx={{ fontSize: "0.73rem", color: COLORS.textSecondary }}>
                    Enabled {new Date(svc.created_at).toLocaleDateString()}
                  </Typography>
                  {svcRules.length > 0 && (
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 0.75, gap: 0.75 }}>
                      {svcRules.map((r) => <RateChip key={r.id} rule={r} />)}
                    </Stack>
                  )}
                </Box>
                <Chip
                  icon={svc.is_active ? <CheckCircle sx={{ fontSize: "12px !important" }} /> : <Cancel sx={{ fontSize: "12px !important" }} />}
                  label={svc.is_active ? "Active" : "Inactive"}
                  size="small"
                  sx={{
                    height: 22, fontSize: "0.7rem", fontWeight: 700,
                    bgcolor: svc.is_active ? alpha(COLORS.success, 0.1) : alpha(COLORS.textSecondary, 0.08),
                    color: svc.is_active ? COLORS.success : COLORS.textSecondary,
                    border: `1px solid ${svc.is_active ? alpha(COLORS.success, 0.25) : COLORS.border}`,
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      )}
      <Typography sx={{ fontSize: "0.72rem", color: alpha(COLORS.textSecondary, 0.65), mt: 2 }}>
        Commission rates are set by your WayTero account manager. To add or remove services, contact your account manager.
      </Typography>
    </SettingsSectionCard>
  );
}
