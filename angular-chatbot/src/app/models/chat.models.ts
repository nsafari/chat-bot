export interface ChatCreate {
  title?: string | null;
}

export interface ChatUpdate {
  title: string;
}

export interface ChatResponse {
  id: string;
  user_id: string;
  title: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message_at?: string | null;
}

export interface ChatListResponse {
  total: number;
  chats: ChatResponse[];
  skip: number;
  limit: number;
}

export interface MessageResponse {
  id: string;
  chat_session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  usage?: Record<string, unknown> | null;
  order_index: number;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface MessageCreate {
  content: string;
}

export interface RAGQueryResponse {
  message_id: string;
  chat_id: string;
  user_message: MessageResponse;
  assistant_message: MessageResponse;
  processing_time_ms: number;
  credits_remaining?: number | null;
  /** Backward compatibility for older backend responses */
  quota_remaining?: number;
}

export interface ChatWithMessages extends ChatResponse {
  messages: MessageResponse[];
}
