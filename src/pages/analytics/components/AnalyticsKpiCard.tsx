// ============================================================
// ANALYTICS KPI CARD — Premium metric card with trend indicator
// ============================================================
import { Box, Typography, Stack, Skeleton, alpha } from "@mui/material";
import { TrendingUp, TrendingDown, TrendingFlat } from "@mui/icons-material";
import { COLORS } from "../../../theme";

interface Props {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  color: string;
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
  loading?: boolean;
  prefix?: string;
  suffix?: string;
  fullWidth?: boolean;
}

export default function AnalyticsKpiCard({
  label, value, subValue, icon, color, trend, trendLabel,
  loading, prefix = "", suffix = "", fullWidth,
}: Props) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : TrendingFlat;
  const trendColor = trend === "up" ? COLORS.success : trend === "down" ? COLORS.error : COLORS.textSecondary;

  return (
    <Box
      sx={{
        bgcolor: COLORS.bgCard,
        borderRadius: 3,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 2px 12px rgba(10,22,40,0.05)",
        p: 2.5,
        height: "100%",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.15s, box-shadow 0.15s",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: `0 8px 24px ${alpha(color, 0.12)}`,
        },
      }}
    >
      {/* Background accent glow */}
      <Box
        sx={{
          position: "absolute", top: -20, right: -20,
          width: 100, height: 100, borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(color, 0.12)} 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {loading ? (
        <Box>
          <Skeleton width={100} height={14} sx={{ mb: 1 }} />
          <Skeleton width={140} height={36} sx={{ mb: 0.5 }} />
          <Skeleton width={80} height={13} />
        </Box>
      ) : (
        <>
          {/* Header row */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: "0.73rem", fontWeight: 600, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.6 }}>
              {label}
            </Typography>
            <Box
              sx={{
                width: 36, height: 36, borderRadius: 2, flexShrink: 0,
                background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.7)})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 4px 12px ${alpha(color, 0.3)}`,
                "& svg": { fontSize: 18, color: "#fff" },
              }}
            >
              {icon}
            </Box>
          </Stack>

          {/* Value */}
          <Typography
            sx={{
              fontSize: "2rem", fontWeight: 900, color: COLORS.textPrimary,
              lineHeight: 1.1, mb: 0.5,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {prefix}{typeof value === "number" ? value.toLocaleString("en-IN") : value}{suffix}
          </Typography>

          {/* Sub-value + trend */}
          <Stack direction="row" spacing={1} alignItems="center">
            {subValue && (
              <Typography sx={{ fontSize: "0.73rem", color: COLORS.textSecondary }}>{subValue}</Typography>
            )}
            {trend && trendLabel && (
              <Stack direction="row" spacing={0.4} alignItems="center"
                sx={{
                  px: 0.75, py: 0.2, borderRadius: 1.5,
                  bgcolor: alpha(trendColor, 0.1),
                }}>
                <TrendIcon sx={{ fontSize: 13, color: trendColor }} />
                <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: trendColor }}>
                  {trendLabel}
                </Typography>
              </Stack>
            )}
          </Stack>

          {/* Bottom accent bar */}
          <Box
            sx={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: 3,
              background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.3)})`,
              borderRadius: "0 0 12px 12px",
            }}
          />
        </>
      )}
    </Box>
  );
}
