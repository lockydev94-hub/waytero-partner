// ============================================================
// WAYTERO PARTNER PORTAL — SETTINGS PAGE
// Doc Ref: Frontend Architecture §34 Profile Management
//          Partner API §me (GET/PATCH)
//          Auth API §change-password
//
// Sections:
//   1. Business Profile   (PATCH /partners/me)
//   2. Security           (POST /auth/change-password)
//   3. Bank Account       (POST /partners/me/bank-accounts)
//   4. GST & Tax          (POST /partners/me/gst)
//   5. Active Services    (read-only, from profile)
// ============================================================
import { useState, useEffect } from "react";
import {
  Box, Typography, Stack, Grid, Skeleton, Alert,
  Tabs, Tab, alpha, Avatar, useMediaQuery, useTheme,
  Chip,
} from "@mui/material";
import {
  Business, Shield, AccountBalance, Receipt,
  DirectionsCar, SettingsOutlined,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { settingsService, CommissionInfo } from "../../services/settings.service";
import { useGstEnabled } from "../../hooks/useGstEnabled";
import { COLORS } from "../../theme";

import BusinessProfileSection from "./components/BusinessProfileSection";
import SecuritySection from "./components/SecuritySection";
import DashboardLockSection from "./components/DashboardLockSection";
import BankAccountSection from "./components/BankAccountSection";
import GSTSection from "./components/GSTSection";
import ServicesSection from "./components/ServicesSection";

// ── Tab definitions ───────────────────────────────────────────

const TABS = [
  { label: "Business",  icon: <Business sx={{ fontSize: 17 }} />,        id: "profile" },
  { label: "Security",  icon: <Shield sx={{ fontSize: 17 }} />,          id: "security" },
  { label: "Banking",   icon: <AccountBalance sx={{ fontSize: 17 }} />,  id: "banking" },
  { label: "GST & Tax", icon: <Receipt sx={{ fontSize: 17 }} />,         id: "gst" },
  { label: "Services",  icon: <DirectionsCar sx={{ fontSize: 17 }} />,   id: "services" },
];

// ── Account health badge ──────────────────────────────────────

function ProfileCompletion({ profile }: { profile: any }) {
  if (!profile) return null;
  const checks = [
    !!profile.business_name,
    !!profile.email,
    !!profile.office_address_line_1,
    (profile.bank_accounts?.length ?? 0) > 0,
    !!profile.gst_details,
    (profile.documents?.length ?? 0) > 0,
  ];
  const done = checks.filter(Boolean).length;
  const pct = Math.round((done / checks.length) * 100);
  const color = pct >= 90 ? COLORS.success : pct >= 60 ? COLORS.gold : COLORS.error;

  return (
    <Box
      sx={{
        px: 2.5, py: 2, borderRadius: 2.5,
        background: `linear-gradient(135deg, ${alpha(color, 0.08)}, ${alpha(color, 0.02)})`,
        border: `1px solid ${alpha(color, 0.2)}`,
        display: "flex", alignItems: "center", gap: 2.5,
      }}
    >
      {/* Circular progress indicator */}
      <Box sx={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
        <svg width="52" height="52" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="26" cy="26" r="22" fill="none" stroke={alpha(color, 0.15)} strokeWidth="4" />
          <circle
            cx="26" cy="26" r="22" fill="none"
            stroke={color} strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 22}`}
            strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <Typography
          sx={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.72rem", fontWeight: 800, color,
          }}
        >
          {pct}%
        </Typography>
      </Box>
      <Box flex={1}>
        <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: COLORS.textPrimary }}>
          Profile {pct >= 90 ? "complete" : "incomplete"}
        </Typography>
        <Typography sx={{ fontSize: "0.73rem", color: COLORS.textSecondary, mt: 0.25 }}>
          {done} of {checks.length} steps done
          {pct < 90 && " — complete your profile to unlock full features"}
        </Typography>
      </Box>
    </Box>
  );
}

// ── Main SettingsPage ─────────────────────────────────────────

export default function SettingsPage() {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  const [activeTab, setActiveTab] = useState(0);
  const { isGstEnabled } = useGstEnabled();

  // Tax-related settings are hidden while the platform GST switch is off
  // (same flag that hides the GST Challan sidebar entry).
  const visibleTabs = isGstEnabled ? TABS : TABS.filter((t) => t.id !== "gst");

  // If the current tab was the hidden GST tab, fall back to the first one.
  useEffect(() => {
    if (activeTab >= visibleTabs.length) setActiveTab(0);
  }, [activeTab, visibleTabs.length]);

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["partner-settings-profile"],
    queryFn: () => settingsService.getProfile(),
    staleTime: 60 * 1000,
  });

  // Commission group + per-service rates — shown in the Services tab.
  const { data: commission } = useQuery<CommissionInfo>({
    queryKey: ["partner-settings-commission"],
    queryFn: () => settingsService.getCommission(),
    staleTime: 60 * 1000,
  });

  return (
    <Box>
      {/* ── Page header ──────────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 0.5 }}>
          <Box
            sx={{
              width: 44, height: 44, borderRadius: 2.5,
              background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyMid})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 14px ${alpha(COLORS.navy, 0.3)}`,
            }}
          >
            <SettingsOutlined sx={{ color: COLORS.gold, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.35rem", color: COLORS.textPrimary, lineHeight: 1.15 }}>
              Settings
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: COLORS.textSecondary }}>
              Manage your business profile, security, and account details
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* ── Profile completion banner ─────────────────────────── */}
      {!isLoading && profile && (
        <Box sx={{ mb: 3 }}>
          <ProfileCompletion profile={profile} />
        </Box>
      )}

      {/* ── Error state ───────────────────────────────────────── */}
      {isError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2.5 }}>
          Failed to load profile. Please refresh and try again.
        </Alert>
      )}

      {/* ── Layout: sidebar tabs + content ───────────────────── */}
      <Grid container spacing={3} alignItems="flex-start">
        {/* Sidebar / top-tabs navigation */}
        <Grid item xs={12} md={3}>
          <Box
            sx={{
              bgcolor: COLORS.bgCard,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(10,22,40,0.04)",
            }}
          >
            {/* Partner identity mini */}
            {isLoading ? (
              <Box sx={{ p: 2.5 }}>
                <Skeleton variant="circular" width={48} height={48} sx={{ mb: 1 }} />
                <Skeleton width="70%" height={16} sx={{ mb: 0.5 }} />
                <Skeleton width="50%" height={13} />
              </Box>
            ) : profile ? (
              <Box
                sx={{
                  p: 2.5,
                  borderBottom: `1px solid ${COLORS.border}`,
                  background: `linear-gradient(135deg, ${alpha(COLORS.navy, 0.04)}, transparent)`,
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    src={profile.logo_url ?? undefined}
                    sx={{
                      width: 44, height: 44, fontWeight: 900, fontSize: "1rem",
                      background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
                      color: "#000", flexShrink: 0,
                    }}
                  >
                    {(profile.business_name ?? profile.owner_name ?? "P").charAt(0).toUpperCase()}
                  </Avatar>
                  <Box minWidth={0}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: COLORS.textPrimary }} noWrap>
                      {profile.business_name ?? profile.owner_name}
                    </Typography>
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
                      <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary, fontFamily: "monospace" }}>
                        {profile.partner_code}
                      </Typography>
                      <Chip
                        label={profile.status}
                        size="small"
                        sx={{
                          height: 16, fontSize: "0.6rem", fontWeight: 700,
                          bgcolor: alpha(profile.status === "ACTIVE" ? COLORS.success : COLORS.warning, 0.12),
                          color: profile.status === "ACTIVE" ? COLORS.success : COLORS.warning,
                        }}
                      />
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            ) : null}

            {/* Navigation tabs */}
            <Tabs
              orientation={isMobile ? "horizontal" : "vertical"}
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              scrollButtons="auto"
              variant={isMobile ? "scrollable" : "standard"}
              sx={{
                "& .MuiTabs-indicator": {
                  left: isMobile ? undefined : 0,
                  right: isMobile ? 0 : undefined,
                  width: isMobile ? undefined : 3,
                  height: isMobile ? 3 : undefined,
                  bgcolor: COLORS.gold,
                  borderRadius: 4,
                },
                "& .MuiTab-root": {
                  alignItems: isMobile ? "center" : "flex-start",
                  textAlign: "left",
                  minHeight: 48,
                  px: 2.5,
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  color: COLORS.textSecondary,
                  textTransform: "none",
                  transition: "all 0.15s",
                  "&.Mui-selected": {
                    color: COLORS.textPrimary,
                    fontWeight: 700,
                    bgcolor: alpha(COLORS.gold, 0.07),
                  },
                  "&:hover": {
                    bgcolor: alpha(COLORS.bgMain, 0.8),
                    color: COLORS.textPrimary,
                  },
                },
              }}
            >
              {visibleTabs.map((t) => (
                <Tab
                  key={t.id}
                  label={
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      {t.icon}
                      <span>{t.label}</span>
                    </Stack>
                  }
                />
              ))}
            </Tabs>
          </Box>
        </Grid>

        {/* Content area */}
        <Grid item xs={12} md={9}>
          {isLoading ? (
            <Stack spacing={2}>
              {[200, 280, 180].map((h, i) => (
                <Skeleton key={i} variant="rectangular" height={h} sx={{ borderRadius: 3 }} />
              ))}
            </Stack>
          ) : profile ? (
            <Box>
              {visibleTabs[activeTab]?.id === "profile" && <BusinessProfileSection profile={profile} />}
              {visibleTabs[activeTab]?.id === "security" && (
                <Stack spacing={3}>
                  <DashboardLockSection />
                  <SecuritySection />
                </Stack>
              )}
              {visibleTabs[activeTab]?.id === "banking" && <BankAccountSection bankAccounts={profile.bank_accounts ?? []} />}
              {visibleTabs[activeTab]?.id === "gst" && <GSTSection gstDetails={profile.gst_details ?? null} />}
              {visibleTabs[activeTab]?.id === "services" && <ServicesSection services={profile.services ?? []} commission={commission ?? null} />}
            </Box>
          ) : !isError ? (
            <Box
              sx={{
                p: 5, textAlign: "center", borderRadius: 3,
                bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`,
              }}
            >
              <Typography color="text.secondary">No profile data available.</Typography>
            </Box>
          ) : null}
        </Grid>
      </Grid>
    </Box>
  );
}
