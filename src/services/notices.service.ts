// ============================================================
// WAYTERO PARTNER — NOTICES SERVICE
// Admin → partner notices shown as a banner at the top of the
// portal (wallet low balance, driver-assign pending, document
// expiry, policy updates…). Dismissing marks the notice read for
// this partner only.
//
//   GET  /partners/me/notices            active notices + read state
//   POST /partners/me/notices/{id}/read  dismiss for this partner
// ============================================================
import apiClient from "./api";

export interface PartnerNotice {
  id: number;
  notice_type: string;
  title: string;
  body: string | null;
  priority: "NORMAL" | "HIGH" | "URGENT";
  read: boolean;
  read_at: string | null;
  created_at: string | null;
}

export interface NoticesResponse {
  items: PartnerNotice[];
  unread: number;
}

export const noticesService = {
  async list(): Promise<NoticesResponse> {
    const res = await apiClient.get<NoticesResponse>("/partners/me/notices");
    return res.data;
  },

  async markRead(id: number): Promise<{ success: boolean }> {
    const res = await apiClient.post(`/partners/me/notices/${id}/read`);
    return res.data;
  },
};
