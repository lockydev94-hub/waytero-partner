// ============================================================
// REVENUE CHART SECTION
// Data: dashboard.revenue_chart → [{ month, revenue }]
// Chart: Recharts AreaChart with gradient fill + tooltip
// ============================================================
import { useState } from "react";
import {
  Box, Typography, Stack, Skeleton, ToggleButtonGroup,
  ToggleButton, alpha, useTheme,
} from "@mui/material";
import { TrendingUp, AttachMoney } from "@mui/icons-material";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "../../../services/analytics.service";
import { COLORS } from "../../../theme";

const MONTH_OPTIONS = [
  { label: "3M", value: 3 },
  { label: "6M", value: 6 },
  { label: "12M", value: 12 },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      bgcolor: COLORS.navy, color: "#fff", px: 2, py: 1.5, borderRadius: 2,
      boxShadow: "0 8px 24px rgba(0,0,0,0.2)", minWidth: 140,
    }}>
      <Typography sx={{ fontSize: "0.72rem", color: alpha("#fff", 0.6), mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: COLORS.gold }}>
        ₹{Number(payload[0]?.value ?? 0).toLocaleString("en-IN")}
      </Typography>
      <Typography sx={{ fontSize: "0.68rem", color: alpha("#fff", 0.4) }}>Net Payout</Typography>
    </Box>
  );
}

export default function RevenueChartSection() {
  const [months, setMonths] = useState(6);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-dashboard", months],
    queryFn: () => analyticsService.getDashboard(months),
    staleTime: 5 * 60 * 1000,
  });

  const chart = data?.revenue_chart ?? [];
  const totalRevenue = chart.reduce((s, r) => s + r.revenue, 0);
  const maxRevenue = Math.max(...chart.map((r) => r.revenue), 1);
  const avgRevenue = chart.length > 0 ? totalRevenue / chart.length : 0;

  // Pad to fill selected month count with zero-revenue months if needed
  const filledChart = chart.length > 0 ? chart : Array.from({ length: months }, (_, i) => ({
    month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i % 12],
    revenue: 0,
  }));

  return (
    <Box sx={{
      bgcolor: COLORS.bgCard, borderRadius: 3, border: `1px solid ${COLORS.border}`,
      boxShadow: "0 2px 12px rgba(10,22,40,0.05)", p: 3,
    }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{
            width: 38, height: 38, borderRadius: 2,
            background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 12px ${alpha(COLORS.gold, 0.3)}`,
          }}>
            <TrendingUp sx={{ fontSize: 19, color: "#000" }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: COLORS.textPrimary }}>
              Revenue Trend
            </Typography>
            <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
              Net partner payout over time
            </Typography>
          </Box>
        </Stack>

        {/* Month toggle */}
        <ToggleButtonGroup
          value={months} exclusive size="small"
          onChange={(_, v) => v && setMonths(v)}
          sx={{
            "& .MuiToggleButton-root": {
              fontSize: "0.72rem", fontWeight: 700, px: 1.5, py: 0.5,
              borderRadius: "8px !important", border: `1px solid ${COLORS.border}`,
              color: COLORS.textSecondary,
              "&.Mui-selected": {
                bgcolor: COLORS.navy, color: COLORS.gold,
                borderColor: COLORS.navy,
              },
            },
          }}
        >
          {MONTH_OPTIONS.map((o) => (
            <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {/* Summary row */}
      <Stack direction="row" spacing={3} sx={{ mb: 2.5 }}>
        {[
          { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString("en-IN")}`, color: COLORS.gold },
          { label: "Monthly Avg", value: `₹${Math.round(avgRevenue).toLocaleString("en-IN")}`, color: COLORS.info },
          { label: "Best Month", value: `₹${maxRevenue.toLocaleString("en-IN")}`, color: COLORS.success },
        ].map((item) => (
          <Box key={item.label}>
            <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary, mb: 0.25 }}>{item.label}</Typography>
            {isLoading ? (
              <Skeleton width={80} height={22} />
            ) : (
              <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: item.color }}>{item.value}</Typography>
            )}
          </Box>
        ))}
      </Stack>

      {/* Chart */}
      {isLoading ? (
        <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
      ) : (
        <Box sx={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filledChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS.gold} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(COLORS.border, 0.8)} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: COLORS.textSecondary, fontWeight: 600 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`}
                tick={{ fontSize: 10, fill: COLORS.textSecondary }}
                axisLine={false} tickLine={false} width={52}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: alpha(COLORS.gold, 0.2), strokeWidth: 1 }} />
              {avgRevenue > 0 && (
                <ReferenceLine
                  y={avgRevenue} stroke={alpha(COLORS.info, 0.5)} strokeDasharray="4 3"
                  label={{ value: "Avg", position: "right", fontSize: 10, fill: COLORS.info }}
                />
              )}
              <Area
                type="monotone" dataKey="revenue"
                stroke={COLORS.gold} strokeWidth={2.5}
                fill="url(#revenueGrad)"
                dot={{ r: 3.5, fill: COLORS.gold, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6, fill: COLORS.gold, stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
}
