// ============================================================
// WAYTERO PARTNER PORTAL — NOTIFICATIONS PAGE (Coming Soon)
// Note: Notification engine is Phase 15+ (DB table not yet built).
// Shows a premium coming-soon with feature preview cards.
// ============================================================
import { Box, Typography, Stack, alpha, Chip, Grid } from "@mui/material";
import {
  Notifications, AccessTime, BookOnline, AccountBalanceWallet,
  DirectionsCar, Campaign, CheckCircle,
} from "@mui/icons-material";
import { COLORS } from "../../theme";

const UPCOMING_FEATURES = [
  {
    icon: <BookOnline sx={{ fontSize: 20 }} />,
    title: "New Booking Alerts",
    desc: "Instant alerts when a new booking is assigned to your fleet.",
    color: COLORS.info,
  },
  {
    icon: <AccountBalanceWallet sx={{ fontSize: 20 }} />,
    title: "Payment & Settlement",
    desc: "Get notified when a payout is credited or a settlement is processed.",
    color: COLORS.success,
  },
  {
    icon: <DirectionsCar sx={{ fontSize: 20 }} />,
    title: "Vehicle Status Updates",
    desc: "Alerts for vehicle approval, rejection, and document expiry.",
    color: COLORS.gold,
  },
  {
    icon: <Campaign sx={{ fontSize: 20 }} />,
    title: "Platform Announcements",
    desc: "Important updates, policy changes, and feature launches from WayTero.",
    color: "#8B5CF6",
  },
];

export default function NotificationsPage() {
  return (
    <Box>
      {/* Page header */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
        <Box sx={{
          width: 42, height: 42, borderRadius: 2.5,
          background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyMid})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 14px ${alpha(COLORS.navy, 0.3)}`,
        }}>
          <Notifications sx={{ fontSize: 22, color: COLORS.gold }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", color: COLORS.textPrimary, lineHeight: 1.1 }}>
            Notifications
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>
            Alerts, updates, and system messages
          </Typography>
        </Box>
      </Stack>

      {/* Coming soon hero */}
      <Box sx={{
        bgcolor: COLORS.bgCard,
        borderRadius: 4,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 4px 24px rgba(10,22,40,0.07)",
        p: { xs: 4, md: 6 },
        textAlign: "center",
        mb: 4,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background glow */}
        <Box sx={{
          position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
          width: 320, height: 320, borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(COLORS.gold, 0.08)} 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        {/* Icon */}
        <Box sx={{
          width: 80, height: 80, borderRadius: 4, mx: "auto", mb: 3,
          background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyMid})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 12px 32px ${alpha(COLORS.navy, 0.25)}`,
        }}>
          <Notifications sx={{ fontSize: 38, color: COLORS.gold }} />
        </Box>

        <Chip
          icon={<AccessTime sx={{ fontSize: 14 }} />}
          label="Coming Soon"
          sx={{
            fontSize: "0.75rem", fontWeight: 700, height: 28, mb: 2.5,
            bgcolor: alpha(COLORS.gold, 0.12),
            color: COLORS.gold,
            border: `1px solid ${alpha(COLORS.gold, 0.3)}`,
            "& .MuiChip-icon": { color: COLORS.gold },
          }}
        />

        <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.6rem", md: "2rem" }, color: COLORS.textPrimary, lineHeight: 1.15, mb: 1.5 }}>
          Smart Notifications
          <br />
          <Box component="span" sx={{ color: COLORS.gold }}>Coming Your Way</Box>
        </Typography>

        <Typography sx={{
          fontSize: "0.92rem", color: COLORS.textSecondary,
          maxWidth: 440, mx: "auto", lineHeight: 1.7,
        }}>
          A full in-app notification centre is being built. You'll get real-time alerts for bookings, payments, vehicle updates, and platform announcements — all in one place.
        </Typography>

        {/* Decorative dots */}
        <Stack direction="row" spacing={0.75} justifyContent="center" sx={{ mt: 3 }}>
          {[COLORS.gold, alpha(COLORS.gold, 0.5), alpha(COLORS.gold, 0.25)].map((c, i) => (
            <Box key={i} sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: c }} />
          ))}
        </Stack>
      </Box>

      {/* Upcoming feature cards */}
      <Typography sx={{ fontWeight: 700, fontSize: "0.78rem", color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.8, mb: 2 }}>
        What to Expect
      </Typography>
      <Grid container spacing={2}>
        {UPCOMING_FEATURES.map((f) => (
          <Grid item xs={12} sm={6} key={f.title}>
            <Box sx={{
              bgcolor: COLORS.bgCard,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              boxShadow: "0 2px 8px rgba(10,22,40,0.04)",
              p: 2.5,
              display: "flex", gap: 2, alignItems: "flex-start",
              transition: "box-shadow 0.15s, transform 0.15s",
              "&:hover": { boxShadow: `0 6px 20px ${alpha(f.color, 0.12)}`, transform: "translateY(-2px)" },
            }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: 2, flexShrink: 0,
                background: `linear-gradient(135deg, ${f.color}, ${alpha(f.color, 0.7)})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 4px 12px ${alpha(f.color, 0.3)}`,
                color: "#fff",
              }}>
                {f.icon}
              </Box>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: COLORS.textPrimary }}>
                    {f.title}
                  </Typography>
                  <CheckCircle sx={{ fontSize: 13, color: alpha(COLORS.success, 0.5) }} />
                </Stack>
                <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary, lineHeight: 1.6 }}>
                  {f.desc}
                </Typography>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
