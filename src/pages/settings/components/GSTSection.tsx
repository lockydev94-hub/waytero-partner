// ============================================================
// GST DETAILS SECTION
// POST /partners/me/gst
// Fields: gst_number, pan_number, legal_name, trade_name,
//         registration_date, gst_status
// ============================================================
import { useState } from "react";
import {
  Box, Grid, TextField, Button, Stack, Typography,
  Chip, alpha, CircularProgress, Collapse,
} from "@mui/material";
import { Receipt, Add, CheckCircle } from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { settingsService, type GSTPayload } from "../../../services/settings.service";
import { COLORS } from "../../../theme";
import SettingsSectionCard from "./SettingsSectionCard";

interface Props {
  gstDetails: any | null;
}

const EMPTY: GSTPayload = {
  gst_number: "",
  pan_number: "",
  legal_name: "",
  trade_name: "",
  registration_date: "",
  gst_status: "",
};

export default function GSTSection({ gstDetails }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<GSTPayload>(EMPTY);

  const mutation = useMutation({
    mutationFn: () =>
      settingsService.addGSTDetails({
        ...form,
        registration_date: form.registration_date || undefined,
        gst_status: form.gst_status || undefined,
      }),
    onSuccess: () => {
      enqueueSnackbar("GST details saved", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["partner-settings-profile"] });
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (err: any) => {
      enqueueSnackbar(err?.response?.data?.detail ?? "Failed to save GST details", { variant: "error" });
    },
  });

  const set = (k: keyof GSTPayload, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = !!(form.gst_number.length >= 15);

  return (
    <SettingsSectionCard
      icon={<Receipt />}
      title="GST & Tax Details"
      subtitle="Required for company partners and tax invoicing"
      iconColor="#F97316"
      action={
        !gstDetails ? (
          <Button
            size="small" startIcon={<Add sx={{ fontSize: 15 }} />}
            variant="outlined"
            onClick={() => setOpen((v) => !v)}
            sx={{ borderRadius: 2.5, fontWeight: 700, fontSize: "0.78rem", borderColor: "#F97316", color: "#F97316" }}
          >
            {open ? "Cancel" : "Add GST"}
          </Button>
        ) : null
      }
    >
      {/* Existing GST */}
      {gstDetails ? (
        <Box
          sx={{
            p: 2.5, borderRadius: 2.5,
            border: `1.5px solid ${alpha("#F97316", 0.25)}`,
            bgcolor: alpha("#F97316", 0.03),
          }}
        >
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box
              sx={{
                width: 44, height: 44, borderRadius: 2, flexShrink: 0,
                bgcolor: alpha("#F97316", 0.12),
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Receipt sx={{ color: "#F97316", fontSize: 22 }} />
            </Box>
            <Box flex={1}>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <Typography sx={{ fontWeight: 800, fontSize: "0.95rem", fontFamily: "monospace", color: COLORS.textPrimary }}>
                  {gstDetails.gst_number}
                </Typography>
                {gstDetails.verified_at && (
                  <Chip
                    icon={<CheckCircle sx={{ fontSize: "11px !important" }} />}
                    label="Verified" size="small"
                    sx={{
                      height: 20, fontSize: "0.67rem", fontWeight: 700,
                      bgcolor: alpha(COLORS.success, 0.1), color: COLORS.success,
                      border: `1px solid ${alpha(COLORS.success, 0.25)}`,
                    }}
                  />
                )}
              </Stack>
              <Grid container spacing={1.5} sx={{ mt: 1 }}>
                {[
                  ["Legal Name", gstDetails.legal_name],
                  ["Trade Name", gstDetails.trade_name],
                  ["PAN", gstDetails.pan_number],
                  ["GST Status", gstDetails.gst_status],
                  ["Reg. Date", gstDetails.registration_date],
                ].filter(([, v]) => v).map(([l, v]) => (
                  <Grid item xs={6} key={l as string}>
                    <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary, mb: 0.25 }}>{l}</Typography>
                    <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: COLORS.textPrimary }}>{v}</Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Stack>
        </Box>
      ) : !open ? (
        <Box
          sx={{
            p: 3, textAlign: "center", borderRadius: 2.5,
            border: `2px dashed ${COLORS.border}`,
            bgcolor: alpha(COLORS.bgMain, 0.5),
          }}
        >
          <Receipt sx={{ fontSize: 36, color: alpha(COLORS.textSecondary, 0.3), mb: 1 }} />
          <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: COLORS.textSecondary }}>
            No GST details added
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: alpha(COLORS.textSecondary, 0.7), mt: 0.5 }}>
            Required for GST invoices and business partners
          </Typography>
        </Box>
      ) : null}

      {/* Add GST form */}
      <Collapse in={open}>
        <Box
          sx={{
            mt: gstDetails ? 2 : 0,
            p: 2.5, borderRadius: 2.5,
            border: `1px solid ${alpha("#F97316", 0.2)}`,
            bgcolor: alpha("#F97316", 0.03),
          }}
        >
          <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#F97316", mb: 2 }}>
            GST Registration
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth size="small" label="GSTIN *"
                placeholder="e.g. 29AAACX4786M2Z4"
                value={form.gst_number}
                onChange={(e) => set("gst_number", e.target.value.toUpperCase())}
                inputProps={{ style: { fontFamily: "monospace", fontWeight: 700, letterSpacing: 1 } }}
                helperText="15-character GST Identification Number"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth size="small" label="PAN Number"
                value={form.pan_number}
                onChange={(e) => set("pan_number", e.target.value.toUpperCase())}
                inputProps={{ style: { fontFamily: "monospace", fontWeight: 600 } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Legal Name"
                value={form.legal_name}
                onChange={(e) => set("legal_name", e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Trade Name"
                value={form.trade_name}
                onChange={(e) => set("trade_name", e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Registration Date" type="date"
                InputLabelProps={{ shrink: true }}
                value={form.registration_date}
                onChange={(e) => set("registration_date", e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="GST Status"
                placeholder="e.g. ACTIVE"
                value={form.gst_status}
                onChange={(e) => set("gst_status", e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                disabled={!canSubmit || mutation.isPending}
                onClick={() => mutation.mutate()}
                startIcon={mutation.isPending ? <CircularProgress size={14} color="inherit" /> : <Receipt />}
                sx={{
                  borderRadius: 2.5, fontWeight: 700,
                  background: `linear-gradient(135deg, #F97316, #EA580C)`,
                  color: "#fff",
                }}
              >
                {mutation.isPending ? "Saving…" : "Save GST Details"}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </SettingsSectionCard>
  );
}
