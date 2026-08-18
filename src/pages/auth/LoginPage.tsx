// ============================================================
// WAYTERO PARTNER PORTAL — LOGIN PAGE
// Premium design: email/mobile + password, OTP tab
// Doc Ref: Auth Flow §6 — Partner Login (password + OTP)
// ============================================================
import { useState } from "react";
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  InputAdornment, IconButton, CircularProgress, Tab, Tabs, Divider, alpha,
} from "@mui/material";
import {
  Visibility, VisibilityOff, PhoneAndroid, Lock, Email, VpnKey,
} from "@mui/icons-material";
import { useNavigate, useSearchParams, Link as RouterLink } from "react-router-dom";
import { authService } from "../../services/auth.service";
import { useAuthStore } from "../../store/authStore";
import { COLORS } from "../../theme";

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [searchParams] = useSearchParams();
  const [inactivityNotice, setInactivityNotice] = useState(
    searchParams.get("reason") === "inactivity"
  );

  const [tab, setTab] = useState<"password" | "otp">("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");

  const startOtpTimer = () => {
    setOtpTimer(60);
    const interval = setInterval(() => {
      setOtpTimer((t) => { if (t <= 1) { clearInterval(interval); return 0; } return t - 1; });
    }, 1000);
  };

  const handleSendOtp = async () => {
    setError("");
    if (!identifier || !/^[6-9]\d{9}$/.test(identifier)) {
      setError("Enter a valid 10-digit mobile number to receive OTP");
      return;
    }
    setOtpLoading(true);
    try {
      const res = await authService.sendOtp(identifier);
      setOtpSent(true);
      startOtpTimer();
      if (res.dev_otp) setDevOtp(res.dev_otp);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to send OTP. Try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim()) { setError("Enter your mobile number or email"); return; }
    if (!password.trim()) { setError("Enter your password"); return; }
    setLoading(true);
    try {
      // Backend returns LoginResponse directly: { user, tokens, session_id }
      const res = await authService.loginWithPassword(identifier.trim(), password);
      setAuth(res.user, res.tokens.access_token, res.tokens.refresh_token);
      if (res.user.must_change_password) {
        navigate("/change-password", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!otpSent) { setError("Please request an OTP first"); return; }
    if (!otp || otp.length !== 6) { setError("Enter the 6-digit OTP"); return; }
    setLoading(true);
    try {
      // Backend returns LoginResponse directly: { user, tokens, session_id }
      const res = await authService.loginWithOtp(identifier.trim(), otp);
      setAuth(res.user, res.tokens.access_token, res.tokens.refresh_token);
      if (res.user.must_change_password) {
        navigate("/change-password", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Invalid OTP. Please try again.");
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
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      {[...Array(3)].map((_, i) => (
        <Box
          key={i}
          sx={{
            position: "absolute",
            borderRadius: "50%",
            background: alpha(COLORS.gold, 0.04 + i * 0.02),
            width: 400 + i * 200,
            height: 400 + i * 200,
            top: -100 + i * 50,
            right: -100 + i * 30,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Left panel — branding */}
      <Box
        sx={{
          flex: 1,
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "center",
          px: 8,
          color: "#fff",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 6 }}>
          <Box
            sx={{
              width: 52, height: 52, borderRadius: 2,
              background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 8px 24px ${alpha(COLORS.gold, 0.4)}`,
            }}
          >
            <Typography sx={{ color: "#000", fontWeight: 900, fontSize: 22 }}>W</Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
            WayTero
          </Typography>
        </Box>

        <Typography variant="h2" sx={{ fontWeight: 800, lineHeight: 1.15, mb: 3, color: "#fff" }}>
          Grow your<br />
          <Box component="span" sx={{ color: COLORS.gold }}>travel business</Box><br />
          with WayTero
        </Typography>

        <Typography sx={{ color: alpha("#fff", 0.65), fontSize: "1.05rem", lineHeight: 1.7, maxWidth: 400 }}>
          Manage bookings, drivers, vehicles, and revenue from one unified partner dashboard.
        </Typography>

        <Box sx={{ mt: 6, display: "flex", flexDirection: "column", gap: 2.5 }}>
          {["Real-time booking management", "Fleet & driver operations", "Revenue analytics & settlements"].map((feat) => (
            <Box key={feat} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
                  flexShrink: 0,
                }}
              />
              <Typography sx={{ color: alpha("#fff", 0.8), fontSize: "0.95rem" }}>{feat}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Right panel — login form */}
      <Box
        sx={{
          width: { xs: "100%", md: 480 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 3, md: 5 },
          bgcolor: { md: alpha("#fff", 0.03) },
          backdropFilter: { md: "blur(10px)" },
        }}
      >
        <Card
          sx={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 4,
            boxShadow: "0 32px 64px rgba(0,0,0,0.3)",
            border: `1px solid ${alpha("#fff", 0.08)}`,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Logo (mobile) */}
            <Box sx={{ display: { md: "none" }, textAlign: "center", mb: 3 }}>
              <Box
                sx={{
                  width: 48, height: 48, borderRadius: 2, mx: "auto", mb: 1.5,
                  background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Typography sx={{ color: "#000", fontWeight: 900, fontSize: 20 }}>W</Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.navy }}>WayTero Partner</Typography>
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.navy, mb: 0.5 }}>
              Welcome back
            </Typography>
            <Typography sx={{ color: COLORS.textSecondary, fontSize: "0.9rem", mb: 3 }}>
              Sign in to your partner dashboard
            </Typography>

            {/* Login method tabs */}
            <Tabs
              value={tab}
              onChange={(_, v) => { setTab(v); setError(""); setOtpSent(false); setOtp(""); setDevOtp(""); }}
              sx={{
                mb: 3,
                "& .MuiTabs-indicator": { backgroundColor: COLORS.gold, height: 3, borderRadius: 2 },
                "& .MuiTab-root": { fontWeight: 600, fontSize: "0.875rem", color: COLORS.textSecondary },
                "& .Mui-selected": { color: COLORS.navy },
              }}
            >
              <Tab label="Password" value="password" icon={<Lock sx={{ fontSize: 16 }} />} iconPosition="start" />
              <Tab label="OTP Login" value="otp" icon={<VpnKey sx={{ fontSize: 16 }} />} iconPosition="start" />
            </Tabs>

            {inactivityNotice && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2, fontSize: "0.8rem" }} onClose={() => setInactivityNotice(false)}>
                You were signed out automatically after 10 minutes of inactivity. Please sign in again.
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2, fontSize: "0.875rem" }}>
                {error}
              </Alert>
            )}

            {devOtp && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2, fontSize: "0.8rem" }}>
                Dev OTP: <strong>{devOtp}</strong>
              </Alert>
            )}

            {/* PASSWORD LOGIN */}
            {tab === "password" && (
              <Box component="form" onSubmit={handlePasswordLogin} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  fullWidth
                  label="Mobile Number or Email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="9876543210 or partner@email.com"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {identifier.includes("@") ? <Email sx={{ color: COLORS.textSecondary }} /> : <PhoneAndroid sx={{ color: COLORS.textSecondary }} />}
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Lock sx={{ color: COLORS.textSecondary }} /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((s) => !s)} size="small">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: -0.5 }}>
                  <Typography
                    component={RouterLink}
                    to="/forgot-password"
                    variant="caption"
                    sx={{ color: COLORS.textSecondary, textDecoration: "none", "&:hover": { color: COLORS.navy } }}
                  >
                    Forgot password?
                  </Typography>
                </Box>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{ py: 1.5, mt: 0.5 }}
                >
                  {loading ? <CircularProgress size={22} sx={{ color: "#000" }} /> : "Sign In"}
                </Button>
              </Box>
            )}

            {/* OTP LOGIN */}
            {tab === "otp" && (
              <Box component="form" onSubmit={handleOtpLogin} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <TextField
                    fullWidth
                    label="Mobile Number"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="9876543210"
                    InputProps={{ startAdornment: <InputAdornment position="start"><PhoneAndroid sx={{ color: COLORS.textSecondary }} /></InputAdornment> }}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleSendOtp}
                    disabled={otpLoading || otpTimer > 0}
                    sx={{ whiteSpace: "nowrap", minWidth: 110, borderColor: COLORS.navy, color: COLORS.navy, borderRadius: 2.5 }}
                  >
                    {otpLoading ? <CircularProgress size={16} /> : otpTimer > 0 ? `${otpTimer}s` : otpSent ? "Resend" : "Send OTP"}
                  </Button>
                </Box>
                {otpSent && (
                  <TextField
                    fullWidth
                    label="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputProps={{ inputMode: "numeric", maxLength: 6 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><VpnKey sx={{ color: COLORS.textSecondary }} /></InputAdornment> }}
                  />
                )}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading || !otpSent}
                  sx={{ py: 1.5, mt: 0.5 }}
                >
                  {loading ? <CircularProgress size={22} sx={{ color: "#000" }} /> : "Verify & Sign In"}
                </Button>
              </Box>
            )}

            <Divider sx={{ my: 3 }} />
            <Typography variant="caption" sx={{ color: COLORS.textSecondary, display: "block", textAlign: "center" }}>
              First time? Use the default password <strong>Waytero@15</strong> and set a new one after login.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
