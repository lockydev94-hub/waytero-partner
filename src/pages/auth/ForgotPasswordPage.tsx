// ============================================================
// WAYTERO PARTNER PORTAL — FORGOT PASSWORD PAGE
// OTP-based password reset: email first, SMS fallback
// Doc Ref: Auth Flow — OTP-based password reset
// ============================================================
import { useState } from "react";
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  InputAdornment, CircularProgress, alpha, Step, StepLabel, Stepper,
} from "@mui/material";
import {
  Email, Phone, Lock, VpnKey, CheckCircle, ArrowBack, Visibility, VisibilityOff,
} from "@mui/icons-material";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../../services/auth.service";
import { COLORS } from "../../theme";

type StepIndex = 0 | 1 | 2; // identifier | otp+password | success

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState<StepIndex>(0);
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [channel, setChannel] = useState<"email" | "sms" | null>(null);
  const [maskedId, setMaskedId] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEmail = identifier.includes("@");

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim()) {
      setError("Enter your email address or mobile number");
      return;
    }
    setLoading(true);
    try {
      const res = await authService.forgotPassword(identifier.trim());
      const data = res.data;
      if (!data.channel) {
        // Generic success — account may not exist
        setActiveStep(2);
        setChannel(null);
        return;
      }
      setResetToken(data.reset_token);
      setChannel(data.channel as "email" | "sms" | null);
      setMaskedId(data.masked_identifier || "");
      setDevOtp(data.dev_otp ?? null);
      setActiveStep(1);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    if (newPassword.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(resetToken, otp, newPassword, confirmPassword);
      setActiveStep(2);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to reset password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 50%, ${COLORS.navyLight} 100%)`,
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 4,
          boxShadow: "0 32px 64px rgba(0,0,0,0.3)",
          border: `1px solid ${alpha("#fff", 0.08)}`,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Back link */}
          <Button
            component={Link}
            to="/login"
            startIcon={<ArrowBack />}
            size="small"
            sx={{ mb: 2, color: COLORS.textSecondary, textTransform: "none" }}
          >
            Back to login
          </Button>

          <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.navy, mb: 0.5 }}>
            Reset password
          </Typography>
          <Typography sx={{ color: COLORS.textSecondary, fontSize: "0.9rem", mb: 3 }}>
            {activeStep === 0
              ? "Enter your email or mobile to receive an OTP"
              : activeStep === 1
              ? "Enter the OTP and set a new password"
              : "Your password has been updated"}
          </Typography>

          {/* Stepper */}
          <Stepper
            activeStep={activeStep}
            sx={{ mb: 3, "& .MuiStepLabel-label": { fontSize: "0.75rem" } }}
          >
            <StepLabel>Details</StepLabel>
            <StepLabel>Verify</StepLabel>
            <StepLabel>Done</StepLabel>
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2, fontSize: "0.875rem" }}>
              {error}
            </Alert>
          )}

          {devOtp && activeStep === 1 && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2, fontSize: "0.8rem" }}>
              Dev OTP: <strong>{devOtp}</strong>
            </Alert>
          )}

          {/* ── Step 0: Identifier ── */}
          {activeStep === 0 && (
            <Box component="form" onSubmit={handleRequestOtp} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                fullWidth
                label="Email or Mobile Number"
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                placeholder="partner@email.com or 9876543210"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {isEmail ? <Email sx={{ color: COLORS.textSecondary }} /> : <Phone sx={{ color: COLORS.textSecondary }} />}
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{ py: 1.5, mt: 0.5 }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: "#000" }} /> : "Send OTP"}
              </Button>
            </Box>
          )}

          {/* ── Step 1: OTP + new password ── */}
          {activeStep === 1 && (
            <Box component="form" onSubmit={handleResetPassword} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="body2" sx={{ color: COLORS.textSecondary, textAlign: "center" }}>
                {channel === "email"
                  ? `OTP sent to ${maskedId}`
                  : `OTP sent to +91 ${maskedId}`}
              </Typography>
              <TextField
                fullWidth
                label="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputProps={{ inputMode: "numeric", maxLength: 6 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><VpnKey sx={{ color: COLORS.textSecondary }} /></InputAdornment>,
                }}
              />
              <TextField
                fullWidth
                label="New Password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock sx={{ color: COLORS.textSecondary }} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Box component="span" onClick={() => setShowPassword((s) => !s)} sx={{ cursor: "pointer", display: "flex" }}>
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </Box>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock sx={{ color: COLORS.textSecondary }} /></InputAdornment>,
                }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{ py: 1.5, mt: 0.5 }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: "#000" }} /> : "Reset Password"}
              </Button>
            </Box>
          )}

          {/* ── Step 2: Success ── */}
          {activeStep === 2 && (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <CheckCircle sx={{ fontSize: 56, color: "#0F9D58", mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.navy }}>
                {channel ? "Password updated!" : "Check your inbox"}
              </Typography>
              <Typography sx={{ color: COLORS.textSecondary, mt: 1, mb: 3 }}>
                {channel
                  ? "Your password has been changed. Please log in with your new password."
                  : "If an account exists, an OTP has been sent to your email or mobile."}
              </Typography>
              <Button
                component={Link}
                to="/login"
                variant="contained"
                sx={{ py: 1.5 }}
              >
                Go to Login
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
