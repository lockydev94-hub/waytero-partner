// ============================================================
// WAYTERO PARTNER PORTAL — WITHDRAW REQUEST MODAL
// Info-only: withdrawal is admin-processed. Partner submits request.
// ============================================================
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Alert, alpha, Divider,
} from "@mui/material";
import { AccountBalanceWallet, InfoOutlined, ArrowUpward } from "@mui/icons-material";
import { COLORS } from "../../../theme";
import type { WalletInfo } from "../../../services/wallet.service";

interface Props {
  open: boolean;
  onClose: () => void;
  wallet: WalletInfo | null;
}

export default function WithdrawModal({ open, onClose, wallet }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          boxShadow: "0 24px 64px rgba(10,22,40,0.22)",
          border: `1px solid ${COLORS.border}`,
        },
      }}
    >
      <DialogTitle sx={{ pb: 0, pt: 3, px: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 2.5,
              background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <ArrowUpward sx={{ fontSize: 20, color: "#000" }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: COLORS.textPrimary }}>
              Withdraw Request
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>
              Submit a withdrawal to admin
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 2.5 }}>
        {/* Balance display */}
        <Box
          sx={{
            borderRadius: 3,
            background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyMid})`,
            p: 2.5, mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <AccountBalanceWallet sx={{ fontSize: 16, color: alpha("#fff", 0.5) }} />
            <Typography sx={{ fontSize: "0.72rem", color: alpha("#fff", 0.5), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Available Balance
            </Typography>
          </Box>
          <Typography sx={{ fontSize: "2rem", fontWeight: 900, color: "#fff", lineHeight: 1 }}>
            ₹{(wallet?.available_balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Typography>
        </Box>

        <Alert
          icon={<InfoOutlined sx={{ fontSize: 18 }} />}
          severity="info"
          sx={{ borderRadius: 2.5, mb: 2, fontSize: "0.82rem" }}
        >
          Withdrawal requests are processed by the admin team. Once approved, the amount will be transferred to your registered bank account within 1–3 business days.
        </Alert>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {[
            { label: "Hold Balance", value: `₹${(wallet?.hold_balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
            { label: "Credit Limit", value: `₹${(wallet?.credit_limit ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
            { label: "Wallet Type", value: wallet?.wallet_type ?? "—" },
            { label: "Wallet Status", value: wallet?.wallet_status ?? "—" },
          ].map((row) => (
            <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", py: 0.75 }}>
              <Typography sx={{ fontSize: "0.82rem", color: COLORS.textSecondary }}>{row.label}</Typography>
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: COLORS.textPrimary }}>{row.value}</Typography>
            </Box>
          ))}
        </Box>

        <Alert severity="warning" sx={{ mt: 2.5, borderRadius: 2.5, fontSize: "0.78rem" }}>
          To initiate a withdrawal, please contact your assigned relationship manager or raise a support ticket from the admin portal.
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2.5, fontWeight: 600 }}>
          Close
        </Button>
        <Button
          variant="contained"
          sx={{
            borderRadius: 2.5, fontWeight: 700,
            background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
            color: "#000",
          }}
          onClick={onClose}
        >
          Understood
        </Button>
      </DialogActions>
    </Dialog>
  );
}
