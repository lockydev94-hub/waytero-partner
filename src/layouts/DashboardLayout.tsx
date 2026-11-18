// ============================================================
// WAYTERO PARTNER PORTAL — DASHBOARD LAYOUT
// Collapsible sidebar (navy) + advanced top bar (live data)
//
// Topbar live data:
//   - Wallet balance  → from GET /partners/me/dashboard (stale-5min)
//   - Booking badge   → from GET /partners/me/bookings/counts (stale-2min)
//   - Notifications   → Coming Soon (no DB table yet)
// ============================================================
import { useState } from "react";
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton, Avatar,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Tooltip, Badge, Divider, Menu, MenuItem, alpha, useMediaQuery,
  useTheme, Skeleton, Stack, Chip,
} from "@mui/material";
import {
  Dashboard, DirectionsCar, Hotel, TravelExplore, BookOnline,
  AccountBalanceWallet, Analytics, Settings, Notifications, SwapHoriz,
  ChevronLeft, ChevronRight, Menu as MenuIcon, Logout, Person,
  KeyboardArrowDown, Payments, NotificationsNone, Circle, Receipt,
  MeetingRoom, LocalOffer, GpsFixed, Straighten,
} from "@mui/icons-material";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { authService } from "../services/auth.service";
import { TOKEN_KEYS } from "../services/api";
import { analyticsService } from "../services/analytics.service";
import { topbarService } from "../services/topbar.service";
import { useGstEnabled } from "../hooks/useGstEnabled";
import { usePartnerServices } from "../hooks/usePartnerServices";
import { COLORS } from "../theme";
import { useRealtimeContext } from "../contexts/RealtimeContext";
import AcceptRejectPopup from "../components/bookings/AcceptRejectPopup";
import NotificationsDropdown from "../components/notifications/NotificationsDropdown";
import NoticesBanner from "../components/notices/NoticesBanner";
import NotificationPromptBanner from "../components/notifications/NotificationPromptBanner";
import { GlobalSearch } from "../components/search/GlobalSearch";
import { NAV_SECTIONS, BOTTOM_NAV, NavItem } from "../constants/nav";

const DRAWER_FULL = 256;
const DRAWER_MINI = 72;

const ICON_MAP: Record<string, JSX.Element> = {
  Dashboard: <Dashboard />,
  BookOnline: <BookOnline />,
  Payments: <Payments />,
  DirectionsCar: <DirectionsCar />,
  Hotel: <Hotel />,
  MeetingRoom: <MeetingRoom />,
  SwapHoriz: <SwapHoriz />,
  TravelExplore: <TravelExplore />,
  AccountBalanceWallet: <AccountBalanceWallet />,
  Analytics: <Analytics />,
  Receipt: <Receipt />,
  LocalOffer: <LocalOffer />,
  GpsFixed: <GpsFixed />,
  Straighten: <Straighten />,
  Settings: <Settings />,
};

export default function DashboardLayout() {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, clearAuth } = useAuthStore();
  const { isGstEnabled } = useGstEnabled();
  const { services: partnerServices } = usePartnerServices();

  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [anchorEl,     setAnchorEl]     = useState<null | HTMLElement>(null);

  const drawerWidth = collapsed ? DRAWER_MINI : DRAWER_FULL;
  const menuOpen    = Boolean(anchorEl);

  // ── Live wallet balance (reuse analytics dashboard query) ──
  const { data: dashData, isLoading: walletLoading } = useQuery({
    queryKey: ["topbar-dashboard"],
    queryFn:  () => analyticsService.getDashboard(1),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
  const walletBalance  = dashData?.wallet?.available_balance ?? null;
  const walletStatus   = dashData?.wallet?.wallet_status ?? "";
  const partnerStatus  = dashData?.partner?.status ?? "";

  // ── Live booking counts for sidebar badge ──────────────────
  const { data: bookingCounts } = useQuery({
    queryKey: ["topbar-booking-counts"],
    queryFn:  () => topbarService.getBookingCounts(),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
  const actionableCount = bookingCounts?.actionable ?? 0;

  // ── Service-type + feature-flag gating ─────────────────────
  // The admin assigns CAB / HOTEL / TOUR services when creating the
  // partner; the sidebar only shows menus for services the partner
  // actually has. Service-specific pages are also route-guarded in
  // App.tsx, so direct navigation is blocked too. The GST Challan
  // entry additionally requires the platform-level GST switch (the
  // route is guarded in App.tsx as well).
  // Sections with no visible items (after gating) are dropped.
  const visibleSections = NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.service && !partnerServices.has(item.service)) return false;
        if (item.anyOfServices && !item.anyOfServices.some((s) => partnerServices.has(s))) return false;
        if (item.requiresGst && !isGstEnabled) return false;
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  const visibleNavItems = visibleSections.flatMap((s) => s.items);
  const visibleBottomItems = BOTTOM_NAV.filter((item) =>
    (!item.service || partnerServices.has(item.service)) &&
    (!item.requiresGst || isGstEnabled)
  );

  // ── Helpers ───────────────────────────────────────────────
  const handleLogout = async () => {
    const refreshToken = localStorage.getItem(TOKEN_KEYS.REFRESH) ?? "";
    try { await authService.logout(refreshToken); } catch {}
    clearAuth();
    navigate("/login", { replace: true });
  };

  function isActive(item: NavItem) {
    return item.path === "/dashboard"
      ? location.pathname === item.path
      : location.pathname.startsWith(item.path);
  }

  function currentPageLabel() {
    return visibleNavItems.find(isActive)?.label
      ?? visibleBottomItems.find(isActive)?.label
      ?? (location.pathname.includes("notifications") ? "Notifications" : "Dashboard");
  }

  // ── Sidebar nav item ──────────────────────────────────────
  function NavBtn({ item, onClick }: { item: NavItem; onClick?: () => void }) {
    const active = isActive(item);
    const badge  = item.badgeKey === "actionable" ? actionableCount : 0;

    return (
      <ListItem disablePadding sx={{ mb: 0.5 }}>
        <Tooltip title={collapsed ? item.label : ""} placement="right" arrow>
          <ListItemButton
            onClick={() => { navigate(item.path); onClick?.(); }}
            sx={{
              borderRadius: 2.5, minHeight: 44, px: collapsed ? 1.5 : 2,
              background: active
                ? `linear-gradient(135deg, ${COLORS.gold}22, ${COLORS.goldDark}11)`
                : "transparent",
              border: active ? `1px solid ${alpha(COLORS.gold, 0.3)}` : "1px solid transparent",
              "&:hover": {
                background: active
                  ? `linear-gradient(135deg, ${COLORS.gold}30, ${COLORS.goldDark}18)`
                  : alpha("#fff", 0.06),
              },
            }}
          >
            <ListItemIcon sx={{
              minWidth: collapsed ? 0 : 36,
              mr: collapsed ? 0 : 1,
              color: active ? COLORS.gold : alpha("#fff", 0.55),
              "& svg": { fontSize: 20 },
            }}>
              {badge > 0 ? (
                <Badge
                  badgeContent={badge}
                  color="error"
                  sx={{ "& .MuiBadge-badge": { fontSize: "0.62rem", height: 15, minWidth: 15, px: 0.5 } }}
                >
                  {ICON_MAP[item.icon]}
                </Badge>
              ) : ICON_MAP[item.icon]}
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: "0.875rem",
                  fontWeight: active ? 700 : 500,
                  color: active ? COLORS.gold : alpha("#fff", 0.75),
                }}
              />
            )}
            {/* Inline badge label when expanded */}
            {!collapsed && badge > 0 && (
              <Box sx={{
                ml: "auto",
                px: 0.9, py: 0.1,
                borderRadius: 2,
                bgcolor: COLORS.error,
                minWidth: 20,
                textAlign: "center",
              }}>
                <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, color: "#fff", lineHeight: 1.6 }}>
                  {badge > 99 ? "99+" : badge}
                </Typography>
              </Box>
            )}
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  }

  // ── Sidebar content ───────────────────────────────────────
  const NavContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <Box sx={{
        height: 64, display: "flex", alignItems: "center",
        px: collapsed ? 2 : 3, gap: 1.5, flexShrink: 0,
        borderBottom: `1px solid ${alpha("#fff", 0.08)}`,
      }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 2, flexShrink: 0,
          background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 12px ${alpha(COLORS.gold, 0.4)}`,
        }}>
          <Typography sx={{ color: "#000", fontWeight: 900, fontSize: 16 }}>W</Typography>
        </Box>
        {!collapsed && (
          <Box>
            <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "1rem", lineHeight: 1.1 }}>
              WayTero
            </Typography>
            <Typography sx={{ color: alpha("#fff", 0.45), fontSize: "0.7rem", fontWeight: 500 }}>
              Partner Portal
            </Typography>
          </Box>
        )}
      </Box>

      {/* Main nav — scrolls independently when tall; minHeight 0 is
          required so flex allows it to shrink instead of pushing the
          bottom nav / partner strip off-screen. */}
      <List sx={{
        px: 1.5, py: 1,
        flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 0,
        overflowY: "auto", overflowX: "hidden",
        "&::-webkit-scrollbar": { width: 4 },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        "&::-webkit-scrollbar-thumb": { background: alpha("#fff", 0.2), borderRadius: 4 },
        "&::-webkit-scrollbar-thumb:hover": { background: alpha("#fff", 0.35) },
      }}>
        {visibleSections.map((section) => (
          <Box key={section.key} sx={{ mb: 1 }}>
            {!collapsed && (
              <Typography sx={{
                px: 1, mb: 0.5, mt: 1,
                fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase", color: alpha("#fff", 0.35),
              }}>
                {section.title}
              </Typography>
            )}
            {section.items.map((item) => (
              <NavBtn
                key={item.key}
                item={item}
                onClick={isMobile ? () => setMobileOpen(false) : undefined}
              />
            ))}
          </Box>
        ))}
      </List>

      <Divider sx={{ borderColor: alpha("#fff", 0.08), flexShrink: 0 }} />

      {/* Bottom nav — stays pinned to the bottom */}
      <List sx={{ px: 1.5, py: 1.5, flexShrink: 0 }}>
        {visibleBottomItems.map((item) => (
          <NavBtn key={item.key} item={item} />
        ))}
      </List>

      {/* Partner info strip */}
      {!collapsed && (
        <Box sx={{
          mx: 1.5, mb: 2, p: 1.5, borderRadius: 2.5, flexShrink: 0,
          background: alpha("#fff", 0.05),
          border: `1px solid ${alpha("#fff", 0.08)}`,
        }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box>
              <Typography sx={{ color: alpha("#fff", 0.85), fontSize: "0.8rem", fontWeight: 600 }} noWrap>
                {user?.full_name ?? "Partner"}
              </Typography>
              <Typography sx={{ color: alpha("#fff", 0.4), fontSize: "0.7rem" }} noWrap>
                {user?.email ?? user?.mobile ?? ""}
              </Typography>
            </Box>
            {/* Live status dot */}
            {partnerStatus && (
              <Tooltip title={partnerStatus} placement="top">
                <Circle sx={{
                  fontSize: 9, ml: "auto", flexShrink: 0,
                  color: partnerStatus === "ACTIVE" ? COLORS.success
                       : partnerStatus === "SUSPENDED" || partnerStatus === "BLOCKED" ? COLORS.error
                       : COLORS.warning,
                }} />
              </Tooltip>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: COLORS.bgMain }}>
      {/* Desktop Drawer */}
      {!isMobile && (
        <Box sx={{
          width: drawerWidth, flexShrink: 0,
          transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
          position: "relative",
        }}>
          <Box sx={{
            width: drawerWidth, height: "100vh",
            position: "fixed", top: 0, left: 0,
            bgcolor: COLORS.navy,
            transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
            overflow: "hidden",
            display: "flex", flexDirection: "column",
            zIndex: 1200,
          }}>
            {NavContent}
            <IconButton
              onClick={() => setCollapsed((c) => !c)}
              sx={{
                position: "absolute", bottom: 80, right: -16,
                width: 32, height: 32,
                bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                "&:hover": { bgcolor: COLORS.bgMain },
                zIndex: 10,
              }}
            >
              {collapsed ? <ChevronRight sx={{ fontSize: 18 }} /> : <ChevronLeft sx={{ fontSize: 18 }} />}
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          PaperProps={{ sx: { width: DRAWER_FULL, height: "100%", bgcolor: COLORS.navy, display: "flex", flexDirection: "column" } }}
        >
          {NavContent}
        </Drawer>
      )}

      {/* Main content */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* ── Admin notices (top of every page) ──────────── */}
        <NoticesBanner />

        {/* ── TOP APP BAR ─────────────────────────────────── */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: COLORS.bgCard,
            borderBottom: `1px solid ${COLORS.border}`,
            color: COLORS.textPrimary,
            zIndex: 1100,
          }}
        >
          <Toolbar sx={{ gap: 1, minHeight: "64px !important" }}>
            {isMobile && (
              <IconButton onClick={() => setMobileOpen(true)} size="small" sx={{ mr: 0.5 }}>
                <MenuIcon />
              </IconButton>
            )}

            {/* Page title */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: COLORS.textPrimary, lineHeight: 1.1 }} noWrap>
                {currentPageLabel()}
              </Typography>
              {partnerStatus && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Circle sx={{
                    fontSize: 7,
                    color: partnerStatus === "ACTIVE" ? COLORS.success
                         : partnerStatus === "SUSPENDED" || partnerStatus === "BLOCKED" ? COLORS.error
                         : COLORS.warning,
                  }} />
                  <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary, lineHeight: 1 }}>
                    {partnerStatus === "ACTIVE" ? "Live" : partnerStatus}
                  </Typography>
                </Stack>
              )}
            </Box>

            {/* ── Global page search — type to jump to any page ── */}
            <GlobalSearch />

            {/* ── Actionable bookings pill (desktop) ─────── */}
            {actionableCount > 0 && (
              <Tooltip title={`${actionableCount} booking${actionableCount > 1 ? "s" : ""} need attention`}>
                <Box
                  sx={{
                    display: { xs: "none", md: "flex" }, alignItems: "center", gap: 0.75,
                    px: 1.5, py: 0.6, borderRadius: 2.5, cursor: "pointer",
                    bgcolor: alpha(COLORS.error, 0.08),
                    border: `1px solid ${alpha(COLORS.error, 0.2)}`,
                    transition: "all 0.15s",
                    "&:hover": { bgcolor: alpha(COLORS.error, 0.14) },
                  }}
                  onClick={() => navigate("/dashboard/bookings")}
                >
                  <BookOnline sx={{ fontSize: 14, color: COLORS.error }} />
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: COLORS.error }}>
                    {actionableCount} Pending
                  </Typography>
                </Box>
              </Tooltip>
            )}

            {/* ── Wallet balance ─────────────────────────── */}
            <Tooltip title="Go to Wallet">
              <Box
                sx={{
                  display: { xs: "none", sm: "flex" }, alignItems: "center", gap: 0.75,
                  px: 1.75, py: 0.65, borderRadius: 2.5, cursor: "pointer",
                  background: walletStatus === "ACTIVE"
                    ? `linear-gradient(135deg, ${alpha(COLORS.success, 0.1)}, ${alpha(COLORS.success, 0.05)})`
                    : alpha(COLORS.border, 0.5),
                  border: `1px solid ${alpha(walletStatus === "ACTIVE" ? COLORS.success : COLORS.border, 0.3)}`,
                  transition: "all 0.15s",
                  "&:hover": { boxShadow: `0 4px 12px ${alpha(COLORS.success, 0.15)}` },
                }}
                onClick={() => navigate("/dashboard/wallet")}
              >
                <AccountBalanceWallet sx={{ fontSize: 15, color: walletStatus === "ACTIVE" ? COLORS.success : COLORS.textSecondary }} />
                {walletLoading ? (
                  <Skeleton width={52} height={16} />
                ) : (
                  <Typography sx={{
                    fontSize: "0.82rem", fontWeight: 800,
                    color: walletStatus === "ACTIVE" ? COLORS.success : COLORS.textSecondary,
                  }}>
                    ₹{walletBalance !== null ? walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                  </Typography>
                )}
              </Box>
            </Tooltip>

            {/* ── Notifications bell (Doc Ref: BRD Part 7 §155) ────────── */}
            <NotificationsDropdown />

            {/* ── User avatar menu ───────────────────────── */}
            <Box
              sx={{
                display: "flex", alignItems: "center", gap: 1, cursor: "pointer",
                px: 1, py: 0.5, borderRadius: 2.5,
                "&:hover": { bgcolor: COLORS.bgMain },
                transition: "background 0.15s",
              }}
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              <Avatar
                sx={{
                  width: 34, height: 34, fontSize: "0.82rem", fontWeight: 800,
                  background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
                  color: "#000",
                  boxShadow: `0 2px 8px ${alpha(COLORS.gold, 0.4)}`,
                }}
              >
                {user?.full_name?.[0]?.toUpperCase() ?? "P"}
              </Avatar>
              <Box sx={{ display: { xs: "none", sm: "block" } }}>
                <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1.1 }} noWrap>
                  {user?.full_name?.split(" ")[0] ?? "Partner"}
                </Typography>
                <Typography sx={{ fontSize: "0.67rem", color: COLORS.textSecondary, lineHeight: 1 }}>
                  Partner Account
                </Typography>
              </Box>
              <KeyboardArrowDown sx={{ fontSize: 16, color: COLORS.textSecondary, display: { xs: "none", sm: "block" } }} />
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={() => setAnchorEl(null)}
              PaperProps={{
                sx: {
                  mt: 1, borderRadius: 2.5, boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                  border: `1px solid ${COLORS.border}`, minWidth: 190,
                },
              }}
            >
              {/* User info at top */}
              <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${COLORS.border}` }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: COLORS.textPrimary }}>
                  {user?.full_name ?? "Partner"}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
                  {user?.email ?? user?.mobile ?? ""}
                </Typography>
              </Box>
              <MenuItem onClick={() => { navigate("/dashboard/profile"); setAnchorEl(null); }}>
                <ListItemIcon><Person fontSize="small" /></ListItemIcon>
                My Profile
              </MenuItem>
              <MenuItem onClick={() => { navigate("/dashboard/settings"); setAnchorEl(null); }}>
                <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
                Settings
              </MenuItem>
              <MenuItem onClick={() => { navigate("/dashboard/notifications"); setAnchorEl(null); }}>
                <ListItemIcon><Notifications fontSize="small" /></ListItemIcon>
                Notifications
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: COLORS.error }}>
                <ListItemIcon><Logout fontSize="small" sx={{ color: COLORS.error }} /></ListItemIcon>
                Sign Out
              </MenuItem>
            </Menu>

          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, overflow: "auto" }}>
          {/* ── Notification permission banner (Doc Ref: BRD Part 7 §155) ── */}
          {/* Surfaces a one-click "Enable" button when the browser
              permission is default or denied. Hidden once granted. */}
          <NotificationPromptBanner />
          <Outlet />
        </Box>
      </Box>

      {/* ── Realtime Accept/Reject popup (Doc Ref: BRD Part 7 §155) ── */}
      {/* Mounted once at layout level so the popup appears regardless of
          which dashboard page the partner is on when the WS event fires. */}
      <AcceptRejectPopup />
    </Box>
  );
}
