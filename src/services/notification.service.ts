// ============================================================
// WAYTERO PARTNER PORTAL — NOTIFICATION SERVICE
// Doc Ref: BRD Part 7 §155 — Notification engine
//
// Endpoints (mounted under /notifications by Backend):
//   POST   /me/fcm-token             register a browser/device token
//   DELETE /me/fcm-token             deactivate a token
//   GET    /me/notifications         inbox list (paginated)
//   POST   /me/notifications/{id}/read   mark one read
//   POST   /me/notifications/read-all    mark every unread read
//   GET    /me/notifications/unread-count  badge counter
// ============================================================

import apiClient from "./api";

export interface NotificationItem {
  id: number;
  event_type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  booking_id: number | null;
  delivered_via: string;
  read_at: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  unread_count: number;
}

export const notificationService = {
  registerFcmToken: async (fcmToken: string, platform: "WEB" | "ANDROID" | "IOS" = "WEB") => {
    const res = await apiClient.post("/notifications/me/fcm-token", {
      fcm_token: fcmToken,
      platform,
      user_agent: navigator.userAgent,
    });
    return res.data;
  },

  deactivateFcmToken: async (fcmToken: string) => {
    await apiClient.delete("/notifications/me/fcm-token", {
      data: { fcm_token: fcmToken, platform: "WEB" },
    });
  },

  list: async (params?: { unread_only?: boolean; limit?: number; offset?: number }) => {
    const res = await apiClient.get<NotificationListResponse>("/notifications/me/notifications", { params });
    return res.data;
  },

  unreadCount: async () => {
    const res = await apiClient.get<{ unread_count: number }>(
      "/notifications/me/notifications/unread-count"
    );
    return res.data.unread_count;
  },

  markRead: async (id: number) => {
    await apiClient.post(`/notifications/me/notifications/${id}/read`);
  },

  markAllRead: async () => {
    const res = await apiClient.post<{ marked: number }>(
      "/notifications/me/notifications/read-all"
    );
    return res.data;
  },
};
