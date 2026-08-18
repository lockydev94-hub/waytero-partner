// ============================================================
// WAYTERO PARTNER PORTAL — TOP-UP REQUEST MODAL
// Informs partner about the top-up process (admin-initiated)
// ============================================================
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Alert, alpha, List, ListItem, ListItemIcon, ListItemText,
} from "@mui/material";
import {
  AddCard, InfoOutlined, CheckCircle, PhoneInTalk, SupportAgent,
} from "@mui/icons-material";
import { COLORS } from "../../../theme";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function RechargeRequestModal({ open, onClose }: Props) {
  const steps = [
    { icon: <PhoneInTalk />, text: "Contact your assigned relationship manager with the recharge amount." },
    { icon: <SupportAgent />, text: "Admin verifies the payment mode (CASH / UPI) and UTR reference." },
    { icon: <CheckCircle />, text: "Once confirmed, the balance is credited to your wallet instantly." },
  ];

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
              background: `linear-gradient(135deg, ${COLORS.info}, #2563EB)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <AddCard sx={{ fontSize: 20, color: "#fff" }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: COLORS.textPrimary }}>
              Request Wallet Top-Up
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: COLORS.textSecondary }}>
              How to recharge your wallet
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 2.5 }}>
        <Alert
          icon={<InfoOutlined sx={{ fontSize: 18 }} />}
          severity="info"
          sx={{ borderRadius: 2.5, mb: 3, fontSize: "0.82rem" }}
        >
          Wallet recharges are initiated by the WayTero admin team. Follow the steps below.
        </Alert>

        <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary, fontSize: "0.85rem", mb: 1.5 }}>
          Top-Up Process
        </Typography>

        <List dense disablePadding>
          {steps.map((s, i) => (
            <ListItem key={i} alignItems="flex-start" sx={{ px: 0, py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40, mt: 0.25 }}>
                <Box
                  sx={{
                    width: 30, height: 30, borderRadius: 2, flexShrink: 0,
                    bgcolor: alpha(COLORS.info, 0.1),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    "& svg": { fontSize: 16, color: COLORS.info },
                  }}
                >
                  {s.icon}
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={s.text}
                primaryTypographyProps={{ fontSize: "0.82rem", color: COLORS.textSecondary, lineHeight: 1.5 }}
              />
            </ListItem>
          ))}
        </List>

        <Box
          sx={{
            mt: 2.5, p: 2, borderRadius: 2.5,
            bgcolor: alpha(COLORS.gold, 0.07),
            border: `1px solid ${alpha(COLORS.gold, 0.2)}`,
          }}
        >
          <Typography sx={{ fontSize: "0.78rem", color: COLORS.textPrimary, fontWeight: 600, mb: 0.5 }}>
            Accepted Payment Modes
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>
            CASH · UPI (with UTR reference)
          </Typography>
        </Box>
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
          Got It
        </Button>
      </DialogActions>
    </Dialog>
  );
}
