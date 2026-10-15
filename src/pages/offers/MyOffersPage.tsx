// ============================================================
// WAYTERO PARTNER PORTAL — MY OFFERS PAGE
// Route: /dashboard/offers  (HOTEL or TOUR partners)
//
// Lists the hero offers that include this partner's listings.
// Per hotel the partner can toggle which room types stay in the
// offer (at least one must remain — enforced here and server-side)
// and can request to exit an offer; the admin approves or rejects
// the request in the Offers CMS.
// ============================================================
import { useState } from "react";
import {
  Alert, Avatar, Box, Button, Checkbox, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControlLabel, Grid, Paper, Skeleton, Stack, TextField, Typography, alpha,
} from "@mui/material";
import { LocalOffer, Logout } from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { COLORS } from "../../theme";
import {
  partnerOfferService,
  type MyOffer,
  type OfferLink,
} from "../../services/offer.service";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function ExitRequestDialog({
  open, title, submitting, onClose, onSubmit,
}: {
  open: boolean;
  title: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onClose={() => !submitting && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Request to exit</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {title} will be removed from this offer once the admin approves your request.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={2}
          label="Reason for leaving"
          placeholder="e.g. Discounted rates are below our cost for these rooms"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={submitting}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={submitting || reason.trim().length < 5}
          startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <Logout />}
          onClick={() => onSubmit(reason.trim())}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          {submitting ? "Sending…" : "Send Request"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function OfferCard({ offer }: { offer: MyOffer }) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [exitTarget, setExitTarget] = useState<OfferLink | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["partner-offers"] });

  const roomToggle = useMutation({
    mutationFn: ({ hotelId, ids }: { hotelId: number; ids: number[] }) =>
      partnerOfferService.setRoomTypes(offer.offer_id, hotelId, ids),
    onSuccess: () => {
      enqueueSnackbar("Room types updated", { variant: "success" });
      invalidate();
    },
    onError: (e: any) =>
      enqueueSnackbar(e?.response?.data?.message ?? "Failed to update room types", { variant: "error" }),
  });

  const exitRequest = useMutation({
    mutationFn: ({ link, reason }: { link: OfferLink; reason: string }) =>
      link.kind === "hotel"
        ? partnerOfferService.requestHotelExit(offer.offer_id, link.id, reason)
        : partnerOfferService.requestTourExit(offer.offer_id, link.id, reason),
    onSuccess: () => {
      enqueueSnackbar("Exit request sent — awaiting admin approval", { variant: "success" });
      setExitTarget(null);
      invalidate();
    },
    onError: (e: any) =>
      enqueueSnackbar(e?.response?.data?.message ?? "Failed to send exit request", { variant: "error" }),
  });

  const onRoomToggle = (link: OfferLink, roomId: number, checked: boolean) => {
    const current = (link.room_types ?? []).filter((r) => r.included).map((r) => r.id);
    const next = checked ? [...current, roomId] : current.filter((id) => id !== roomId);
    if (next.length === 0) {
      enqueueSnackbar("At least one room type must stay in the offer", { variant: "warning" });
      return;
    }
    roomToggle.mutate({ hotelId: link.id, ids: next });
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5, borderRadius: 3, border: `1px solid ${COLORS.border}`,
        bgcolor: COLORS.bgCard,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Avatar
          src={offer.image_url}
          variant="circular"
          sx={{
            width: 52, height: 52, border: `2px solid ${alpha(COLORS.gold, 0.5)}`,
            bgcolor: "#EDE9FE",
          }}
        >
          <LocalOffer sx={{ color: "#7C3AED" }} />
        </Avatar>
        <Box flex={1} minWidth={0}>
          <Typography fontWeight={800} color={COLORS.textPrimary} noWrap>
            {offer.title}
          </Typography>
          <Typography variant="caption" color={COLORS.textSecondary}>
            {fmtDate(offer.valid_from)} → {fmtDate(offer.valid_to)}
          </Typography>
        </Box>
        <Stack spacing={0.75} alignItems="flex-end">
          <Chip size="small" label={`Coupon ${offer.coupon_code}`} sx={{ fontFamily: "monospace", fontWeight: 700 }} />
          {!offer.is_published && (
            <Chip size="small" color="default" label="Not live yet" variant="outlined" />
          )}
        </Stack>
      </Stack>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        {offer.links.map((link) => (
          <Grid item xs={12} md={offer.links.length > 1 ? 6 : 12} key={`${link.kind}-${link.id}`}>
            <Paper
              variant="outlined"
              sx={{ p: 2, borderRadius: 2, height: "100%", bgcolor: alpha(COLORS.bgMain, 0.5) }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Box flex={1} minWidth={0}>
                  <Typography variant="caption" color={COLORS.textSecondary} display="block">
                    {link.kind === "hotel" ? "Hotel" : "Tour Package"}
                  </Typography>
                  <Typography fontWeight={700} color={COLORS.textPrimary} noWrap>
                    {link.name}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  color={link.status === "ACTIVE" ? "success" : "warning"}
                  label={link.status === "ACTIVE" ? "Active" : "Exit requested"}
                  variant="outlined"
                />
              </Stack>

              {link.status === "EXIT_REQUESTED" ? (
                <Alert severity="info" sx={{ borderRadius: 2, fontSize: 13 }}>
                  Exit requested {link.exit_requested_at ? fmtDate(link.exit_requested_at) : ""}.
                  {link.exit_reason ? ` Reason: ${link.exit_reason}` : ""} Waiting for admin approval.
                </Alert>
              ) : link.kind === "hotel" ? (
                <>
                  <Typography variant="caption" color={COLORS.textSecondary} display="block" sx={{ mb: 0.5 }}>
                    Room types in this offer (at least one must stay)
                  </Typography>
                  {(link.room_types ?? []).map((rt) => (
                    <FormControlLabel
                      key={rt.id}
                      control={
                        <Checkbox
                          size="small"
                          checked={rt.included}
                          disabled={roomToggle.isPending}
                          onChange={(e) => onRoomToggle(link, rt.id, e.target.checked)}
                        />
                      }
                      label={<Typography fontSize={13}>{rt.name}</Typography>}
                      sx={{ display: "block", m: 0 }}
                    />
                  ))}
                  {(link.room_types ?? []).length === 0 && (
                    <Typography variant="caption" color={COLORS.textSecondary}>
                      No active room categories on this hotel yet.
                    </Typography>
                  )}
                </>
              ) : null}

              {link.status === "ACTIVE" && (
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  startIcon={<Logout sx={{ fontSize: 16 }} />}
                  sx={{ mt: 1.5, borderRadius: 2, fontWeight: 700 }}
                  onClick={() => setExitTarget(link)}
                >
                  Request to exit
                </Button>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      <ExitRequestDialog
        open={!!exitTarget}
        title={exitTarget?.name ?? ""}
        submitting={exitRequest.isPending}
        onClose={() => setExitTarget(null)}
        onSubmit={(reason) => exitTarget && exitRequest.mutate({ link: exitTarget, reason })}
      />
    </Paper>
  );
}

export default function MyOffersPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["partner-offers"],
    queryFn: () => partnerOfferService.list(),
    staleTime: 30_000,
  });

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} color={COLORS.textPrimary} sx={{ mb: 0.5 }}>
        My Offers
      </Typography>
      <Typography variant="body2" color={COLORS.textSecondary} sx={{ mb: 3 }}>
        Promotional offers on the WayTero homepage that include your listings. Guests booking
        through an offer get the linked coupon applied automatically.
      </Typography>

      {isError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          Could not load your offers. Refresh to try again.
        </Alert>
      )}

      {isLoading ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={160} />
          <Skeleton variant="rounded" height={160} />
        </Stack>
      ) : (data?.length ?? 0) === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 3, bgcolor: COLORS.bgCard }}>
          <LocalOffer sx={{ fontSize: 40, color: COLORS.textSecondary, opacity: 0.4 }} />
          <Typography sx={{ mt: 1, color: COLORS.textSecondary }}>
            No offers include your listings yet. The WayTero team creates offers and invites
            hotels/packages into them from the admin portal.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2.5}>
          {data!.map((offer) => (
            <OfferCard key={offer.offer_id} offer={offer} />
          ))}
        </Stack>
      )}
    </Box>
  );
}
