// ============================================================
// WAYTERO PARTNER PORTAL — LEDGER TABLE COMPONENT
// ============================================================
import {
  Box, Card, CardContent, Typography, Chip, alpha, Skeleton,
  Table, TableBody, TableCell, TableHead, TableRow, Pagination,
  Select, MenuItem, FormControl, InputLabel, Avatar,
} from "@mui/material";
import {
  ArrowDownward, ArrowUpward, AccountBalance, Receipt,
  SwapHoriz, ManageAccounts, AddCard,
} from "@mui/icons-material";
import type { LedgerEntry, RefTypeFilter } from "../../../services/wallet.service";
import { COLORS } from "../../../theme";

interface Props {
  entries: LedgerEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  refType: RefTypeFilter;
  loading: boolean;
  onPageChange: (p: number) => void;
  onRefTypeChange: (t: RefTypeFilter) => void;
}

const REF_TYPE_OPTIONS: { value: RefTypeFilter; label: string }[] = [
  { value: "ALL", label: "All Transactions" },
  { value: "SETTLEMENT", label: "Settlement Credits" },
  { value: "SETTLEMENT_DEBIT", label: "Settlement Debit" },
  { value: "COMMISSION_DEBIT", label: "Commission Debit" },
  { value: "MANUAL_CREDIT", label: "Manual Credit" },
  { value: "MANUAL_DEBIT", label: "Manual Debit" },
  { value: "RECHARGE", label: "All Recharges" },
  { value: "RECHARGE_CASH", label: "Cash Recharge" },
  { value: "RECHARGE_UPI", label: "UPI Recharge" },
];

function refTypeConfig(t: string | null) {
  switch (t) {
    case "SETTLEMENT":
      return { label: "Settlement", color: COLORS.success, bg: alpha(COLORS.success, 0.1), icon: <Chip label="" size="small" />, avatarIcon: <SwapHoriz /> };
    case "SETTLEMENT_DEBIT":
      return { label: "Settlement Debit", color: "#F97316", bg: alpha("#F97316", 0.1), avatarIcon: <ArrowUpward /> };
    case "COMMISSION_DEBIT":
      return { label: "Commission", color: "#8B5CF6", bg: alpha("#8B5CF6", 0.1), avatarIcon: <ManageAccounts /> };
    case "MANUAL_CREDIT":
      return { label: "Manual Credit", color: COLORS.success, bg: alpha(COLORS.success, 0.08), avatarIcon: <AddCard /> };
    case "MANUAL_DEBIT":
      return { label: "Manual Debit", color: COLORS.error, bg: alpha(COLORS.error, 0.08), avatarIcon: <ArrowUpward /> };
    case "RECHARGE":
    case "RECHARGE_CASH":
    case "RECHARGE_UPI": {
      const modeLabel = t === "RECHARGE_CASH" ? "Cash Recharge" : t === "RECHARGE_UPI" ? "UPI Recharge" : "Recharge";
      return { label: modeLabel, color: COLORS.info, bg: alpha(COLORS.info, 0.1), avatarIcon: <AddCard /> };
    }
    case "BOOKING_DEBIT":
      return { label: "Booking Debit", color: COLORS.error, bg: alpha(COLORS.error, 0.08), avatarIcon: <Receipt /> };
    case "BOOKING_CREDIT":
      return { label: "Booking Credit", color: COLORS.success, bg: alpha(COLORS.success, 0.08), avatarIcon: <Receipt /> };
    default:
      return { label: t ?? "—", color: COLORS.textSecondary, bg: alpha(COLORS.textSecondary, 0.07), avatarIcon: <AccountBalance /> };
  }
}

function RowSkeleton() {
  return (
    <TableRow>
      {[...Array(6)].map((_, i) => (
        <TableCell key={i}><Skeleton variant="text" /></TableCell>
      ))}
    </TableRow>
  );
}

function formatDateTime(dt: string | null) {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function LedgerTable({
  entries, total, page, pageSize, totalPages,
  refType, loading, onPageChange, onRefTypeChange,
}: Props) {
  return (
    <Card sx={{ borderRadius: 3.5, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1px solid ${COLORS.border}` }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, color: COLORS.textPrimary, fontSize: "0.95rem" }}>
              Transaction Ledger
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary }}>
              {loading ? "Loading…" : `${total} transaction${total !== 1 ? "s" : ""} total`}
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel sx={{ fontSize: "0.82rem" }}>Filter by Type</InputLabel>
            <Select
              value={refType}
              label="Filter by Type"
              onChange={(e) => onRefTypeChange(e.target.value as RefTypeFilter)}
              sx={{ borderRadius: 2, fontSize: "0.82rem" }}
            >
              {REF_TYPE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value} sx={{ fontSize: "0.82rem" }}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Table */}
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, fontSize: "0.75rem", color: COLORS.textSecondary, bgcolor: alpha(COLORS.bgMain, 0.7), borderBottom: `1px solid ${COLORS.border}` } }}>
                <TableCell>Type</TableCell>
                <TableCell sx={{ minWidth: 120, maxWidth: 220 }}>Reference</TableCell>
                <TableCell align="right">Credit</TableCell>
                <TableCell align="right">Debit</TableCell>
                <TableCell align="right">Balance After</TableCell>
                <TableCell>Date & Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading
                ? [...Array(8)].map((_, i) => <RowSkeleton key={i} />)
                : entries.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Box sx={{ textAlign: "center", py: 6 }}>
                          <AccountBalance sx={{ fontSize: 40, color: COLORS.border, mb: 1 }} />
                          <Typography sx={{ color: COLORS.textSecondary, fontSize: "0.9rem", fontWeight: 600 }}>
                            No transactions yet
                          </Typography>
                          <Typography sx={{ color: COLORS.textSecondary, fontSize: "0.78rem", mt: 0.5 }}>
                            Wallet transactions will appear here once settlements or recharges are processed.
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                  : entries.map((e, idx) => {
                    const cfg = refTypeConfig(e.ref_type);
                    const isCredit = e.credit > 0;
                    return (
                      <TableRow
                        key={e.id}
                        sx={{
                          "&:hover": { bgcolor: alpha(COLORS.bgMain, 0.7) },
                          borderBottom: `1px solid ${COLORS.border}`,
                          "& td": { py: 1.5, border: "none" },
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: cfg.bg, "& svg": { fontSize: 16, color: cfg.color } }}>
                              {isCredit ? <ArrowDownward sx={{ color: `${COLORS.success} !important` }} /> : <ArrowUpward sx={{ color: `${COLORS.error} !important` }} />}
                            </Avatar>
                            <Chip
                              label={cfg.label}
                              size="small"
                              sx={{ height: 22, fontWeight: 700, fontSize: "0.68rem", bgcolor: cfg.bg, color: cfg.color, borderRadius: 1.5 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: "0.8rem", color: COLORS.textPrimary, fontWeight: 500, fontFamily: "monospace", wordBreak: "break-all", whiteSpace: "normal" }}>
                            {e.ref ?? "—"}
                          </Typography>
                          {e.narration && (
                            <Typography sx={{ fontSize: "0.7rem", color: COLORS.textSecondary, whiteSpace: "normal", wordBreak: "break-word" }}>
                              {e.narration}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {e.credit > 0 ? (
                            <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: COLORS.success }}>
                              + ₹{e.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </Typography>
                          ) : (
                            <Typography sx={{ fontSize: "0.8rem", color: COLORS.textSecondary }}>—</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {e.debit > 0 ? (
                            <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: COLORS.error }}>
                              - ₹{e.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </Typography>
                          ) : (
                            <Typography sx={{ fontSize: "0.8rem", color: COLORS.textSecondary }}>—</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: COLORS.textPrimary }}>
                            ₹{e.balance_after.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: "0.78rem", color: COLORS.textSecondary, whiteSpace: "nowrap" }}>
                            {formatDateTime(e.created_at)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </Box>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => onPageChange(p)}
              color="primary"
              shape="rounded"
              size="small"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
