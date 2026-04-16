export interface PricingResponse {
  price_per_message: number;
  free_messages_for_new_users: number;
  min_purchase: number;
  max_purchase: number;
  currency?: string;
}

export interface PurchaseRequest {
  message_count: number;
}

export interface PurchaseResponse {
  purchased: number;
  amount_charged: number;
  remaining: number;
  wallet_tx_id: string;
}
