export interface UserCreate {
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
  remaining_messages_today?: number | null;
}
