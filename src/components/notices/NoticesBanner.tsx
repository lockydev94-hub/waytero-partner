// ============================================================
// WAYTERO PARTNER — NOTICES BANNER
// Admin-published notices (wallet low balance, driver-assign
// pending, document expiry, policy updates…) rendered as banners
// at the top of the portal. Each banner is clickable — opens a
// dialog with the full notice. "Dismiss" marks it read for this
// partner (stored in partner_notice_reads) so it never returns.
// ============================================================
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box, Typography, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, IconButton, Stack, alpha,
} from "@mui/material";
import {
  Campaign, WarningAmber, ErrorOutline, Info, Close, Check,
} from "@mui/icons-material";
import { COLORS } from "../../theme";
import {
  noticesService, type PartnerNotice,
} from "../../services/notices.service";

const TYPE_LABELS: Record<string, string> = {
  WALLET_LOW_BALANCE: "Wallet low balance",
  BOOKING_ACTION_REQUIRED: "Action required",
  DOCUMENT_EXPIRY: "Document expiry",
  SETTLEMENT: "Settlement",
  POLICY_UPDATE: "Policy update",
  GENERAL_ANNOUNCEMENT: "Announcement",
};

function priorityMeta(p: PartnerNotice["priority"]) {
  switch (p) {
    case "URGENT":
      return { color: "#DC2626", bg: alpha("#DC2626", 0.1), icon: <ErrorOutline sx={{ fontSize: 18 }} /> };
    case "HIGH":
      return { color: "#D97706", bg: alpha("#D97706", 0.1), icon: <WarningAmber sx={{ fontSize: 18 }} /> };
    default:
      return { color: COLORS.info, bg: alpha(COLORS.info, 0.1), icon: <Info sx={{ fontSize: 18 }} /> };
  }
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
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

export default function NoticesBanner() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<PartnerNotice | null>(null);
  const [confirmDismiss, setConfirmDismiss] = useState<PartnerNotice | null>(null);

  const noticesQuery = useQuery({
    queryKey: ["partner-notices"],
    queryFn: () => noticesService.list(),
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => noticesService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partner-notices"] }),
  });

  const unread = noticesQuery.data?.items.filter((n) => !n.read) ?? [];

  if (!unread.length) return null;

  const dismiss = (n: PartnerNotice) => {
    markRead.mutate(n.id);
    setSelected(null);
    setConfirmDismiss(null);
  };

  return (
    <>
      <Box sx={{ px: { xs: 1.5, md: 3 }, pt: 1.5 }}>
        <Stack spacing={1}>
          {unread.map((n) => {
            const meta = priorityMeta(n.priority);
            return (
              <Box
                key={n.id}
                onClick={() => setSelected(n)}
                sx={{
                  display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer",
                  px: 2, py: 1.1, borderRadius: 2,
                  bgcolor: meta.bg, border: `1px solid ${alpha(meta.color, 0.25)}`,
                  transition: "all 0.15s",
                  "&:hover": { boxShadow: `0 4px 14px ${alpha(meta.color, 0.15)}` },
                }}
              >
                <Box sx={{ color: meta.color, display: "flex" }}>{meta.icon}</Box>
                <Box flex={1} minWidth={0}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: meta.color }}>
                      {n.title}
                    </Typography>
                    <Chip
                      label={TYPE_LABELS[n.notice_type] ?? n.notice_type}
                      size="small"
                      sx={{ height: 16, fontSize: "0.58rem", fontWeight: 700, bgcolor: alpha(meta.color, 0.15), color: meta.color, "& .MuiChip-label": { px: 0.7 } }}
                    />
                    <Typography sx={{ fontSize: "0.65rem", color: COLORS.textSecondary }}>
                      {timeAgo(n.created_at)}
                    </Typography>
                  </Stack>
                  {n.body && (
                    <Typography
                      sx={{
                        fontSize: "0.75rem", color: COLORS.textSecondary, mt: 0.25,
                        display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {n.body}
                    </Typography>
                  )}
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); setConfirmDismiss(n); }}
                  sx={{ color: COLORS.textSecondary, "&:hover": { color: meta.color } }}
                >
                  <Close sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* Detail dialog */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        {selected && (
          <>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pr: 8 }}>
              <Campaign sx={{ color: priorityMeta(selected.priority).color }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>{selected.title}</Typography>
                <Chip
                  label={TYPE_LABELS[selected.notice_type] ?? selected.notice_type}
                  size="small"
                  sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: alpha(priorityMeta(selected.priority).color, 0.12), color: priorityMeta(selected.priority).color }}
                />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Typography sx={{ fontSize: "0.85rem", color: COLORS.textSecondary, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                {selected.body || "No additional details were provided with this notice."}
              </Typography>
              <Stack direction="row" spacing={1} mt={2} alignItems="center">
                <Chip label={selected.priority} size="small" sx={{ height: 18, fontSize: "0.6rem", fontWeight: 700 }} />
                <Typography sx={{ fontSize: "0.68rem", color: COLORS.textSecondary }}>
                  Published {selected.created_at ? new Date(selected.created_at).toLocaleString("en-IN") : "—"}
                </Typography>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Check />}
                onClick={() => dismiss(selected)}
              >
                Got it — dismiss
              </Button>
              <Button onClick={() => setSelected(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dismiss confirm */}
      <Dialog open={!!confirmDismiss} onClose={() => setConfirmDismiss(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: "1rem", fontWeight: 800 }}>Dismiss this notice?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.82rem", color: COLORS.textSecondary }}>
            "{confirmDismiss?.title}" will be hidden from your portal. You can still find
            platform announcements in your notification bell.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDismiss(null)}>Cancel</Button>
          <Button color="primary" variant="contained" onClick={() => confirmDismiss && dismiss(confirmDismiss)}>
            Dismiss
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
