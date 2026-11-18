// ============================================================
// WAYTERO PARTNER — DASHBOARD LOCK (Settings → Security)
// One place for the partner's own MPIN and idle window. The PIN is optional:
// with one set, inactivity locks the dashboard and the PIN opens it again;
// with none, inactivity signs the partner out (there is nothing to unlock).
//
// Changing the gate always proves ownership first — account password, or an
// OTP to the registered mobile for an OTP-only partner.
// ============================================================
import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Divider, FormControl, FormHelperText, Grid,
  IconButton, InputAdornment, InputLabel, MenuItem, OutlinedInput,
  Stack, TextField, Typography, alpha,
} from "@mui/material";
import {
  Lock, Visibility, VisibilityOff, Send, Shield,
} from "@mui/icons-material";
import { mpinService } from "../../../services/mpin.service";
import { apiErrorMessage } from "../../../utils/apiError";
import { useLockStore } from "../../../stores/lockStore";
import { useAuthStore } from "../../../store/authStore";
import { COLORS } from "../../../theme";
import type { SessionConfig } from "../../../types/auth";
import SettingsSectionCard from "./SettingsSectionCard";

const IDLE_CHOICES = [1, 2, 3, 5, 10, 15, 30];

function PinField({
  label, value, onChange, numeric = true, maxLength = numeric ? 12 : 128,
  helperText, disabled = false, error = false,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  numeric?: boolean;
  maxLength?: number;
  helperText?: string;
  disabled?: boolean;
  error?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <FormControl fullWidth size="small" error={error} disabled={disabled}>
      <InputLabel shrink>{label}</InputLabel>
      <OutlinedInput
        label={label}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) =>
          onChange(
            numeric
              ? e.target.value.replace(/\D/g, "").slice(0, maxLength)
              : e.target.value.slice(0, maxLength)
          )
        }
        inputProps={{ inputMode: numeric ? "numeric" : "text", autoComplete: "off" }}
        endAdornment={
          <InputAdornment position="end">
            <IconButton
              size="small"
              edge="end"
              aria-label={show ? "Hide" : "Show"}
              onClick={() => setShow((v) => !v)}
            >
              {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </InputAdornment>
        }
      />
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}

export default function DashboardLockSection() {
  const storeConfig = useLockStore((s) => s.sessionConfig);
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [config, setConfig] = useState<SessionConfig | null>(storeConfig);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Settings can be opened before the shell's first policy fetch resolves.
  useEffect(() => {
    if (storeConfig) {
      setConfig(storeConfig);
      return;
    }
    let cancelled = false;
    mpinService
      .getSessionConfig()
      .then((next) => {
        if (cancelled) return;
        setConfig(next);
        useLockStore.getState().setSessionConfig(next);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [storeConfig]);

  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [currentPin, setCurrentPin] = useState("");
  const [changedNew, setChangedNew] = useState("");
  const [changedConfirm, setChangedConfirm] = useState("");
  const [removeProof, setRemoveProof] = useState("");

  const [idleValue, setIdleValue] = useState<number | "">("");

  const minLength = config?.mpin_min_length ?? 6;
  const hasMpin = Boolean(config?.has_mpin);
  const hasPassword = config?.has_password ?? true;
  const defaultMinutes = config?.idle_default_minutes ?? 5;
  const ownIdle = config?.idle_lock_minutes ?? null;
  const idleChoices = IDLE_CHOICES.filter(
    (m) => m <= defaultMinutes || m === ownIdle
  ).sort((a, b) => a - b);

  useEffect(() => {
    setIdleValue(ownIdle ?? "");
  }, [ownIdle]);

  function apply(next: SessionConfig, done: string) {
    setConfig(next);
    useLockStore.getState().setSessionConfig(next);
    if (user) updateUser({ ...user, must_set_mpin: !next.has_mpin });
    setSuccess(done);
    setError(null);
    setNewPin("");
    setConfirmPin("");
    setPassword("");
    setOtp("");
    setOtpSent(false);
    setCurrentPin("");
    setChangedNew("");
    setChangedConfirm("");
    setRemoveProof("");
  }

  async function run(action: () => Promise<SessionConfig>, done: string, fallback: string) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      apply(await action(), done);
    } catch (err) {
      setError(apiErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    setBusy(true);
    setError(null);
    try {
      await mpinService.sendMpinOtp();
      setOtpSent(true);
      setSuccess("OTP sent to your registered mobile.");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not send the OTP."));
    } finally {
      setBusy(false);
    }
  }

  const canSet =
    newPin.length >= minLength &&
    newPin === confirmPin &&
    (hasPassword ? password.length > 0 : otp.length > 0);

  const canChange =
    currentPin.length >= minLength &&
    changedNew.length >= minLength &&
    changedNew === changedConfirm;

  const canRemove = hasPassword
    ? removeProof.length > 0
    : removeProof.length >= minLength;

  const idleChanged = (idleValue === "" ? null : idleValue) !== ownIdle;

  return (
    <SettingsSectionCard
      icon={<Shield />}
      title="Dashboard lock"
      subtitle="Unlock PIN, idle timing and this session's 12-hour limit"
      iconColor="#6366F1"
    >
      {config?.session_expires_at && (
        <Alert
          severity="info"
          sx={{ mb: 2.5, borderRadius: 2.5, fontSize: "0.78rem" }}
          icon={<Lock fontSize="small" />}
        >
          This session ends at{" "}
          <strong>{new Date(config.session_expires_at).toLocaleString()}</strong>{" "}
          (12-hour maximum). You will need to sign in again.
        </Alert>
      )}

      {!hasMpin && config && (
        <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2.5, fontSize: "0.78rem" }}>
          No unlock PIN is set. After {config.idle_minutes} minute
          {config.idle_minutes === 1 ? "" : "s"} of inactivity the portal signs
          you out instead of locking. Set a PIN to keep your place.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

      <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1.5, color: COLORS.textPrimary }}>
        {hasMpin ? "Change unlock PIN" : "Set unlock PIN"}
      </Typography>

      {!hasMpin ? (
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              () =>
                mpinService.setMpin({
                  mpin: newPin,
                  confirm_mpin: confirmPin,
                  ...(hasPassword ? { current_password: password } : { otp }),
                }),
              "Unlock PIN set. Idle now locks instead of signing you out.",
              "Could not set the PIN."
            );
          }}
        >
          <Grid container spacing={2} sx={{ maxWidth: 760 }}>
            <Grid item xs={12} sm={6}>
              <PinField
                label={`New PIN (${minLength}-12 digits)`}
                value={newPin}
                onChange={setNewPin}
                disabled={busy}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <PinField
                label="Confirm new PIN"
                value={confirmPin}
                onChange={setConfirmPin}
                disabled={busy}
                error={confirmPin.length > 0 && confirmPin !== newPin}
                helperText={
                  confirmPin.length > 0 && confirmPin !== newPin
                    ? "The two PINs do not match."
                    : undefined
                }
              />
            </Grid>
            {hasPassword ? (
              <Grid item xs={12} sm={6}>
                <PinField
                  label="Account password"
                  value={password}
                  onChange={setPassword}
                  numeric={false}
                  disabled={busy}
                  helperText="Required because the PIN becomes the gate on this account."
                />
              </Grid>
            ) : (
              <Grid item xs={12} sm={6}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Box flex={1}>
                    <PinField
                      label="OTP from your mobile"
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={busy || !otpSent}
                      helperText="This account signs in with OTP, so there is no password to confirm."
                    />
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Send fontSize="small" />}
                    disabled={busy}
                    onClick={() => void sendOtp()}
                    sx={{ mt: 0.5, whiteSpace: "nowrap" }}
                  >
                    {otpSent ? "Resend" : "Send OTP"}
                  </Button>
                </Stack>
              </Grid>
            )}
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                disabled={busy || !canSet}
                startIcon={<Lock fontSize="small" />}
              >
                Set MPIN
              </Button>
            </Grid>
          </Grid>
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ maxWidth: 760 }}>
          <Grid item xs={12} sm={4}>
            <PinField
              label="Current PIN"
              value={currentPin}
              onChange={setCurrentPin}
              disabled={busy}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <PinField
              label="New PIN"
              value={changedNew}
              onChange={setChangedNew}
              disabled={busy}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <PinField
              label="Confirm new PIN"
              value={changedConfirm}
              onChange={setChangedConfirm}
              disabled={busy}
              error={changedConfirm.length > 0 && changedConfirm !== changedNew}
            />
          </Grid>
          <Grid item xs={12}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button
                variant="contained"
                disabled={busy || !canChange}
                onClick={() =>
                  void run(
                    () =>
                      mpinService.changeMpin({
                        current_mpin: currentPin,
                        new_mpin: changedNew,
                        confirm_mpin: changedConfirm,
                      }),
                    "Unlock PIN changed.",
                    "Could not change the PIN."
                  )
                }
              >
                Change MPIN
              </Button>
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mt: 1, color: COLORS.textPrimary }}>
              Turn off the lock
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary, mt: 0.5, mb: 1.5 }}>
              Removing the PIN means inactivity signs you out instead of locking.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="flex-start">
              <Box sx={{ maxWidth: 340, width: "100%" }}>
                <PinField
                  label={hasPassword ? "Account password" : "Current PIN"}
                  value={removeProof}
                  onChange={setRemoveProof}
                  numeric={!hasPassword}
                  disabled={busy}
                />
              </Box>
              <Button
                color="error"
                variant="outlined"
                disabled={busy || !canRemove}
                onClick={() =>
                  void run(
                    () =>
                      mpinService.removeMpin(
                        hasPassword
                          ? { current_password: removeProof }
                          : { current_mpin: removeProof }
                      ),
                    "Unlock PIN removed. Idle now signs you out.",
                    "Could not remove the PIN."
                  )
                }
                sx={{ mt: 0.5 }}
              >
                Remove MPIN
              </Button>
            </Stack>
          </Grid>
        </Grid>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: COLORS.textPrimary }}>
        Lock after inactivity
      </Typography>
      <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary, mt: 0.5, mb: 2 }}>
        Mouse movement, scrolling, typing and taps reset this window. Reading
        without input does not.
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
        <TextField
          select
          size="small"
          label="Idle window"
          value={idleValue}
          onChange={(e) =>
            setIdleValue(e.target.value === "" ? "" : Number(e.target.value))
          }
          sx={{ minWidth: 260 }}
          disabled={busy}
          helperText={
            ownIdle === null
              ? `Platform default: ${defaultMinutes} minute${defaultMinutes === 1 ? "" : "s"}.`
              : `Your setting: ${ownIdle} minute${ownIdle === 1 ? "" : "s"}.`
          }
        >
          <MenuItem value="">Platform default ({defaultMinutes} min)</MenuItem>
          {idleChoices.map((m) => (
            <MenuItem key={m} value={m}>
              {m} minute{m === 1 ? "" : "s"}
              {m > defaultMinutes ? " (your saved setting)" : ""}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          disabled={busy || !idleChanged}
          onClick={() =>
            void run(
              () =>
                mpinService.setIdleLockMinutes(idleValue === "" ? null : idleValue),
              "Idle lock updated.",
              "Could not save the idle lock."
            )
          }
          sx={{ mt: 0.5 }}
        >
          Save timing
        </Button>
      </Stack>
      <Typography sx={{ fontSize: "0.7rem", color: alpha(COLORS.textSecondary, 0.9), mt: 1.5 }}>
        You can make the lock sooner than the platform default, never later.
      </Typography>
    </SettingsSectionCard>
  );
}
