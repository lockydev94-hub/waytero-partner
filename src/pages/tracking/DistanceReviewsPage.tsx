// ============================================================
// WAYTERO PARTNER PORTAL — DISTANCE REVIEWS
// Completed trips where the odometer and map distance disagree.
// GET  /partners/me/distance-reviews
// POST /partners/me/distance-reviews/:reviewId/resolve
// ============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, alpha, Avatar, Box, Button, Card, Chip, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, FormControl,
  FormControlLabel, IconButton, Radio, RadioGroup,
  Skeleton, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from "@mui/material";
import {
  ArrowForwardIos, CheckCircle, DoneAll, OpenInNew,
  Refresh, Rule, Straighten, WarningAmber,
} from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  trackingService,
  type DistanceReview,
  type DistanceReviewStatus,
} from "../../services/tracking.service";
import { COLORS } from "../../theme";

const TABS: Array<{ value: DistanceReviewStatus; label: string }> = [
  { value: "PENDING_REVIEW", label: "Needs Review" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "ALL", label: "All" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_REVIEW: { label: "Needs review", color: COLORS.warning },
  ACCEPTED: { label: "Accepted", color: COLORS.success },
  REVIEWED: { label: "Reviewed", color: COLORS.info },
};

function apiError(error: any): string {
  return (
    error?.response?.data?.detail ??
    error?.response?.data?.message ??
    error?.message ??
    "Something went wrong."
  );
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtKm(value: number): string {
  return `${value.toFixed(2)} km`;
}

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: COLORS.textSecondary };
  return (
    <Chip
      size="small"
      label={cfg.label}
      sx={{
        height: 22, fontSize: "0.67rem", fontWeight: 800,
        color: cfg.color, bgcolor: alpha(cfg.color, 0.1),
        border: `1px solid ${alpha(cfg.color, 0.28)}`,
      }}
    />
  );
}

function ReviewDialog({
  review, open, busy, error, onClose, onResolve,
}: {
  review: DistanceReview | null;
  open: boolean;
  busy: boolean;
  error: string;
  onClose: () => void;
  onResolve: (status: "ACCEPTED" | "REVIEWED", note: string) => void;
}) {
  const [status, setStatus] = useState<"ACCEPTED" | "REVIEWED">("ACCEPTED");
  const [note, setNote] = useState("");

  if (!review) return null;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Box sx={{
            width: 38, height: 38, borderRadius: 2,
            bgcolor: alpha(COLORS.warning, 0.1), color: COLORS.warning,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Straighten />
          </Box>
          <Box>
            <Typography fontWeight={800} fontSize="1rem">
              Resolve distance review
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {review.booking_number} · {review.driver_name}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Box sx={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1, p: 1.75, mb: 1,
          bgcolor: COLORS.bgMain, borderRadius: 2,
          border: `1px solid ${COLORS.border}`,
        }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Odometer</Typography>
            <Typography fontWeight={800} fontSize="0.9rem">{fmtKm(review.odometer_km)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Map / GPS</Typography>
            <Typography fontWeight={800} fontSize="0.9rem">{fmtKm(review.gps_km)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Difference</Typography>
            <Typography fontWeight={800} fontSize="0.9rem" color={COLORS.error}>
              {fmtKm(review.difference_km)}
            </Typography>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Odometer and map distance differ by{" "}
          <strong>{review.difference_km.toFixed(2)} km ({review.difference_pct.toFixed(1)}%)</strong>.
          Accept the driver’s reading if the trip was legitimate, or mark it reviewed
          if you need to follow up.
        </Alert>

        <FormControl sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.5 }}>
            Outcome
          </Typography>
          <RadioGroup
            row
            value={status}
            onChange={(event) => setStatus(event.target.value as "ACCEPTED" | "REVIEWED")}
          >
            <FormControlLabel
              value="ACCEPTED"
              control={<Radio size="small" />}
              label="Accept the distance"
            />
            <FormControlLabel
              value="REVIEWED"
              control={<Radio size="small" />}
              label="Mark as reviewed"
            />
          </RadioGroup>
        </FormControl>

        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={5}
          label="Note (optional)"
          placeholder="e.g. Customer waiting time explains the gap"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          inputProps={{ maxLength: 1000 }}
        />

        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button
          variant="contained"
          disabled={busy}
          onClick={() => onResolve(status, note.trim())}
          startIcon={status === "ACCEPTED" ? <CheckCircle /> : <DoneAll />}
        >
          {busy ? "Saving…" : status === "ACCEPTED" ? "Accept distance" : "Mark reviewed"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ReviewRow({
  review, onResolve, onOpenBooking,
}: {
  review: DistanceReview;
  onResolve: () => void;
  onOpenBooking: () => void;
}) {
  const pending = review.status === "PENDING_REVIEW";
  return (
    <Box sx={{
      p: 2, borderBottom: `1px solid ${COLORS.border}`,
      borderLeft: `3px solid ${pending ? COLORS.warning : "transparent"}`,
      "&:hover": { bgcolor: alpha(COLORS.gold, 0.025) },
    }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 1.5, md: 2 }}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <Box sx={{ minWidth: { md: 190 } }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ fontSize: "0.8rem", fontWeight: 800, fontFamily: "monospace" }}>
              {review.booking_number}
            </Typography>
            <StatusChip status={review.status} />
          </Stack>
          <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary, mt: 0.2 }}>
            Ended {fmtDate(review.trip_ended_at ?? review.created_at)}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: { md: 175 } }}>
          <Avatar sx={{
            width: 30, height: 30, fontSize: "0.7rem", fontWeight: 800,
            bgcolor: alpha(COLORS.navy, 0.08), color: COLORS.navy,
          }}>
            {review.driver_name?.[0]?.toUpperCase() ?? "D"}
          </Avatar>
          <Box minWidth={0}>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 700 }} noWrap>
              {review.driver_name}
            </Typography>
            <Typography sx={{ fontSize: "0.66rem", color: COLORS.textSecondary }} noWrap>
              {review.driver_code}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1,
          flex: 1, minWidth: 230,
        }}>
          <Box>
            <Typography sx={{ fontSize: "0.63rem", color: COLORS.textSecondary }}>ODOMETER</Typography>
            <Typography sx={{ fontSize: "0.8rem", fontWeight: 800 }}>{fmtKm(review.odometer_km)}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: "0.63rem", color: COLORS.textSecondary }}>MAP</Typography>
            <Typography sx={{ fontSize: "0.8rem", fontWeight: 800 }}>{fmtKm(review.gps_km)}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: "0.63rem", color: COLORS.textSecondary }}>DIFF</Typography>
            <Typography sx={{ fontSize: "0.8rem", fontWeight: 900, color: COLORS.error }}>
              {review.difference_pct.toFixed(1)}%
            </Typography>
          </Box>
        </Box>

        {review.review_note && (
          <Typography sx={{
            fontSize: "0.7rem", color: COLORS.textSecondary,
            maxWidth: { md: 200 }, fontStyle: "italic",
          }}>
            “{review.review_note}”
          </Typography>
        )}

        <Stack direction="row" spacing={0.5} sx={{ ml: { md: "auto" } }}>
          <Tooltip title="Open booking">
            <IconButton size="small" onClick={onOpenBooking}>
              <OpenInNew sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
          {pending && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Rule />}
              onClick={onResolve}
              sx={{ whiteSpace: "nowrap", fontSize: "0.72rem" }}
            >
              Resolve
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

export default function DistanceReviewsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState<DistanceReviewStatus>("PENDING_REVIEW");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DistanceReview | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [success, setSuccess] = useState("");

  const reviewsQ = useQuery({
    queryKey: ["distance-reviews", status, page],
    queryFn: () => trackingService.listDistanceReviews({ status, page, limit: 20 }),
  });

  const resolveMut = useMutation({
    mutationFn: ({ review, outcome, note }: {
      review: DistanceReview;
      outcome: "ACCEPTED" | "REVIEWED";
      note: string;
    }) => trackingService.resolveDistanceReview(review.id, {
      status: outcome,
      note: note || null,
    }),
    onSuccess: (_result, variables) => {
      setSelected(null);
      setDialogError("");
      setSuccess(
        `${variables.review.booking_number} marked ${variables.outcome === "ACCEPTED" ? "accepted" : "reviewed"}.`,
      );
      qc.invalidateQueries({ queryKey: ["distance-reviews"] });
      qc.invalidateQueries({ queryKey: ["live-location"] });
    },
    onError: (error) => setDialogError(apiError(error)),
  });

  const items = reviewsQ.data?.items ?? [];
  const hasNext = items.length === 20;

  const openResolve = (review: DistanceReview) => {
    setDialogError("");
    setSuccess("");
    setSelected(review);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ mb: 2 }}>
        <Box flex={1}>
          <Typography variant="h5" fontWeight={900} lineHeight={1.2}>
            Distance Reviews
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Trips where the driver’s odometer and the map distance disagreed.
          </Typography>
        </Box>
        <Tooltip title="Refresh reviews">
          <IconButton
            onClick={() => reviewsQ.refetch()}
            sx={{ bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
          >
            <Refresh />
          </IconButton>
        </Tooltip>
      </Stack>

      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Card sx={{ overflow: "hidden" }}>
        <Box sx={{ borderBottom: `1px solid ${COLORS.border}`, px: { xs: 1, sm: 2 } }}>
          <Tabs
            value={status}
            onChange={(_event, value: DistanceReviewStatus) => {
              setStatus(value);
              setPage(1);
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            {TABS.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                sx={{ fontWeight: 700, fontSize: "0.8rem", textTransform: "none" }}
              />
            ))}
          </Tabs>
        </Box>

        {reviewsQ.isLoading ? (
          <Stack spacing={1} sx={{ p: 2 }}>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={64} />)}
          </Stack>
        ) : reviewsQ.isError ? (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{apiError(reviewsQ.error)}</Alert>
          </Box>
        ) : items.length === 0 ? (
          <Stack alignItems="center" spacing={1.2} sx={{ py: 8, px: 3, textAlign: "center" }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: "50%",
              bgcolor: alpha(COLORS.success, 0.1), color: COLORS.success,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <CheckCircle sx={{ fontSize: 32 }} />
            </Box>
            <Typography fontWeight={800}>
              {status === "PENDING_REVIEW" ? "No reviews waiting" : "Nothing here"}
            </Typography>
            <Typography variant="body2" color="text.secondary" maxWidth={380}>
              {status === "PENDING_REVIEW"
                ? "Completed trips with a material odometer-vs-map gap will appear here for review."
                : "No distance reviews match this filter."}
            </Typography>
          </Stack>
        ) : (
          <>
            <Box sx={{ px: 2, py: 1.2, bgcolor: COLORS.bgMain, borderBottom: `1px solid ${COLORS.border}` }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <WarningAmber sx={{ fontSize: 16, color: COLORS.warning }} />
                <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
                  A review is created when the gap is at least 3 km and 10%. The trip is already complete.
                </Typography>
              </Stack>
            </Box>

            <Box>
              {items.map((review) => (
                <ReviewRow
                  key={review.id}
                  review={review}
                  onResolve={() => openResolve(review)}
                  onOpenBooking={() => navigate(`/dashboard/bookings/${review.booking_number}`)}
                />
              ))}
            </Box>

            <Divider />
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2 }}>
              <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>
                Page {page} · {items.length} review{items.length === 1 ? "" : "s"}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="small"
                  disabled={!hasNext}
                  onClick={() => setPage((current) => current + 1)}
                  endIcon={<ArrowForwardIos sx={{ fontSize: "12px !important" }} />}
                >
                  Next
                </Button>
              </Stack>
            </Stack>
          </>
        )}
      </Card>

      <ReviewDialog
        key={selected?.id ?? "none"}
        review={selected}
        open={Boolean(selected)}
        busy={resolveMut.isPending}
        error={dialogError}
        onClose={() => {
          if (!resolveMut.isPending) setSelected(null);
        }}
        onResolve={(outcome, note) => {
          if (selected) resolveMut.mutate({ review: selected, outcome, note });
        }}
      />
    </Box>
  );
}
