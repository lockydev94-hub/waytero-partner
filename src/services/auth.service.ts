// ============================================================
// WAYTERO PARTNER PORTAL — AUTH SERVICE
// Doc Ref: Auth Flow §6 — Partner Login (password + OTP)
// POST /auth/partner/login       → email/mobile + password
// POST /auth/partner/login/otp   → mobile + OTP  (corrected from /otp-login)
// POST /auth/partner/change-first-password → set new password
// POST /auth/logout
// ============================================================
import apiClient from "./api";
import type { LoginResponse, RefreshResponse } from "../types/auth";

export const authService = {
  /** Password login with mobile or email */
  loginWithPassword: async (identifier: string, password: string): Promise<LoginResponse> => {
    const isEmail = identifier.includes("@");
    const payload = isEmail
      ? { email: identifier, password, device_name: "Partner Portal Web" }
      : { mobile: identifier, password, device_name: "Partner Portal Web" };
    // Backend returns LoginResponse directly (no success/data wrapper)
    const res = await apiClient.post<LoginResponse>("/auth/partner/login", payload);
    return res.data;
  },

  /** OTP login — send OTP first via /auth/send-otp then call this */
  loginWithOtp: async (mobile: string, otp: string): Promise<LoginResponse> => {
    // Correct endpoint: /auth/partner/login/otp (not /otp-login)
    const res = await apiClient.post<LoginResponse>("/auth/partner/login/otp", {
      mobile,
      otp,
      device_name: "Partner Portal Web",
    });
    return res.data;
  },

  /** Send OTP to mobile */
  sendOtp: async (mobile: string): Promise<{ mobile_number: string; message: string; expires_in_seconds: number; dev_otp?: string }> => {
    const res = await apiClient.post("/auth/send-otp", { mobile, purpose: "LOGIN" });
    return res.data;
  },

  /** Change password (first login — replaces Waytero@15). Returns MessageResponse { success, message } */
  changeFirstPassword: async (newPassword: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post("/auth/partner/change-first-password", { new_password: newPassword });
    return res.data;
  },

  /** Get authenticated user profile */
  getMe: async () => {
    const res = await apiClient.get("/auth/me");
    return res.data.data;
  },

  /** Initiate password reset — sends OTP to email or mobile */
  forgotPassword: async (identifier: string): Promise<{
    success: boolean;
    message: string;
    data: { channel: string | null; reset_token: string; masked_identifier: string; dev_otp?: string };
  }> => {
    const res = await apiClient.post("/auth/forgot-password", { identifier });
    return res.data;
  },

  /** Reset password with OTP + reset token */
  resetPassword: async (
    resetToken: string,
    otp: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post("/auth/reset-password", {
      reset_token: resetToken,
      otp,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
    return res.data;
  },

  /** Logout */
  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post("/auth/logout", { refresh_token: refreshToken, logout_all_devices: false });
  },

  /** Refresh access token — backend returns flat RefreshResponse (no data wrapper) */
  refresh: async (refreshToken: string): Promise<RefreshResponse> => {
    const res = await apiClient.post<RefreshResponse>("/auth/refresh", { refresh_token: refreshToken });
    return res.data;
  },
};
