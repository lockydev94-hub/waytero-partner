// ============================================================
// HOTEL OCCUPANCY SECTION
// Data: dashboard.hotels → { total, active, pending }
// Shows: hotel status breakdown with gauge-style indicators
// Mirror of VehicleFleetSection.tsx with hotel-blue palette
// ============================================================
import {
  Box, Typography, Stack, Skeleton, alpha,
} from "@mui/material";
import { Hotel, CheckCircle, HourglassTop, Cancel } from "@mui/icons-material";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from "recharts";
import { COLORS } from "../../../theme";

const HOTEL_BLUE = "#0EA5E9";
const HOTEL_BLUE_DARK = "#0369A1";

interface Props {
  hotels: {
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
      <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: HOTEL_BLUE }}>{payload[0].name}</Typography>
      <Typography sx={{ fontSize: "0.9rem", fontWeight: 800 }}>{payload[0].value}</Typography>
    </Box>
  );
}

export default function HotelOccupancySection({ hotels, loading }: Props) {
  const total = hotels?.total ?? 0;
  const active = hotels?.active ?? 0;
  const pending = hotels?.pending ?? 0;
  const inactive = Math.max(0, total - active - pending);

  const activePct = total > 0 ? Math.round((active / total) * 100) : 0;

  const radialData = [
    { name: "Active",   value: active,   fill: COLORS.success },
    { name: "Pending",  value: pending,  fill: COLORS.warning },
    { name: "Inactive", value: inactive, fill: COLORS.error },
  ].filter((d) => d.value > 0);

  const STATUS_ITEMS = [
    { label: "Active",         value: active,   color: COLORS.success, icon: <CheckCircle  sx={{ fontSize: 14 }} /> },
    { label: "Pending Review", value: pending,  color: COLORS.warning, icon: <HourglassTop sx={{ fontSize: 14 }} /> },
    { label: "Inactive",       value: inactive, color: COLORS.error,   icon: <Cancel       sx={{ fontSize: 14 }} /> },
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
          background: `linear-gradient(135deg, ${HOTEL_BLUE}, ${HOTEL_BLUE_DARK})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 12px ${alpha(HOTEL_BLUE, 0.3)}`,
        }}>
          <Hotel sx={{ fontSize: 19, color: "#fff" }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: COLORS.textPrimary }}>
            Hotel Occupancy
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
            Property status at a glance
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
                data={radialData.length > 0 ? radialData : [{ name: "No hotels", value: 1, fill: alpha(COLORS.border, 0.4) }]}
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
                HOTELS
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

          {/* Active rate */}
          {total > 0 && (
            <Box sx={{
              mt: 2, px: 2, py: 1, borderRadius: 2.5,
              background: `linear-gradient(135deg, ${alpha(HOTEL_BLUE, 0.08)}, ${alpha(HOTEL_BLUE, 0.02)})`,
              border: `1px solid ${alpha(HOTEL_BLUE, 0.2)}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>Active Rate</Typography>
              <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: HOTEL_BLUE }}>{activePct}%</Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}