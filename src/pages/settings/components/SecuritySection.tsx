// ============================================================
// SECURITY SECTION — Change Password
// POST /auth/change-password
// Body: { current_password, new_password }
// ============================================================
import { useState } from "react";
import {
  Box, TextField, Button, Alert, Stack, Typography,
  LinearProgress, alpha, InputAdornment, IconButton,
} from "@mui/material";
import {
  Lock, Visibility, VisibilityOff, CheckCircle, Shield,
  Warning,
} from "@mui/icons-material";
import { useMutation } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { settingsService } from "../../../services/settings.service";
import { COLORS } from "../../../theme";
import SettingsSectionCard from "./SettingsSectionCard";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", pass: password.length >= 8 },
    { label: "Uppercase letter", pass: /[A-Z]/.test(password) },
    { label: "Lowercase letter", pass: /[a-z]/.test(password) },
    { label: "Number", pass: /\d/.test(password) },
    { label: "Special character", pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const passed = checks.filter((c) => c.pass).length;
  const strength = passed <= 1 ? "Weak" : passed <= 3 ? "Fair" : passed === 4 ? "Good" : "Strong";
  const color = passed <= 1 ? COLORS.error : passed <= 3 ? COLORS.warning : passed === 4 ? COLORS.info : COLORS.success;
  const pct = (passed / 5) * 100;

  if (!password) return null;
  return (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Typography sx={{ fontSize: "0.72rem", color: COLORS.textSecondary }}>Password strength</Typography>
        <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color }}>{strength}</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 5, borderRadius: 3, bgcolor: alpha(color, 0.12),
          "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 },
        }}
      />
      <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1 }}>
        {checks.map((c) => (
          <Stack key={c.label} direction="row" spacing={0.4} alignItems="center">
            <CheckCircle sx={{ fontSize: 11, color: c.pass ? COLORS.success : alpha(COLORS.textSecondary, 0.4) }} />
            <Typography sx={{ fontSize: "0.68rem", color: c.pass ? COLORS.success : alpha(COLORS.textSecondary, 0.5) }}>
              {c.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export default function SecuritySection() {
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      settingsService.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      }),
    onSuccess: () => {
      enqueueSnackbar("Password changed successfully", { variant: "success" });
      setForm({ current_password: "", new_password: "", confirm_password: "" });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    },
    onError: (err: any) => {
      enqueueSnackbar(err?.response?.data?.detail ?? "Password change failed", { variant: "error" });
    },
  });

  const mismatch = !!form.confirm_password && form.new_password !== form.confirm_password;
  const canSubmit = !!(form.current_password && form.new_password && form.confirm_password && !mismatch && form.new_password.length >= 8);

  return (
    <SettingsSectionCard
      icon={<Shield />}
      title="Security"
      subtitle="Change your login password"
      iconColor="#6366F1"
    >
      {success && (
        <Alert
          severity="success" icon={<CheckCircle />}
          sx={{ mb: 2.5, borderRadius: 2.5, border: `1px solid ${alpha(COLORS.success, 0.2)}` }}
        >
          Password updated. Use your new password next time you sign in.
        </Alert>
      )}

      <Stack spacing={2} sx={{ maxWidth: 440 }}>
        {/* Current password */}
        <TextField
          fullWidth size="small" label="Current Password" type={show.current ? "text" : "password"}
          value={form.current_password}
          onChange={(e) => setForm((f) => ({ ...f, current_password: e.target.value }))}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setShow((s) => ({ ...s, current: !s.current }))}>
                  {show.current ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* New password */}
        <Box>
          <TextField
            fullWidth size="small" label="New Password" type={show.next ? "text" : "password"}
            value={form.new_password}
            onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShow((s) => ({ ...s, next: !s.next }))}>
                    {show.next ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <PasswordStrength password={form.new_password} />
        </Box>

        {/* Confirm password */}
        <TextField
          fullWidth size="small" label="Confirm New Password" type={show.confirm ? "text" : "password"}
          value={form.confirm_password}
          onChange={(e) => setForm((f) => ({ ...f, confirm_password: e.target.value }))}
          error={mismatch}
          helperText={mismatch ? "Passwords don't match" : ""}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}>
                  {show.confirm ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          variant="contained"
          disabled={!canSubmit || mutation.isPending}
          onClick={() => mutation.mutate()}
          startIcon={mutation.isPending ? undefined : <Lock sx={{ fontSize: 16 }} />}
          sx={{
            alignSelf: "flex-start", borderRadius: 2.5, fontWeight: 700,
            background: `linear-gradient(135deg, #6366F1, #4F46E5)`,
            color: "#fff", px: 3,
            "&:hover": { background: `linear-gradient(135deg, #4F46E5, #3730A3)` },
          }}
        >
          {mutation.isPending ? "Changing password…" : "Change Password"}
        </Button>
      </Stack>

      {/* Security tip */}
      <Box
        sx={{
          mt: 3, p: 1.75, borderRadius: 2.5,
          bgcolor: alpha("#6366F1", 0.05),
          border: `1px solid ${alpha("#6366F1", 0.12)}`,
          display: "flex", gap: 1.25, alignItems: "flex-start",
        }}
      >
        <Warning sx={{ fontSize: 15, color: "#6366F1", mt: 0.1, flexShrink: 0 }} />
        <Typography sx={{ fontSize: "0.73rem", color: COLORS.textSecondary, lineHeight: 1.6 }}>
          After changing your password you'll remain signed in on this device. Other active sessions will be invalidated on next use.
        </Typography>
      </Box>
    </SettingsSectionCard>
  );
}
