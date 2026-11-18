// ============================================================
// WAYTERO PARTNER — LOCK SCREEN
// The idle gate. The session underneath stays valid: verifying the MPIN makes
// no token call and returns the partner to the page they were on.
// ============================================================
import { useRef, useState } from "react";
import {
  Box, Button, CircularProgress, Dialog, DialogContent, IconButton,
  OutlinedInput, Stack, Typography,
} from "@mui/material";
import { Lock as LockIcon, Visibility, VisibilityOff } from "@mui/icons-material";
import type { AxiosError } from "axios";
import { mpinService } from "../../services/mpin.service";
import { authService } from "../../services/auth.service";
import { clearSession, TOKEN_KEYS } from "../../services/api";
import { useLockStore } from "../../stores/lockStore";
import { postPartnerSessionMessage } from "../../hooks/usePartnerSessionChannel";
import { useCountdown } from "../../hooks/useCountdown";
import { COLORS } from "../../theme";

interface ErrorBody {
  success?: boolean;
  message?: string;
  code?: string;
  errors?: { attempts_remaining?: number; locked_until?: string };
}

export default function LockScreen() {
  const config = useLockStore((s) => s.sessionConfig);
  const lockedAt = useLockStore((s) => s.lockedAt);

  const [mpin, setMpin] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(
    config?.mpin_attempts_remaining ?? null
  );
  const [lockedUntil, setLockedUntil] = useState<string | null>(
    config?.mpin_locked_until ?? null
  );
  const lockout = useCountdown(lockedUntil);
  const inputRef = useRef<HTMLInputElement>(null);

  const minLength = config?.mpin_min_length ?? 6;
  const locked = !lockout.expired && lockedUntil !== null;

  async function submit() {
    if (busy || locked) return;
    setBusy(true);
    setError(null);
    try {
      await mpinService.verifyMpin(mpin);
      useLockStore.getState().unlock();
      postPartnerSessionMessage({ type: "unlock" });
    } catch (err) {
      const body = (err as AxiosError<ErrorBody>)?.response?.data;
      const details = body?.errors ?? {};
      if (body?.code === "MPIN_LOCKED" && details.locked_until) {
        setLockedUntil(details.locked_until);
        setError(null);
      } else if (body?.code === "MPIN_INVALID") {
        setAttemptsLeft(details.attempts_remaining ?? null);
        setError(body.message || "Unlock PIN is incorrect.");
      } else if (body?.code === "MPIN_NOT_SET") {
        useLockStore.getState().unlock();
        postPartnerSessionMessage({ type: "unlock" });
      } else {
        setError(
          body?.message ||
            "Could not reach the server. Check the connection and try again."
        );
      }
      setMpin("");
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  async function logoutInstead() {
    try {
      const refresh = localStorage.getItem(TOKEN_KEYS.REFRESH);
      if (refresh) await authService.logout(refresh);
    } catch {
      /* already expired server-side — the local clear is what matters */
    }
    clearSession("/login");
  }

  return (
    <Dialog
      open
      fullScreen
      disableEscapeKeyDown
      disableRestoreFocus
      slotProps={{
        backdrop: { sx: { backgroundColor: "rgba(6, 13, 26, 0.97)" } },
        paper: {
          sx: {
            m: 0, maxWidth: "100%", height: "100vh",
            bgcolor: COLORS.navy, color: "#fff",
          },
        },
      }}
    >
      <DialogContent
        sx={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 2, height: "100%",
        }}
      >
        <Box
          sx={{
            width: 64, height: 64, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            bgcolor: "rgba(212,175,55,0.16)", mb: 1,
          }}
        >
          <LockIcon sx={{ fontSize: 30, color: COLORS.gold }} />
        </Box>

        <Typography variant="h5" fontWeight={700}>
          Partner dashboard locked
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "rgba(255,255,255,0.7)", textAlign: "center", maxWidth: 420 }}
        >
          {lockedAt
            ? `Inactive since ${new Date(lockedAt).toLocaleTimeString()}. Enter your unlock PIN to continue — your session is still open.`
            : "Enter your unlock PIN to continue — your session is still open."}
        </Typography>

        <Box
          component="form"
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
          sx={{ width: 320, maxWidth: "90vw", mt: 1 }}
        >
          <Stack spacing={1.5}>
            <Box sx={{ position: "relative" }}>
              <OutlinedInput
                inputRef={inputRef}
                autoFocus
                type={show ? "text" : "password"}
                value={mpin}
                onChange={(e) =>
                  setMpin(e.target.value.replace(/\D/g, "").slice(0, 12))
                }
                placeholder={`${minLength}-digit unlock PIN`}
                disabled={busy || locked}
                fullWidth
                slotProps={{
                  input: {
                    inputMode: "numeric",
                    autoComplete: "off",
                    sx: {
                      textAlign: "center", letterSpacing: "0.4em",
                      fontSize: 20, color: "#fff",
                    },
                  },
                }}
              />
              <IconButton
                size="small"
                onClick={() => setShow((v) => !v)}
                sx={{
                  position: "absolute", right: 6, top: "50%",
                  transform: "translateY(-50%)", color: "rgba(255,255,255,0.6)",
                }}
              >
                {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </Box>

            {error && (
              <Typography variant="body2" color="error" sx={{ textAlign: "center" }}>
                {error}
                {attemptsLeft !== null && attemptsLeft > 0
                  ? ` ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`
                  : ""}
              </Typography>
            )}

            {locked ? (
              <Typography variant="body2" sx={{ color: "#FFB4B4", textAlign: "center" }}>
                Too many wrong PINs. Try again in {lockout.minutes}:
                {String(lockout.seconds).padStart(2, "0")}.
              </Typography>
            ) : (
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={busy || mpin.length < minLength}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                Unlock
              </Button>
            )}
          </Stack>
        </Box>

        <Button
          onClick={() => void logoutInstead()}
          size="small"
          sx={{ color: "rgba(255,255,255,0.65)", mt: 1 }}
        >
          Logout instead
        </Button>
      </DialogContent>
    </Dialog>
  );
}
