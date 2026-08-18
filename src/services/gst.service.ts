// ============================================================
// WAYTERO PARTNER PORTAL — GST CHALLAN SERVICE
// Endpoints: /partners/me/gst/*
// Doc Ref: BRD §155 GST Integration | Migration 0029
//
// COMPANY partners: have GSTIN, file their own GSTR-1/3B monthly.
//   → They generate/track challans here.
// INDIVIDUAL partners: platform/admin files on their behalf.
//   → They can view GST info but cannot generate challans.
// ============================================================
import apiClient from "./api";

export interface PartnerGSTMonthRecord {
  month: string;          // "YYYY-MM"
  month_label: string;
  year: number;
  total_bookings: number;
  taxable_amount: number;
  gst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  gst_number: string | null;
  challan_number: string | null;
  challan_date: string | null;
  challan_status: "PENDING" | "GENERATED" | "FILED";
  filed_date: string | null;
  has_bookings: boolean;
}

export interface PartnerGSTSummaryResponse {
  year: number;
  partner_type: "COMPANY" | "INDIVIDUAL";
  gst_number: string | null;
  is_gst_enabled: boolean;
  records: PartnerGSTMonthRecord[];
  yearly_summary: {
    total_gst: number;
    total_taxable: number;
    total_cgst: number;
    total_sgst: number;
  };
}

export interface GeneratePartnerChallanRequest {
  month: string;           // "YYYY-MM"
  challan_number?: string;
  notes?: string;
}

export interface GeneratePartnerChallanResponse {
  success: boolean;
  message: string;
  month: string;
  gst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  challan_number: string | null;
  status: string;
}

export interface MarkPartnerFiledRequest {
  month: string;
  filed_date?: string;
  notes?: string;
}

const BASE = "/partners";

export const gstService = {
  /** Monthly GST summary for the authenticated partner */
  summary: (year?: number): Promise<PartnerGSTSummaryResponse> =>
    apiClient.get(`${BASE}/me/gst/summary`, { params: { year } }).then(r => r.data),

  /** Generate / update a challan record for a specific month */
  generateChallan: (payload: GeneratePartnerChallanRequest): Promise<GeneratePartnerChallanResponse> =>
    apiClient.post(`${BASE}/me/gst/challan`, payload).then(r => r.data),

  /** Mark a challan as FILED after paying on the GST portal */
  markFiled: (payload: MarkPartnerFiledRequest): Promise<{ success: boolean; message: string }> =>
    apiClient.post(`${BASE}/me/gst/mark-filed`, payload).then(r => r.data),
};
