// ============================================================
// WALLET ANALYTICS SECTION
// Data: analyticsService.getWalletSummary() → WalletSummary
// Shows: credited vs debited bar chart + breakdown cards
// ============================================================
import {
  Box, Typography, Stack, Skeleton, alpha, Divider,
} from "@mui/material";
import { AccountBalanceWallet, ArrowUpward, ArrowDownward } from "@mui/icons-material";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "../../../services/analytics.service";
import { COLORS } from "../../../theme";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: COLORS.navy, color: "#fff", px: 2, py: 1.5, borderRadius: 2, minWidth: 140 }}>
      <Typography sx={{ fontSize: "0.72rem", color: alpha("#fff", 0.6), mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: COLORS.gold }}>
        ₹{Number(payload[0]?.value ?? 0).toLocaleString("en-IN")}
      </Typography>
    </Box>
  );
}

export default function WalletAnalyticsSection() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["wallet-summary-analytics"],
    queryFn: () => analyticsService.getWalletSummary(),
    staleTime: 5 * 60 * 1000,
  });

  const barData = [
    { label: "Settlements\nReceived", value: summary?.settlement_credits ?? 0, color: COLORS.success },
    { label: "Commissions\nDebited", value: summary?.commission_debits ?? 0, color: COLORS.error },
    { label: "Recharges\nAdded", value: summary?.recharge_credits ?? 0, color: COLORS.info },
  ];

  const breakdownItems = [
    {
      label: "Total Credited", value: summary?.total_credited ?? 0,
      color: COLORS.success, icon: <ArrowUpward sx={{ fontSize: 14 }} />,
      sublabel: "All inflows",
    },
    {
      label: "Total Debited", value: summary?.total_debited ?? 0,
      color: COLORS.error, icon: <ArrowDownward sx={{ fontSize: 14 }} />,
      sublabel: "All outflows",
    },
    {
      label: "Settlements", value: summary?.settlement_credits ?? 0,
      color: "#10B981", icon: <ArrowUpward sx={{ fontSize: 14 }} />,
      sublabel: "From bookings",
    },
    {
      label: "Commissions", value: summary?.commission_debits ?? 0,
      color: "#EF4444", icon: <ArrowDownward sx={{ fontSize: 14 }} />,
      sublabel: "Platform fee",
    },
  ];

  return (
    <Box sx={{
      bgcolor: COLORS.bgCard, borderRadius: 3, border: `1px solid ${COLORS.border}`,
      boxShadow: "0 2px 12px rgba(10,22,40,0.05)", p: 3,
    }}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: 2,
          background: `linear-gradient(135deg, #10B981, #059669)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 12px ${alpha("#10B981", 0.3)}`,
        }}>
          <AccountBalanceWallet sx={{ fontSize: 19, color: "#fff" }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: COLORS.textPrimary }}>
            Wallet Analytics
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
            Financial flow breakdown
          </Typography>
        </Box>
      </Stack>

      {/* Summary breakdown */}
      <Box sx={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 1.5, mb: 2.5,
      }}>
        {breakdownItems.map((item) => (
          <Box key={item.label} sx={{
            px: 1.5, py: 1.25, borderRadius: 2,
            bgcolor: alpha(item.color, 0.06),
            border: `1px solid ${alpha(item.color, 0.15)}`,
          }}>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
              <Box sx={{ color: item.color }}>{item.icon}</Box>
              <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary, fontWeight: 600 }}>
                {item.label}
              </Typography>
            </Stack>
            {isLoading ? (
              <Skeleton width={70} height={20} />
            ) : (
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 800, color: item.color }}>
                ₹{item.value.toLocaleString("en-IN")}
              </Typography>
            )}
            <Typography sx={{ fontSize: "0.65rem", color: COLORS.textSecondary }}>{item.sublabel}</Typography>
          </Box>
        ))}
      </Box>

      <Divider sx={{ borderColor: COLORS.border, mb: 2 }} />

      {/* Bar chart */}
      <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: COLORS.textSecondary, mb: 1.5, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Transaction Breakdown
      </Typography>
      {isLoading ? (
        <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
      ) : (
        <Box sx={{ height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(COLORS.border, 0.8)} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9.5, fill: COLORS.textSecondary, fontWeight: 600 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`}
                tick={{ fontSize: 10, fill: COLORS.textSecondary }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: alpha(COLORS.border, 0.4) }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Ledger count */}
      {!isLoading && (summary?.ledger_count ?? 0) > 0 && (
        <Box sx={{
          mt: 1.5, px: 2, py: 0.75, borderRadius: 2,
          bgcolor: alpha(COLORS.info, 0.06),
          border: `1px solid ${alpha(COLORS.info, 0.15)}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>Total Transactions</Typography>
          <Typography sx={{ fontSize: "0.9rem", fontWeight: 800, color: COLORS.info }}>
            {summary?.ledger_count.toLocaleString("en-IN")}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
