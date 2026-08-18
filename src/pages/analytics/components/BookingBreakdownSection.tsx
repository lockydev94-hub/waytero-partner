// ============================================================
// BOOKING BREAKDOWN SECTION
// Data: dashboard.bookings → { total, this_month, completed, cancelled }
// Shows: donut-style ratio chart + status breakdown bars
// ============================================================
import {
  Box, Typography, Stack, Skeleton, alpha, LinearProgress,
} from "@mui/material";
import {
  BookOnline, CheckCircle, Cancel, HourglassTop,
} from "@mui/icons-material";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { COLORS } from "../../../theme";

interface Props {
  bookings: {
    total: number;
    this_month: number;
    completed: number;
    cancelled: number;
    revenue_this_month: number;
  } | null;
  loading?: boolean;
}

const STATUS_CONFIG = [
  { key: "completed", label: "Completed",  color: COLORS.success,  icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  { key: "cancelled", label: "Cancelled",  color: COLORS.error,    icon: <Cancel sx={{ fontSize: 14 }} /> },
];

function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: COLORS.navy, color: "#fff", px: 2, py: 1.5, borderRadius: 2, minWidth: 120 }}>
      <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: COLORS.gold }}>{payload[0].name}</Typography>
      <Typography sx={{ fontSize: "0.9rem", fontWeight: 800 }}>{payload[0].value}</Typography>
    </Box>
  );
}

export default function BookingBreakdownSection({ bookings, loading }: Props) {
  const total = bookings?.total ?? 0;
  const completed = bookings?.completed ?? 0;
  const cancelled = bookings?.cancelled ?? 0;
  const inProgress = Math.max(0, total - completed - cancelled);

  const pieData = [
    { name: "Completed", value: completed, color: COLORS.success },
    { name: "Cancelled", value: cancelled, color: COLORS.error },
    { name: "In Progress", value: inProgress, color: COLORS.info },
  ].filter((d) => d.value > 0);

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Box sx={{
      bgcolor: COLORS.bgCard, borderRadius: 3, border: `1px solid ${COLORS.border}`,
      boxShadow: "0 2px 12px rgba(10,22,40,0.05)", p: 3, height: "100%",
    }}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: 2,
          background: `linear-gradient(135deg, ${COLORS.info}, #1D4ED8)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 12px ${alpha(COLORS.info, 0.3)}`,
        }}>
          <BookOnline sx={{ fontSize: 19, color: "#fff" }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: COLORS.textPrimary }}>
            Booking Breakdown
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
            All-time booking performance
          </Typography>
        </Box>
      </Stack>

      {loading ? (
        <Box>
          <Skeleton variant="circular" width={140} height={140} sx={{ mx: "auto", mb: 2 }} />
          {[1,2,3].map((i) => <Skeleton key={i} height={36} sx={{ mb: 1, borderRadius: 2 }} />)}
        </Box>
      ) : (
        <>
          {/* Donut chart + centre label */}
          <Box sx={{ position: "relative", height: 160, mb: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData.length > 0 ? pieData : [{ name: "No data", value: 1, color: alpha(COLORS.border, 0.5) }]}
                  cx="50%" cy="50%"
                  innerRadius={52} outerRadius={72}
                  paddingAngle={pieData.length > 1 ? 3 : 0}
                  dataKey="value" startAngle={90} endAngle={-270}
                >
                  {(pieData.length > 0 ? pieData : [{ color: alpha(COLORS.border, 0.5) }]).map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Centre text */}
            <Box sx={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", pointerEvents: "none",
            }}>
              <Typography sx={{ fontSize: "1.75rem", fontWeight: 900, color: COLORS.textPrimary, lineHeight: 1 }}>
                {total}
              </Typography>
              <Typography sx={{ fontSize: "0.65rem", color: COLORS.textSecondary, fontWeight: 600 }}>
                TOTAL
              </Typography>
            </Box>
          </Box>

          {/* Legend + progress bars */}
          <Stack spacing={1.25}>
            {[
              { label: "Completed",  value: completed,   color: COLORS.success, pct: total > 0 ? (completed / total) * 100 : 0 },
              { label: "Cancelled",  value: cancelled,   color: COLORS.error,   pct: total > 0 ? (cancelled / total) * 100 : 0 },
              { label: "In Progress",value: inProgress,  color: COLORS.info,    pct: total > 0 ? (inProgress / total) * 100 : 0 },
            ].map((item) => (
              <Box key={item.label}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: item.color, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>{item.label}</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: COLORS.textPrimary }}>
                    {item.value}
                    <Typography component="span" sx={{ fontSize: "0.65rem", color: COLORS.textSecondary, ml: 0.5 }}>
                      ({Math.round(item.pct)}%)
                    </Typography>
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate" value={item.pct}
                  sx={{
                    height: 5, borderRadius: 3,
                    bgcolor: alpha(item.color, 0.1),
                    "& .MuiLinearProgress-bar": { bgcolor: item.color, borderRadius: 3 },
                  }}
                />
              </Box>
            ))}
          </Stack>

          {/* Completion rate pill */}
          <Box sx={{
            mt: 2, px: 2, py: 1, borderRadius: 2.5,
            background: `linear-gradient(135deg, ${alpha(COLORS.success, 0.08)}, ${alpha(COLORS.success, 0.02)})`,
            border: `1px solid ${alpha(COLORS.success, 0.2)}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>Completion Rate</Typography>
            <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: COLORS.success }}>{completionRate}%</Typography>
          </Box>
        </>
      )}
    </Box>
  );
}
