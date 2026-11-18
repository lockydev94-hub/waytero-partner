// ============================================================
// WAYTERO PARTNER — MPIN / SESSION-POLICY SERVICE
// The backend routes are mounted under /auth/admin/* for historical reasons,
// but the service accepts every dashboard account, including PARTNER.
//
//   GET    /auth/admin/session-config
//   POST   /auth/admin/mpin/set|change|verify
//   DELETE /auth/admin/mpin
//   PUT    /auth/admin/idle-lock-minutes
//
// A PIN is never returned by the server and never kept in client state.
// ============================================================
import apiClient from "./api";
import type { SessionConfig } from "../types/auth";

type ConfigEnvelope = { success: boolean; data: SessionConfig };

export interface OTPSentResponse {
  mobile_number: string;
  message: string;
  expires_in_seconds: number;
  dev_otp?: string | null;
}

export const mpinService = {
  getSessionConfig: async (): Promise<SessionConfig> => {
    const res = await apiClient.get<SessionConfig>("/auth/admin/session-config");
    return res.data;
  },

  setMpin: async (payload: {
    mpin: string;
    confirm_mpin: string;
    current_password?: string;
    otp?: string;
  }): Promise<SessionConfig> => {
    const res = await apiClient.post<ConfigEnvelope>("/auth/admin/mpin/set", payload);
    return res.data.data;
  },

  sendMpinOtp: async (): Promise<OTPSentResponse> => {
    const res = await apiClient.post<OTPSentResponse>("/auth/admin/mpin/otp");
    return res.data;
  },

  changeMpin: async (payload: {
    current_mpin: string;
    new_mpin: string;
    confirm_mpin: string;
  }): Promise<SessionConfig> => {
    const res = await apiClient.post<ConfigEnvelope>(
      "/auth/admin/mpin/change",
      payload
    );
    return res.data.data;
  },

  verifyMpin: async (mpin: string): Promise<void> => {
    await apiClient.post("/auth/admin/mpin/verify", { mpin });
  },

  removeMpin: async (payload: {
    current_password?: string;
    current_mpin?: string;
  }): Promise<SessionConfig> => {
    const res = await apiClient.delete<ConfigEnvelope>("/auth/admin/mpin", {
      data: payload,
    });
    return res.data.data;
  },

  setIdleLockMinutes: async (
    idle_lock_minutes: number | null
  ): Promise<SessionConfig> => {
    const res = await apiClient.put<ConfigEnvelope>(
      "/auth/admin/idle-lock-minutes",
      { idle_lock_minutes }
    );
    return res.data.data;
  },
};
