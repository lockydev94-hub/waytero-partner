// ============================================================
// WAYTERO PARTNER — PENDING CANCELLATION REQUESTS BANNER
// Doc Ref: BRD Part 3 §46
// Surfaces the partner's pending cancellation requests on every bookings
// page so the partner can see admin's decision without leaving the list.
// ============================================================
import { useState } from "react";
import {
  Alert, Stack, Typography, Button, Chip, Box, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
} from "@mui/material";
import { Cancel, HourglassBottom, CheckCircle, Block, ExpandMore, ExpandLess } from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { partnerCancellationService, PartnerCancelRequest } from "../../../services/cancellation.service";

const STATUS_COLORS: Record<string, "default" | "warning" | "success" | "error"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  WITHDRAWN: "default",
  AUTO_CLOSED: "default",
};

export default function PartnerCancellationRequestsBanner() {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const query = useQuery<PartnerCancelRequest[]>({
    queryKey: ["my-cancel-requests"],
    queryFn: () => partnerCancellationService.listMy(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const withdraw = useMutation({
    mutationFn: (id: number) => partnerCancellationService.withdraw(id, "Withdrawn by partner"),
    onSuccess: () => {
      enqueueSnackbar("Request withdrawn.", { variant: "info" });
      qc.invalidateQueries({ queryKey: ["my-cancel-requests"] });
    },
    onError: (e: any) => enqueueSnackbar(e?.response?.data?.detail || "Withdraw failed", { variant: "error" }),
  });

  if (!query.data || query.data.length === 0) return null;
  const pending = query.data.filter(r => r.status === "PENDING");
  const history = query.data.filter(r => r.status !== "PENDING");

  return (
    <Box mb={2}>
      {pending.length > 0 && (
        <Alert
          severity="warning"
          icon={<HourglassBottom />}
          sx={{ borderRadius: 2, mb: 1 }}
          action={
            <Button size="small" startIcon={expanded ? <ExpandLess /> : <ExpandMore />} onClick={() => setExpanded(!expanded)}>
              {expanded ? "Hide" : "Show"} details
            </Button>
          }
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography variant="subtitle2" fontWeight={700}>
              You have {pending.length} pending cancellation request{pending.length > 1 ? "s" : ""} awaiting admin review.
            </Typography>
          </Stack>
          {expanded && (
            <Stack gap={1.5} mt={1.5}>
              {pending.map(r => (
                <Box key={r.id} p={1.5} bgcolor="background.paper" borderRadius={1.5} border="1px solid" borderColor="divider">
                  <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Chip size="small" color={STATUS_COLORS[r.status]} label={r.status} />
                      <Typography variant="body2" fontWeight={600}>
                        {r.cab_booking_number || r.hotel_reservation_number || `Request #${r.id}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({r.booking_type})
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" gap={1}>
                      {r.refund_preview_json && (
                        <Typography variant="caption" color="success.main" fontWeight={700}>
                          Refund preview: ₹{Number(r.refund_preview_json.refund_amount).toLocaleString()}
                        </Typography>
                      )}
                      <Button
                        size="small" color="inherit"
                        onClick={() => withdraw.mutate(r.id)}
                        disabled={withdraw.isPending}
                      >
                        Withdraw
                      </Button>
                    </Stack>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Reason: {r.requested_reason}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Alert>
      )}

      {history.length > 0 && expanded && (
        <Alert severity="info" icon={<CheckCircle />} sx={{ borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            Recent decisions
          </Typography>
          <Stack gap={1}>
            {history.slice(0, 5).map(r => (
              <Box key={r.id} p={1} bgcolor="background.paper" borderRadius={1.5} border="1px solid" borderColor="divider">
                <Stack direction="row" alignItems="center" gap={1}>
                  {r.status === "APPROVED" ? <CheckCircle fontSize="small" color="success" /> : <Block fontSize="small" color="error" />}
                  <Chip size="small" color={STATUS_COLORS[r.status]} label={r.status} />
                  <Typography variant="body2" fontWeight={600}>
                    {r.cab_booking_number || r.hotel_reservation_number || `Request #${r.id}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                    {new Date(r.requested_at).toLocaleDateString()}
                  </Typography>
                </Stack>
                {r.review_note && (
                  <Typography variant="caption" color="text.secondary">Admin note: {r.review_note}</Typography>
                )}
              </Box>
            ))}
          </Stack>
        </Alert>
      )}
    </Box>
  );
}
