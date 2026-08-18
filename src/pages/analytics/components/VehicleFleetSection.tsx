// ============================================================
// VEHICLE FLEET SECTION
// Data: dashboard.vehicles → { total, active, pending }
// Shows: fleet status breakdown with gauge-style indicators
// ============================================================
import {
  Box, Typography, Stack, Skeleton, alpha, Chip,
} from "@mui/material";
import { DirectionsCar, CheckCircle, HourglassTop, Cancel } from "@mui/icons-material";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from "recharts";
import { COLORS } from "../../../theme";

interface Props {
  vehicles: {
    total: number;
    active: number;
    pending: number;
  } | null;
  loading?: boolean;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: COLORS.navy, color: "#fff", px: 2, py: 1.5, borderRadius: 2 }}>
      <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: COLORS.gold }}>{payload[0].name}</Typography>
      <Typography sx={{ fontSize: "0.9rem", fontWeight: 800 }}>{payload[0].value}</Typography>
    </Box>
  );
}

export default function VehicleFleetSection({ vehicles, loading }: Props) {
  const total = vehicles?.total ?? 0;
  const active = vehicles?.active ?? 0;
  const pending = vehicles?.pending ?? 0;
  const inactive = Math.max(0, total - active - pending);

  const activePct = total > 0 ? Math.round((active / total) * 100) : 0;

  const radialData = [
    { name: "Active", value: active, fill: COLORS.success },
    { name: "Pending", value: pending, fill: COLORS.warning },
    { name: "Inactive", value: inactive, fill: COLORS.error },
  ].filter((d) => d.value > 0);

  const STATUS_ITEMS = [
    { label: "Active / On Trip", value: active, color: COLORS.success, icon: <CheckCircle sx={{ fontSize: 14 }} /> },
    { label: "Pending Review", value: pending, color: COLORS.warning, icon: <HourglassTop sx={{ fontSize: 14 }} /> },
    { label: "Inactive", value: inactive, color: COLORS.error, icon: <Cancel sx={{ fontSize: 14 }} /> },
  ];

  return (
    <Box sx={{
      bgcolor: COLORS.bgCard, borderRadius: 3, border: `1px solid ${COLORS.border}`,
      boxShadow: "0 2px 12px rgba(10,22,40,0.05)", p: 3, height: "100%",
    }}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: 2,
          background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 12px ${alpha(COLORS.gold, 0.3)}`,
        }}>
          <DirectionsCar sx={{ fontSize: 19, color: "#000" }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: COLORS.textPrimary }}>
            Fleet Overview
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
            Vehicle status at a glance
          </Typography>
        </Box>
      </Stack>

      {loading ? (
        <Box>
          <Skeleton variant="circular" width={130} height={130} sx={{ mx: "auto", mb: 2 }} />
          {[1, 2, 3].map((i) => <Skeleton key={i} height={44} sx={{ mb: 1, borderRadius: 2 }} />)}
        </Box>
      ) : (
        <>
          {/* Radial chart + centre */}
          <Box sx={{ position: "relative", height: 150, mb: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%" cy="50%"
                innerRadius={42} outerRadius={68}
                data={radialData.length > 0 ? radialData : [{ name: "No vehicles", value: 1, fill: alpha(COLORS.border, 0.4) }]}
                startAngle={90} endAngle={-270}
              >
                <RadialBar dataKey="value" cornerRadius={4} />
                <Tooltip content={<CustomTooltip />} />
              </RadialBarChart>
            </ResponsiveContainer>
            {/* Centre text */}
            <Box sx={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}>
              <Typography sx={{ fontSize: "1.75rem", fontWeight: 900, color: COLORS.textPrimary, lineHeight: 1 }}>
                {total}
              </Typography>
              <Typography sx={{ fontSize: "0.65rem", color: COLORS.textSecondary, fontWeight: 600 }}>
                VEHICLES
              </Typography>
            </Box>
          </Box>

          {/* Status list */}
          <Stack spacing={1.25}>
            {STATUS_ITEMS.map((item) => (
              <Stack key={item.label} direction="row" justifyContent="space-between" alignItems="center"
                sx={{
                  px: 1.5, py: 1, borderRadius: 2,
                  bgcolor: alpha(item.color, 0.06),
                  border: `1px solid ${alpha(item.color, 0.15)}`,
                }}
              >
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{ color: item.color }}>{item.icon}</Box>
                  <Typography sx={{ fontSize: "0.76rem", color: COLORS.textSecondary }}>{item.label}</Typography>
                </Stack>
                <Typography sx={{ fontSize: "0.88rem", fontWeight: 800, color: item.color }}>
                  {item.value}
                </Typography>
              </Stack>
            ))}
          </Stack>

          {/* Utilisation rate */}
          {total > 0 && (
            <Box sx={{
              mt: 2, px: 2, py: 1, borderRadius: 2.5,
              background: `linear-gradient(135deg, ${alpha(COLORS.gold, 0.08)}, ${alpha(COLORS.gold, 0.02)})`,
              border: `1px solid ${alpha(COLORS.gold, 0.2)}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>Utilisation Rate</Typography>
              <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: COLORS.gold }}>{activePct}%</Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
