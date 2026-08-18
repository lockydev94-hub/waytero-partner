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
