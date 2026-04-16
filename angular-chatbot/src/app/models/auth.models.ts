export interface UserCreate {
  phone_number: string;
  otp_proof: string;
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
  password: string;
}

export interface UserLogin {
  login: string;
  password: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export type OTPPurpose = 'register' | 'reset_password' | 'change_phone';

export interface OTPRequestBody {
  phone_number: string;
  purpose: OTPPurpose;
}

export interface OTPRequestResponse {
  message: string;
  expires_in_seconds: number;
  resend_after_seconds: number;
}

export interface OTPVerifyBody {
  phone_number: string;
  purpose: OTPPurpose;
  code: string;
}

export interface OTPVerifyResponse {
  message: string;
  otp_proof: string;
  proof_expires_in_seconds: number;
}

export interface EmailChangeRequest {
  new_email: string;
  password: string;
}

export interface EmailChangeResponse {
  message: string;
  new_email: string;
  is_verified: boolean;
}

export interface PhoneChangeRequest {
  new_phone_number: string;
  otp_proof: string;
}

export interface PhoneChangeResponse {
  message: string;
  new_phone_number: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface PasswordChangeResponse {
  message: string;
}

export interface UserResponse {
  id?: string | null;
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
  auth_provider?: 'local' | 'google' | 'github' | null;
  is_active?: boolean | null;
  is_admin?: boolean;
  is_verified?: boolean | null;
  avatar_url?: string | null;
  created_at?: string;
  last_login_at?: string | null;
  max_messages_per_day?: number | null;
  rate_limit_per_minute?: number | null;
  /** Final backend field */
  remaining_messages?: number | null;
  /** Backward compatibility with older responses */
  remaining_messages_today?: number | null;
  total_purchased?: number | null;
  total_used?: number | null;
}
