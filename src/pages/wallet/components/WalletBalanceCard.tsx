// ============================================================
// WAYTERO PARTNER PORTAL — WALLET BALANCE CARD COMPONENT
// ============================================================
import { Box, Typography, Chip, Skeleton, alpha, Button } from "@mui/material";
import {
  AccountBalanceWallet,
  Lock,
  CreditCard,
  ArrowUpward,
  CheckCircle,
  ErrorOutline,
  HourglassTop,
} from "@mui/icons-material";
import type { WalletInfo, WalletSummary } from "../../../services/wallet.service";
import { COLORS } from "../../../theme";

interface Props {
  wallet: WalletInfo | null;
  summary: WalletSummary;
  loading: boolean;
  onWithdraw: () => void;
  onRechargeRequest: () => void;
}

function statusConfig(s: string) {
  if (s === "ACTIVE")
    return { label: "Active", color: COLORS.success, icon: <CheckCircle sx={{ fontSize: 13 }} /> };
  if (s === "SUSPENDED")
    return { label: "Suspended", color: COLORS.error, icon: <ErrorOutline sx={{ fontSize: 13 }} /> };
  return { label: "Pending", color: COLORS.warning, icon: <HourglassTop sx={{ fontSize: 13 }} /> };
}

function walletTypeLabel(t: string) {
  if (t === "PREPAID") return "Prepaid Wallet";
  if (t === "CREDIT") return "Credit Wallet";
  return "Hybrid Wallet";
}

export default function WalletBalanceCard({
  wallet,
  summary,
  loading,
  onWithdraw,
  onRechargeRequest,
}: Props) {
  const st = wallet ? statusConfig(wallet.wallet_status) : null;

  return (
    <Box
      sx={{
        borderRadius: 4,
        background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 50%, #1e3a6e 100%)`,
        boxShadow: "0 20px 60px rgba(10,22,40,0.35)",
        p: { xs: 3, md: 4 },
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circles */}
      <Box sx={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: alpha("#fff", 0.03) }} />
      <Box sx={{ position: "absolute", bottom: -60, right: 60, width: 160, height: 160, borderRadius: "50%", background: alpha(COLORS.gold, 0.06) }} />
      <Box sx={{ position: "absolute", top: 20, right: 120, width: 80, height: 80, borderRadius: "50%", background: alpha(COLORS.gold, 0.04) }} />

      <Box sx={{ position: "relative" }}>
        {/* Header row */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 44, height: 44, borderRadius: 2.5,
                background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 6px 16px ${alpha(COLORS.gold, 0.4)}`,
              }}
            >
              <AccountBalanceWallet sx={{ fontSize: 22, color: "#000" }} />
            </Box>
            <Box>
              <Typography sx={{ color: alpha("#fff", 0.5), fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {loading ? "—" : walletTypeLabel(wallet?.wallet_type ?? "PREPAID")}
              </Typography>
              <Typography sx={{ color: alpha("#fff", 0.85), fontSize: "0.82rem", fontWeight: 600 }}>
                Partner Wallet
              </Typography>
            </Box>
          </Box>
          {loading ? (
            <Skeleton variant="rounded" width={68} height={22} sx={{ bgcolor: alpha("#fff", 0.1) }} />
          ) : st ? (
            <Chip
              icon={st.icon}
              label={st.label}
              size="small"
              sx={{
                height: 24, fontWeight: 700, fontSize: "0.7rem",
                color: st.color, bgcolor: alpha(st.color, 0.15),
                border: `1px solid ${alpha(st.color, 0.3)}`,
                "& .MuiChip-icon": { color: "inherit", ml: 0.75 },
              }}
            />
          ) : null}
        </Box>

        {/* Available Balance */}
        <Box sx={{ mb: 3.5 }}>
          <Typography sx={{ color: alpha("#fff", 0.45), fontSize: "0.78rem", fontWeight: 600, mb: 0.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Available Balance
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={180} height={60} sx={{ bgcolor: alpha("#fff", 0.1) }} />
          ) : (
            <Typography sx={{ color: "#fff", fontSize: { xs: "2.25rem", md: "3rem" }, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.02em" }}>
              ₹{(wallet?.available_balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Typography>
          )}
        </Box>

        {/* Hold + Credit chips */}
        <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 0.75, borderRadius: 2, background: alpha("#fff", 0.07), border: `1px solid ${alpha("#fff", 0.1)}` }}>
            <Lock sx={{ fontSize: 14, color: alpha("#fff", 0.5) }} />
            {loading ? (
              <Skeleton variant="text" width={80} sx={{ bgcolor: alpha("#fff", 0.1) }} />
            ) : (
              <Typography sx={{ fontSize: "0.8rem", color: alpha("#fff", 0.7), fontWeight: 600 }}>
                Hold: ₹{(wallet?.hold_balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Typography>
            )}
          </Box>
          {(wallet?.credit_limit ?? 0) > 0 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 0.75, borderRadius: 2, background: alpha(COLORS.gold, 0.12), border: `1px solid ${alpha(COLORS.gold, 0.2)}` }}>
              <CreditCard sx={{ fontSize: 14, color: COLORS.gold }} />
              {loading ? (
                <Skeleton variant="text" width={80} sx={{ bgcolor: alpha("#fff", 0.1) }} />
              ) : (
                <Typography sx={{ fontSize: "0.8rem", color: COLORS.gold, fontWeight: 600 }}>
                  Credit: ₹{(wallet?.credit_limit ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </Typography>
              )}
            </Box>
          )}
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            startIcon={<ArrowUpward />}
            onClick={onWithdraw}
            disabled={loading || !wallet || wallet.wallet_status !== "ACTIVE" || wallet.available_balance <= 0}
            sx={{
              borderRadius: 2.5, fontWeight: 700, px: 3, py: 1.25,
              background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
              color: "#000",
              "&:hover": { background: `linear-gradient(135deg, ${COLORS.goldLight}, ${COLORS.gold})` },
              "&:disabled": { opacity: 0.45 },
            }}
          >
            Withdraw Request
          </Button>
          <Button
            variant="outlined"
            onClick={onRechargeRequest}
            disabled={loading}
            sx={{
              borderRadius: 2.5, fontWeight: 700, px: 3, py: 1.25,
              borderColor: alpha("#fff", 0.25), color: alpha("#fff", 0.8),
              "&:hover": { borderColor: alpha("#fff", 0.5), bgcolor: alpha("#fff", 0.06) },
            }}
          >
            Request Top-Up
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
