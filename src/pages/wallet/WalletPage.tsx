// ============================================================
// WAYTERO PARTNER PORTAL — WALLET PAGE
// Endpoint: GET /partners/me/wallet
// ============================================================
import { useEffect, useState, useCallback } from "react";
import {
  Box, Typography, Alert, IconButton, Tooltip, alpha, Skeleton,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { walletService, type WalletData, type RefTypeFilter } from "../../services/wallet.service";
import { clearSession } from "../../services/api";
import { COLORS } from "../../theme";

import WalletBalanceCard from "./components/WalletBalanceCard";
import WalletSummaryCards from "./components/WalletSummaryCards";
import LedgerTable from "./components/LedgerTable";
import WithdrawModal from "./components/WithdrawModal";
import RechargeRequestModal from "./components/RechargeRequestModal";

const EMPTY_SUMMARY = {
  total_credited: 0,
  total_debited: 0,
  settlement_credits: 0,
  commission_debits: 0,
  recharge_credits: 0,
  ledger_count: 0,
};

export default function WalletPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Pagination / filter state
  const [page, setPage] = useState(1);
  const [refType, setRefType] = useState<RefTypeFilter>("ALL");

  // Modal states
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);

  const loadWallet = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const d = await walletService.getWallet(page, 20, refType);
      setData(d);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        clearSession();
        return;
      }
      setError(e?.response?.data?.detail ?? e?.message ?? "Failed to load wallet data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, refType]);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  const handlePageChange = (p: number) => { setPage(p); };
  const handleRefTypeChange = (t: RefTypeFilter) => { setRefType(t); setPage(1); };

  return (
    <Box>
      {/* ── Page Header ── */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>
            My Wallet
          </Typography>
          <Typography sx={{ color: COLORS.textSecondary, fontSize: "0.875rem", mt: 0.25 }}>
            Track your balance, settlements, and transaction ledger
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton
            onClick={() => loadWallet(true)}
            disabled={refreshing}
            size="small"
            sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 2 }}
          >
            <Refresh
              sx={{
                fontSize: 18,
                animation: refreshing ? "spin 1s linear infinite" : "none",
                "@keyframes spin": { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } },
              }}
            />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Error ── */}
      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* ── Balance Card ── */}
      {loading ? (
        <Skeleton variant="rounded" height={260} sx={{ borderRadius: 4, mb: 3 }} />
      ) : (
        <Box sx={{ mb: 3 }}>
          <WalletBalanceCard
            wallet={data?.wallet ?? null}
            summary={data?.summary ?? EMPTY_SUMMARY}
            loading={false}
            onWithdraw={() => setWithdrawOpen(true)}
            onRechargeRequest={() => setRechargeOpen(true)}
          />
        </Box>
      )}

      {/* ── Summary Stats ── */}
      <Box sx={{ mb: 3 }}>
        <WalletSummaryCards
          summary={data?.summary ?? EMPTY_SUMMARY}
          loading={loading}
        />
      </Box>

      {/* ── Ledger Table ── */}
      <LedgerTable
        entries={data?.ledger?.entries ?? []}
        total={data?.ledger?.total ?? 0}
        page={data?.ledger?.page ?? page}
        pageSize={data?.ledger?.page_size ?? 20}
        totalPages={data?.ledger?.total_pages ?? 1}
        refType={refType}
        loading={loading}
        onPageChange={handlePageChange}
        onRefTypeChange={handleRefTypeChange}
      />

      {/* ── Modals ── */}
      <WithdrawModal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        wallet={data?.wallet ?? null}
      />
      <RechargeRequestModal
        open={rechargeOpen}
        onClose={() => setRechargeOpen(false)}
      />
    </Box>
  );
}
