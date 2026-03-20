export interface PaymentInitiateRequest {
  amount: number;
  description?: string | null;
  cell_number?: string | null;
  discount_code?: string | null;
}

export interface PaymentInitiateResponse {
  payment_id: string;
  res_num: string;
  token: string;
  redirect_url: string;
  amount: number;
  original_amount: number;
  discount_amount?: number;
  discount_code?: string | null;
}

export interface WalletResponse {
  wallet_id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface DiscountValidateRequest {
  code: string;
  amount: number;
}

export interface DiscountValidateResponse {
  valid: boolean;
  code: string;
  discount_type?: string | null;
  discount_value?: number | null;
  discount_amount?: number | null;
  final_amount?: number | null;
  original_amount?: number | null;
  message: string;
}
