// ============================================================
// BUSINESS PROFILE SECTION
// PATCH /partners/me
// Fields: business_name, owner_name, email, logo_url,
//         office_address_line_1/2, office_postal_code
// ============================================================
import { useState, useEffect } from "react";
import {
  Box, Grid, TextField, Button, Alert, Avatar, Stack,
  Typography, CircularProgress, alpha, Chip,
} from "@mui/material";
import { Business, Save, Edit, Check } from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { settingsService, type ProfileUpdatePayload } from "../../../services/settings.service";
import { COLORS } from "../../../theme";
import SettingsSectionCard from "./SettingsSectionCard";

interface Props {
  profile: any; // PartnerResponse from backend
}

export default function BusinessProfileSection({ profile }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileUpdatePayload>({});

  useEffect(() => {
    if (profile) {
      setForm({
        business_name: profile.business_name ?? "",
        owner_name: profile.owner_name ?? "",
        email: profile.email ?? "",
        office_address_line_1: profile.office_address_line_1 ?? "",
        office_address_line_2: profile.office_address_line_2 ?? "",
        office_postal_code: profile.office_postal_code ?? "",
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: () => settingsService.updateProfile(form),
    onSuccess: () => {
      enqueueSnackbar("Business profile updated", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["partner-settings-profile"] });
      setEditing(false);
    },
    onError: (err: any) => {
      enqueueSnackbar(err?.response?.data?.detail ?? "Update failed", { variant: "error" });
    },
  });

  const set = (key: keyof ProfileUpdatePayload, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const statusColor: Record<string, string> = {
    ACTIVE: COLORS.success,
    PENDING: COLORS.warning,
    SUSPENDED: COLORS.error,
  };

  return (
    <SettingsSectionCard
      icon={<Business />}
      title="Business Profile"
      subtitle="Your business identity shown across WayTero"
      iconColor={COLORS.info}
      action={
        !editing ? (
          <Button
            startIcon={<Edit sx={{ fontSize: 15 }} />}
            onClick={() => setEditing(true)}
            size="small"
            variant="outlined"
            sx={{ borderRadius: 2.5, fontWeight: 700, fontSize: "0.78rem" }}
          >
            Edit
          </Button>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button
              size="small" variant="outlined" color="inherit"
              onClick={() => setEditing(false)}
              sx={{ borderRadius: 2.5, fontWeight: 600, fontSize: "0.78rem" }}
            >
              Cancel
            </Button>
            <Button
              size="small" variant="contained"
              startIcon={mutation.isPending ? <CircularProgress size={13} color="inherit" /> : <Save sx={{ fontSize: 14 }} />}
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              sx={{
                borderRadius: 2.5, fontWeight: 700, fontSize: "0.78rem",
                background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
                color: "#000",
              }}
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </Stack>
        )
      }
    >
      {/* Identity strip */}
      <Box
        sx={{
          display: "flex", alignItems: "center", gap: 2.5, mb: 3,
          p: 2, borderRadius: 2.5,
          background: `linear-gradient(135deg, ${alpha(COLORS.navy, 0.04)}, ${alpha(COLORS.navy, 0.01)})`,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <Avatar
          src={profile?.logo_url ?? undefined}
          sx={{
            width: 58, height: 58, fontWeight: 900, fontSize: "1.3rem",
            background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
            color: "#000", flexShrink: 0,
            boxShadow: `0 4px 16px ${alpha(COLORS.gold, 0.35)}`,
          }}
        >
          {(profile?.business_name ?? profile?.owner_name ?? "P").charAt(0).toUpperCase()}
        </Avatar>
        <Box flex={1} minWidth={0}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: COLORS.textPrimary }} noWrap>
              {profile?.business_name ?? profile?.owner_name ?? "—"}
            </Typography>
            <Chip
              label={profile?.status ?? "—"}
              size="small"
              sx={{
                height: 20, fontSize: "0.68rem", fontWeight: 700, letterSpacing: 0.4,
                bgcolor: alpha(statusColor[profile?.status] ?? COLORS.textSecondary, 0.12),
                color: statusColor[profile?.status] ?? COLORS.textSecondary,
                border: `1px solid ${alpha(statusColor[profile?.status] ?? COLORS.textSecondary, 0.25)}`,
              }}
            />
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ mt: 0.5 }} flexWrap="wrap">
            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>
              {profile?.partner_code}
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>·</Typography>
            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>
              {profile?.partner_type}
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>·</Typography>
            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>
              📱 {profile?.mobile}
            </Typography>
          </Stack>
        </Box>
      </Box>

      {/* Form fields */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth size="small" label="Business Name"
            value={form.business_name ?? ""}
            onChange={(e) => set("business_name", e.target.value)}
            disabled={!editing}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth size="small" label="Owner Name"
            value={form.owner_name ?? ""}
            onChange={(e) => set("owner_name", e.target.value)}
            disabled={!editing}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth size="small" label="Email Address"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            disabled={!editing}
            helperText="Used for notifications and reports"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth size="small" label="Mobile (read-only)"
            value={profile?.mobile ?? ""}
            disabled
            helperText="Contact support to change mobile"
          />
        </Grid>

        {/* Office address */}
        <Grid item xs={12}>
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: COLORS.textSecondary, mb: 1, textTransform: "uppercase", letterSpacing: 0.6 }}>
            Office Address
          </Typography>
        </Grid>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth size="small" label="Address Line 1"
            value={form.office_address_line_1 ?? ""}
            onChange={(e) => set("office_address_line_1", e.target.value)}
            disabled={!editing}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth size="small" label="Postal Code"
            value={form.office_postal_code ?? ""}
            onChange={(e) => set("office_postal_code", e.target.value)}
            disabled={!editing}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth size="small" label="Address Line 2 (optional)"
            value={form.office_address_line_2 ?? ""}
            onChange={(e) => set("office_address_line_2", e.target.value)}
            disabled={!editing}
          />
        </Grid>
      </Grid>
    </SettingsSectionCard>
  );
}
