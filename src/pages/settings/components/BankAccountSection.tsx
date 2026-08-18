// ============================================================
// BANK ACCOUNT SECTION
// POST /partners/me/bank-accounts
// Fields: account_holder_name, account_number_encrypted,
//         ifsc_code, bank_name, branch_name, account_type, is_primary
// ============================================================
import { useState } from "react";
import {
  Box, Grid, TextField, Button, Alert, Stack, Typography,
  FormControl, InputLabel, Select, MenuItem, Chip, alpha,
  CircularProgress, Collapse,
} from "@mui/material";
import { AccountBalance, Add, CheckCircle, Star } from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { settingsService, type BankAccountPayload } from "../../../services/settings.service";
import { COLORS } from "../../../theme";
import SettingsSectionCard from "./SettingsSectionCard";

interface Props {
  bankAccounts: any[];
}

const EMPTY: BankAccountPayload = {
  account_holder_name: "",
  account_number_encrypted: "",
  ifsc_code: "",
  bank_name: "",
  branch_name: "",
  account_type: "SAVINGS",
  is_primary: false,
};

export default function BankAccountSection({ bankAccounts }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BankAccountPayload>(EMPTY);

  const mutation = useMutation({
    mutationFn: () => settingsService.addBankAccount(form),
    onSuccess: () => {
      enqueueSnackbar("Bank account added", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["partner-settings-profile"] });
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (err: any) => {
      enqueueSnackbar(err?.response?.data?.detail ?? "Failed to add bank account", { variant: "error" });
    },
  });

  const set = (k: keyof BankAccountPayload, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = !!(form.account_holder_name && form.account_number_encrypted && form.ifsc_code && form.bank_name);

  return (
    <SettingsSectionCard
      icon={<AccountBalance />}
      title="Bank Account"
      subtitle="Settlements are paid to your linked account"
      iconColor={COLORS.success}
      action={
        <Button
          size="small" startIcon={<Add sx={{ fontSize: 15 }} />}
          variant="outlined" color="success"
          onClick={() => setOpen((v) => !v)}
          sx={{ borderRadius: 2.5, fontWeight: 700, fontSize: "0.78rem" }}
        >
          {open ? "Cancel" : "Add Account"}
        </Button>
      }
    >
      {/* Existing accounts */}
      {bankAccounts.length > 0 ? (
        <Stack spacing={1.25} sx={{ mb: open ? 2.5 : 0 }}>
          {bankAccounts.map((acc) => (
            <Box
              key={acc.id}
              sx={{
                p: 2, borderRadius: 2.5,
                border: `1.5px solid ${acc.is_primary ? alpha(COLORS.success, 0.4) : COLORS.border}`,
                bgcolor: acc.is_primary ? alpha(COLORS.success, 0.04) : "transparent",
                display: "flex", alignItems: "center", gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 42, height: 42, borderRadius: 2, flexShrink: 0,
                  bgcolor: alpha(COLORS.success, 0.1),
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <AccountBalance sx={{ fontSize: 20, color: COLORS.success }} />
              </Box>
              <Box flex={1} minWidth={0}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: COLORS.textPrimary }}>
                    {acc.bank_name}
                  </Typography>
                  {acc.is_primary && (
                    <Chip
                      icon={<Star sx={{ fontSize: "11px !important" }} />}
                      label="Primary" size="small"
                      sx={{
                        height: 20, fontSize: "0.67rem", fontWeight: 700,
                        bgcolor: alpha(COLORS.gold, 0.15), color: COLORS.goldDark,
                        border: `1px solid ${alpha(COLORS.gold, 0.3)}`,
                      }}
                    />
                  )}
                  <Chip
                    label={acc.verification_status ?? "PENDING"} size="small"
                    sx={{
                      height: 18, fontSize: "0.65rem", fontWeight: 700,
                      bgcolor: alpha(acc.verification_status === "APPROVED" ? COLORS.success : COLORS.warning, 0.1),
                      color: acc.verification_status === "APPROVED" ? COLORS.success : COLORS.warning,
                    }}
                  />
                </Stack>
                <Typography sx={{ fontSize: "0.76rem", color: COLORS.textSecondary, mt: 0.25 }}>
                  {acc.account_type} · IFSC: {acc.ifsc_code}
                  {acc.branch_name ? ` · ${acc.branch_name}` : ""}
                </Typography>
                <Typography sx={{ fontSize: "0.73rem", color: COLORS.textSecondary }}>
                  Holder: {acc.account_holder_name}
                </Typography>
              </Box>
              {acc.verification_status === "APPROVED" && (
                <CheckCircle sx={{ color: COLORS.success, fontSize: 20, flexShrink: 0 }} />
              )}
            </Box>
          ))}
        </Stack>
      ) : !open ? (
        <Box
          sx={{
            p: 3, textAlign: "center", borderRadius: 2.5,
            border: `2px dashed ${COLORS.border}`,
            bgcolor: alpha(COLORS.bgMain, 0.5),
          }}
        >
          <AccountBalance sx={{ fontSize: 36, color: alpha(COLORS.textSecondary, 0.3), mb: 1 }} />
          <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: COLORS.textSecondary }}>
            No bank account linked
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: alpha(COLORS.textSecondary, 0.7), mt: 0.5 }}>
            Add a bank account to receive settlements
          </Typography>
        </Box>
      ) : null}

      {/* Add account form */}
      <Collapse in={open}>
        <Box
          sx={{
            p: 2.5, borderRadius: 2.5,
            border: `1px solid ${alpha(COLORS.success, 0.2)}`,
            bgcolor: alpha(COLORS.success, 0.03),
          }}
        >
          <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: COLORS.success, mb: 2 }}>
            New Bank Account
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Account Holder Name *"
                value={form.account_holder_name}
                onChange={(e) => set("account_holder_name", e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Account Number *"
                value={form.account_number_encrypted}
                onChange={(e) => set("account_number_encrypted", e.target.value)}
                helperText="Stored encrypted" />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" label="IFSC Code *"
                value={form.ifsc_code}
                onChange={(e) => set("ifsc_code", e.target.value.toUpperCase())}
                inputProps={{ style: { fontFamily: "monospace", fontWeight: 700 } }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" label="Bank Name *"
                value={form.bank_name}
                onChange={(e) => set("bank_name", e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" label="Branch Name"
                value={form.branch_name}
                onChange={(e) => set("branch_name", e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Account Type</InputLabel>
                <Select label="Account Type" value={form.account_type}
                  onChange={(e) => set("account_type", e.target.value as "SAVINGS" | "CURRENT")}>
                  <MenuItem value="SAVINGS">Savings</MenuItem>
                  <MenuItem value="CURRENT">Current</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Set as Primary</InputLabel>
                <Select label="Set as Primary" value={form.is_primary ? "yes" : "no"}
                  onChange={(e) => set("is_primary", e.target.value === "yes")}>
                  <MenuItem value="yes">Yes — use for settlements</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained" color="success"
                disabled={!canSubmit || mutation.isPending}
                onClick={() => mutation.mutate()}
                startIcon={mutation.isPending ? <CircularProgress size={14} color="inherit" /> : <Add />}
                sx={{ borderRadius: 2.5, fontWeight: 700 }}
              >
                {mutation.isPending ? "Adding…" : "Add Bank Account"}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </SettingsSectionCard>
  );
}
