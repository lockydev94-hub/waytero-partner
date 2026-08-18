// ============================================================
// SETTINGS SECTION CARD — Reusable premium card container
// ============================================================
import { Box, Typography, Divider, alpha } from "@mui/material";
import { COLORS } from "../../../theme";

interface Props {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  iconColor?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export default function SettingsSectionCard({ icon, title, subtitle, iconColor = COLORS.gold, children, action }: Props) {
  return (
    <Box
      sx={{
        bgcolor: COLORS.bgCard,
        borderRadius: 3.5,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 2px 12px rgba(10,22,40,0.05)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3, py: 2.5,
          background: `linear-gradient(135deg, ${alpha(iconColor, 0.06)} 0%, ${alpha(iconColor, 0.02)} 100%)`,
          borderBottom: `1px solid ${alpha(iconColor, 0.12)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
          <Box
            sx={{
              width: 42, height: 42, borderRadius: 2.5, flexShrink: 0,
              background: `linear-gradient(135deg, ${iconColor}, ${alpha(iconColor, 0.7)})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 14px ${alpha(iconColor, 0.3)}`,
              "& svg": { fontSize: 20, color: "#fff" },
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "0.975rem", color: COLORS.textPrimary, lineHeight: 1.2 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary, mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>

      {/* Body */}
      <Box sx={{ p: 3 }}>
        {children}
      </Box>
    </Box>
  );
}
