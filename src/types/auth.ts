export interface AuthUser {
  id: string;
  mobile: string;
  email: string | null;
  full_name: string;
  user_type: string;
  status: string;
  roles: string[];
  permissions: string[];
  is_mobile_verified: boolean;
  is_email_verified: boolean;
  must_change_password: boolean;
  partner_id: number | null;  // Integer partners.id — populated for PARTNER user_type
  /** No unlock PIN yet: idle currently signs the partner out instead of locking. */
  must_set_mpin?: boolean;
}
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}
/**
 * Backend LoginResponse shape (no success/data wrapper):
 * { user: AuthUser, tokens: TokenResponse, session_id: string }
 */
export interface LoginResponse {
  user: AuthUser;
  tokens: TokenResponse;
  session_id: string;
}
/**
 * Backend RefreshResponse shape (flat, no success/data wrapper):
 * { access_token, token_type, expires_in, permissions, roles }
 */
export interface RefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  roles: string[];
  permissions: string[];
}

/** Mirrors backend SessionConfigResponse — GET /auth/admin/session-config */
export interface SessionConfig {
  has_mpin: boolean;
  has_password: boolean;
  idle_minutes: number;
  idle_lock_minutes: number | null;
  idle_default_minutes: number;
  daily_logout_hour: number;
  timezone: string;
  server_now: string;
  mpin_locked_until: string | null;
  mpin_attempts_remaining: number | null;
  mpin_min_length: number;
  access_token_expires_in: number;
  session_started_at?: string | null;
  session_expires_at?: string | null;
}
