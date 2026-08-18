// ============================================================
// WAYTERO PARTNER PORTAL — WALLET SUMMARY STAT CARDS
// ============================================================
import { Box, Card, CardContent, Typography, Skeleton, alpha } from "@mui/material";
import { ArrowDownward, ArrowUpward, Sync, CommitSharp, Replay } from "@mui/icons-material";
import type { WalletSummary } from "../../../services/wallet.service";
import { COLORS } from "../../../theme";

interface Props {
  summary: WalletSummary;
  loading: boolean;
}

interface StatCardConfig {
  label: string;
  value: number;
  icon: JSX.Element;
  color: string;
  bg: string;
  prefix?: string;
}

export default function WalletSummaryCards({ summary, loading }: Props) {
  const cards: StatCardConfig[] = [
    {
      label: "Total Credited",
      value: summary.total_credited,
      icon: <ArrowDownward />,
      color: COLORS.success,
      bg: alpha(COLORS.success, 0.08),
      prefix: "₹",
    },
    {
      label: "Total Debited",
      value: summary.total_debited,
      icon: <ArrowUpward />,
      color: COLORS.error,
      bg: alpha(COLORS.error, 0.07),
      prefix: "₹",
    },
    {
      label: "Settlement Credits",
      value: summary.settlement_credits,
      icon: <Sync />,
      color: COLORS.info,
      bg: alpha(COLORS.info, 0.08),
      prefix: "₹",
    },
    {
      label: "Commission Debits",
      value: summary.commission_debits,
      icon: <CommitSharp />,
      color: "#8B5CF6",
      bg: alpha("#8B5CF6", 0.08),
      prefix: "₹",
    },
    {
      label: "Recharge Credits",
      value: summary.recharge_credits,
      icon: <Replay />,
      color: COLORS.gold,
      bg: alpha(COLORS.gold, 0.09),
      prefix: "₹",
    },
    {
      label: "Total Transactions",
      value: summary.ledger_count,
      icon: <Sync />,
      color: COLORS.textSecondary,
      bg: alpha(COLORS.textSecondary, 0.07),
    },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" },
        gap: 2,
      }}
    >
      {cards.map((c) => (
        <Card
          key={c.label}
          sx={{
            borderRadius: 3, border: `1px solid ${COLORS.border}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            transition: "transform 0.18s, box-shadow 0.18s",
            "&:hover": { transform: "translateY(-2px)", boxShadow: "0 6px 20px rgba(0,0,0,0.09)" },
          }}
        >
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Box
              sx={{
                width: 36, height: 36, borderRadius: 2, bgcolor: c.bg,
                display: "flex", alignItems: "center", justifyContent: "center", mb: 1.5,
                "& svg": { fontSize: 18, color: c.color },
              }}
            >
              {c.icon}
            </Box>
            {loading ? (
              <>
                <Skeleton variant="text" width={70} height={28} />
                <Skeleton variant="text" width={90} height={16} />
              </>
            ) : (
              <>
                <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: COLORS.textPrimary, lineHeight: 1.1 }}>
                  {c.prefix ?? ""}{c.value.toLocaleString("en-IN", c.prefix ? { minimumFractionDigits: 2 } : undefined)}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary, fontWeight: 500, mt: 0.3 }}>
                  {c.label}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
