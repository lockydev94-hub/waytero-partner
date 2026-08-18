// ============================================================
// WAYTERO PARTNER PORTAL — WALLET SERVICE
// Endpoint: GET /partners/me/wallet
// ============================================================
import apiClient from "./api";

export interface WalletInfo {
  id: number;
  wallet_type: string;
  wallet_status: string;
  available_balance: number;
  hold_balance: number;
  credit_limit: number;
  created_at: string | null;
}

export interface WalletSummary {
  total_credited: number;
  total_debited: number;
  settlement_credits: number;
  commission_debits: number;
  recharge_credits: number;
  ledger_count: number;
}

export interface LedgerEntry {
  id: number;
  ref: string | null;
  ref_type: string | null;
  debit: number;
  credit: number;
  balance_after: number;
  narration: string | null;
  created_at: string | null;
}

export interface LedgerPage {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  entries: LedgerEntry[];
}

export interface WalletData {
  wallet: WalletInfo | null;
  summary: WalletSummary;
  ledger: LedgerPage;
}

export type RefTypeFilter =
  | "ALL"
  | "SETTLEMENT"
  | "SETTLEMENT_DEBIT"
  | "COMMISSION_DEBIT"
  | "MANUAL_CREDIT"
  | "MANUAL_DEBIT"
  | "RECHARGE"
  | "RECHARGE_CASH"
  | "RECHARGE_UPI";

export const walletService = {
  async getWallet(
    page = 1,
    pageSize = 20,
    refType: RefTypeFilter = "ALL"
  ): Promise<WalletData> {
    const { data } = await apiClient.get("/partners/me/wallet", {
      params: { page, page_size: pageSize, ref_type: refType },
    });
    return data;
  },
};
