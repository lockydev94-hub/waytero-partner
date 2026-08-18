// ============================================================
// WAYTERO PARTNER PORTAL — NOTIFICATIONS DROPDOWN
// Doc Ref: BRD Part 7 §155 — Realtime inbox
//
// Bell icon in the topbar. Shows an unread badge, opens a dropdown
// listing the latest 10 inbox items, and a "View all" link to the
// notifications page. The inbox is invalidated automatically by the
// RealtimeContext every time a WS event arrives, so the badge ticks
// up without a manual poll.
// ============================================================

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import {
  Box, IconButton, Tooltip, Menu, MenuItem, Typography,
  Stack, Chip, Badge, Divider, Button, CircularProgress, alpha,
} from "@mui/material";
import {
  NotificationsNone, Circle, CheckCircle, HourglassTop,
  Block, AssignmentInd, DoneAll,
} from "@mui/icons-material";
import { COLORS } from "../../theme";
import { notificationService, type NotificationItem } from "../../services/notification.service";
import { useRealtimeContext } from "../../contexts/RealtimeContext";

const ICONS: Record<string, JSX.Element> = {
  PARTNER_ASSIGNMENT_REQUESTED: <HourglassTop sx={{ fontSize: 16, color: "#F59E0B" }} />,
  BOOKING_PARTNER_RESPONDED: <AssignmentInd sx={{ fontSize: 16, color: "#3B82F6" }} />,
  BOOKING_ADMIN_REFRESH: <CheckCircle sx={{ fontSize: 16, color: "#10B981" }} />,
};

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  } catch {
    return "";
  }
}

export default function NotificationsDropdown() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { inboxVersion } = useRealtimeContext();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // The inbox list — limit to 10 most-recent for the dropdown.
  const inboxQuery = useQuery({
    queryKey: ["partner-notifications", inboxVersion],
    queryFn: () => notificationService.list({ limit: 10, offset: 0 }),
    enabled: open || inboxVersion > 0,
    staleTime: 10_000,
  });

  const unreadQuery = useQuery({
    queryKey: ["partner-notifications-unread", inboxVersion],
    queryFn: () => notificationService.unreadCount(),
    refetchInterval: 60_000,
  });

  const items: NotificationItem[] = useMemo(() => {
    const list = inboxQuery.data?.items ?? [];
    return list;
  }, [inboxQuery.data]);

  const markAllRead = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: (res) => {
      enqueueSnackbar(`${res.marked} marked as read`, { variant: "success" });
      qc.invalidateQueries({ queryKey: ["partner-notifications"] });
      qc.invalidateQueries({ queryKey: ["partner-notifications-unread"] });
    },
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-notifications"] });
      qc.invalidateQueries({ queryKey: ["partner-notifications-unread"] });
    },
  });

  const onItemClick = (n: NotificationItem) => {
    if (!n.read_at) markRead.mutate(n.id);
    if (n.booking_id && (n.data as any)?.cab_booking_number) {
      const bn = (n.data as any).cab_booking_number;
      navigate(`/dashboard/bookings/${bn}`);
      setAnchorEl(null);
    }
  };

  const unreadCount = unreadQuery.data ?? inboxQuery.data?.unread_count ?? 0;

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            color: COLORS.textSecondary,
            "&:hover": { bgcolor: alpha(COLORS.gold, 0.08), color: COLORS.gold },
            transition: "all 0.15s",
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            sx={{
              "& .MuiBadge-badge": {
                fontSize: "0.62rem", height: 16, minWidth: 16, px: 0.5,
                fontWeight: 800,
              },
            }}
          >
            <NotificationsNone sx={{ fontSize: 22 }} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1, borderRadius: 2.5, width: 360,
              boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
              border: `1px solid ${COLORS.border}`,
            },
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${COLORS.border}` }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: COLORS.textPrimary }}>
                Notifications
              </Typography>
              <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary }}>
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </Typography>
            </Box>
            {unreadCount > 0 && (
              <Tooltip title="Mark all as read">
                <IconButton
                  size="small"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  sx={{ color: COLORS.info }}
                >
                  <DoneAll sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Box>

        {/* List */}
        <Box sx={{ maxHeight: 420, overflowY: "auto" }}>
          {inboxQuery.isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={20} />
            </Box>
          ) : items.length === 0 ? (
            <Box sx={{ py: 4, textAlign: "center", px: 2 }}>
              <NotificationsNone
                sx={{ fontSize: 36, color: alpha(COLORS.textSecondary, 0.3), mb: 1 }}
              />
              <Typography sx={{ fontSize: "0.82rem", color: COLORS.textSecondary, mb: 0.5 }}>
                No notifications yet
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: alpha(COLORS.textSecondary, 0.7) }}>
                Cab booking assignments will appear here in real time.
              </Typography>
            </Box>
          ) : (
            items.map((n) => {
              const unread = !n.read_at;
              return (
                <MenuItem
                  key={n.id}
                  onClick={() => onItemClick(n)}
                  sx={{
                    alignItems: "flex-start",
                    px: 2,
                    py: 1.5,
                    gap: 1.5,
                    borderBottom: `1px solid ${alpha(COLORS.border, 0.6)}`,
                    bgcolor: unread ? alpha(COLORS.gold, 0.04) : "transparent",
                    whiteSpace: "normal",
                    "&:hover": { bgcolor: alpha(COLORS.gold, 0.08) },
                  }}
                >
                  <Box sx={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0, mt: 0.25,
                    bgcolor: alpha(COLORS.bgMain, 0.8),
                    border: `1.5px solid ${COLORS.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {ICONS[n.event_type] ?? (
                      <NotificationsNone sx={{ fontSize: 14, color: COLORS.textSecondary }} />
                    )}
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      {unread && (
                        <Circle sx={{ fontSize: 8, color: COLORS.gold, flexShrink: 0 }} />
                      )}
                      <Typography
                        sx={{
                          fontSize: "0.82rem",
                          fontWeight: unread ? 700 : 500,
                          color: COLORS.textPrimary,
                          lineHeight: 1.3,
                        }}
                        noWrap
                      >
                        {n.title}
                      </Typography>
                    </Stack>
                    {n.body && (
                      <Typography
                        sx={{
                          fontSize: "0.72rem", color: COLORS.textSecondary, mt: 0.25,
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {n.body}
                      </Typography>
                    )}
                    <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}>
                      <Typography sx={{ fontSize: "0.65rem", color: alpha(COLORS.textSecondary, 0.7) }}>
                        {relativeTime(n.created_at)}
                      </Typography>
                      {n.delivered_via && n.delivered_via !== "none" && (
                        <Chip
                          label={n.delivered_via.toUpperCase()}
                          size="small"
                          sx={{
                            height: 14, fontSize: "0.55rem", fontWeight: 700,
                            bgcolor: alpha(COLORS.success, 0.12),
                            color: COLORS.success,
                            "& .MuiChip-label": { px: 0.6 },
                          }}
                        />
                      )}
                    </Stack>
                  </Box>
                </MenuItem>
              );
            })
          )}
        </Box>

        <Divider />
        <MenuItem
          onClick={() => { navigate("/dashboard/notifications"); setAnchorEl(null); }}
          sx={{ fontSize: "0.8rem", justifyContent: "center", color: COLORS.info, fontWeight: 600, py: 1.25 }}
        >
          View All Notifications
        </MenuItem>
      </Menu>
    </>
  );
}
