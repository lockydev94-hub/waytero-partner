// ============================================================
// WAYTERO PARTNER PORTAL — SETTINGS SERVICE
// Doc Ref: Partner API §me | Auth API §change-password
// Routes: PATCH /partners/me | POST /auth/change-password
//         POST /partners/me/bank-accounts | POST /partners/me/gst
// ============================================================
import apiClient from "./api";

export interface ProfileUpdatePayload {
  business_name?: string;
  owner_name?: string;
  email?: string;
  logo_url?: string;
  office_address_line_1?: string;
  office_address_line_2?: string;
  office_city_id?: number;
  office_state_id?: number;
  office_postal_code?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface BankAccountPayload {
  account_holder_name: string;
  account_number_encrypted: string;
  ifsc_code: string;
  bank_name: string;
  branch_name?: string;
  account_type: "SAVINGS" | "CURRENT";
  is_primary: boolean;
}

export interface GSTPayload {
  gst_number: string;
  pan_number?: string;
  legal_name?: string;
  trade_name?: string;
  registration_date?: string;
  gst_status?: string;
}

// ── Commission (Doc Ref: Partner API §15 | DB Schema Part 2 §14-15) ────────
// Mirrors GET /partners/me/commission — the commission group assigned to this
// partner (most recent assignment wins) plus the active per-service rules.

export interface CommissionRule {
  id: number;
  service_type: string; // CAB | HOTEL | TOUR
  commission_type: "PERCENTAGE" | "FLAT";
  commission_value: number;
  city_id: number | null;
  city_name: string | null;
  effective_from: string | null;
  effective_to: string | null;
}

export interface CommissionInfo {
  commission_group: {
    id: number;
    group_name: string;
    description: string | null;
    assigned_at: string | null;
  } | null;
  rules: CommissionRule[];
}

export const settingsService = {
  /** GET /partners/me — fetch full partner profile */
  getProfile: () =>
    apiClient.get("/partners/me").then((r) => r.data),

  /** PATCH /partners/me — update business profile */
  updateProfile: (payload: ProfileUpdatePayload) =>
    apiClient.patch("/partners/me", payload).then((r) => r.data),

  /** POST /auth/change-password */
  changePassword: (payload: ChangePasswordPayload) =>
    apiClient.post("/auth/change-password", payload).then((r) => r.data),

  /** POST /partners/me/bank-accounts */
  addBankAccount: (payload: BankAccountPayload) =>
    apiClient.post("/partners/me/bank-accounts", payload).then((r) => r.data),

  /** POST /partners/me/gst */
  addGSTDetails: (payload: GSTPayload) =>
    apiClient.post("/partners/me/gst", payload).then((r) => r.data),

  /** GET /partners/me/commission — commission group + per-service rates */
  getCommission: () =>
    apiClient.get<CommissionInfo>("/partners/me/commission").then((r) => r.data),
};
