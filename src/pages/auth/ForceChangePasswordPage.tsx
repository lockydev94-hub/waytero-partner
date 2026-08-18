// ============================================================
// WAYTERO PARTNER PORTAL — FORCE CHANGE PASSWORD PAGE
// Shown when must_change_password = true (first login or admin reset)
// Blocks access to dashboard until completed
// Doc Ref: Auth Flow §6 — Partner first-login password change
// ============================================================
import { useState } from "react";
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  InputAdornment, IconButton, CircularProgress, LinearProgress, alpha,
} from "@mui/material";
import {
  Lock, Visibility, VisibilityOff, CheckCircle, Security,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth.service";
import { useAuthStore } from "../../store/authStore";
import { COLORS } from "../../theme";

// Password strength checker
function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: COLORS.border };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score: 20, label: "Weak", color: COLORS.error };
  if (score === 2) return { score: 40, label: "Fair", color: "#F97316" };
  if (score === 3) return { score: 60, label: "Good", color: COLORS.warning };
  if (score === 4) return { score: 80, label: "Strong", color: "#84CC16" };
  return { score: 100, label: "Very Strong", color: COLORS.success };
}

const REQUIREMENTS = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number (0–9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character (!@#$…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  { label: "Not the default password", test: (p: string) => p !== "Waytero@15" },
];

export default function ForceChangePasswordPage() {
  const navigate = useNavigate();
  const { user, setMustChangePassword } = useAuthStore();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const strength = getStrength(newPassword);
  const allMet = REQUIREMENTS.every((r) => r.test(newPassword));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!allMet) { setError("Password does not meet all requirements"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);
    try {
      const res = await authService.changeFirstPassword(newPassword);
      if (!res.success) throw new Error(res.message || "Failed to change password");
      setSuccess(true);
      setMustChangePassword(false);
      setTimeout(() => navigate("/dashboard", { replace: true }), 1800);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 60%, ${COLORS.navyLight} 100%)`,
        p: 3,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background orbs */}
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            position: "absolute",
            borderRadius: "50%",
            background: alpha(COLORS.gold, 0.03 + i * 0.02),
            width: 300 + i * 200,
            height: 300 + i * 200,
            top: `${-20 + i * 30}%`,
            left: `${-10 + i * 20}%`,
            pointerEvents: "none",
          }}
        />
      ))}

      <Card
        sx={{
          width: "100%",
          maxWidth: 480,
          borderRadius: 4,
          boxShadow: "0 40px 80px rgba(0,0,0,0.35)",
          border: `1px solid ${alpha("#fff", 0.08)}`,
          position: "relative",
          zIndex: 1,
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          {/* Header */}
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box
              sx={{
                width: 64, height: 64, borderRadius: "50%", mx: "auto", mb: 2,
                background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 12px 32px ${alpha(COLORS.gold, 0.4)}`,
              }}
            >
              <Security sx={{ color: "#000", fontSize: 28 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.navy, mb: 0.5 }}>
              Set Your Password
            </Typography>
            <Typography sx={{ color: COLORS.textSecondary, fontSize: "0.9rem" }}>
              {user?.full_name ? `Welcome, ${user.full_name.split(" ")[0]}! ` : ""}
              Create a secure password to access your dashboard.
            </Typography>
          </Box>

          {success ? (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <CheckCircle sx={{ fontSize: 56, color: COLORS.success, mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.navy, mb: 1 }}>
                Password Updated!
              </Typography>
              <Typography sx={{ color: COLORS.textSecondary, fontSize: "0.9rem", mb: 2 }}>
                Redirecting to your dashboard…
              </Typography>
              <LinearProgress sx={{ borderRadius: 4, "& .MuiLinearProgress-bar": { background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.goldDark})` } }} />
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              {error && (
                <Alert severity="error" sx={{ borderRadius: 2, fontSize: "0.875rem" }}>
                  {error}
                </Alert>
              )}

              {/* New password */}
              <TextField
                fullWidth
                label="New Password"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock sx={{ color: COLORS.textSecondary }} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowNew((s) => !s)} size="small">
                        {showNew ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Strength bar */}
              {newPassword && (
                <Box sx={{ mt: -1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={strength.score}
                    sx={{
                      height: 6, borderRadius: 3, bgcolor: COLORS.border,
                      "& .MuiLinearProgress-bar": { background: strength.color, borderRadius: 3 },
                    }}
                  />
                  <Typography sx={{ fontSize: "0.78rem", color: strength.color, fontWeight: 600, mt: 0.5 }}>
                    {strength.label}
                  </Typography>
                </Box>
              )}

              {/* Requirements */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                {REQUIREMENTS.map((req) => {
                  const met = req.test(newPassword);
                  return (
                    <Box key={req.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                          background: met
                            ? `linear-gradient(135deg, ${COLORS.success}, #059669)`
                            : COLORS.border,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "background 0.2s",
                        }}
                      >
                        {met && <CheckCircle sx={{ fontSize: 12, color: "#fff" }} />}
                      </Box>
                      <Typography
                        sx={{
                          fontSize: "0.8rem",
                          color: met ? COLORS.textPrimary : COLORS.textSecondary,
                          fontWeight: met ? 500 : 400,
                          transition: "color 0.2s",
                        }}
                      >
                        {req.label}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              {/* Confirm password */}
              <TextField
                fullWidth
                label="Confirm New Password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={confirmPassword.length > 0 && confirmPassword !== newPassword}
                helperText={confirmPassword.length > 0 && confirmPassword !== newPassword ? "Passwords do not match" : ""}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock sx={{ color: COLORS.textSecondary }} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirm((s) => !s)} size="small">
                        {showConfirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading || !allMet || newPassword !== confirmPassword}
                sx={{ py: 1.5, mt: 0.5 }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: "#000" }} /> : "Set Password & Continue"}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
