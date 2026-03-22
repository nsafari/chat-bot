import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { delay, of } from 'rxjs';
import type {
  ChatListResponse,
  ChatResponse,
  ChatWithMessages,
  MessageResponse,
  RAGQueryResponse
} from '../models/chat.models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class DemoDataService {
  private auth = inject(AuthService);

  private chats: ChatWithMessages[] = [
    this.makeChat('demo-chat-1', 'نمونه مکالمه', [
      { role: 'user' as const, content: 'چطور می‌توانی کمکم کنی؟', order: 0 },
      { role: 'assistant' as const, content: 'می‌توانم به سوالات پاسخ دهم، مکالمه کنم و در کارهای مختلف کمک کنم. هر چیزی بپرس!', order: 1 }
    ]),
    this.makeChat('demo-chat-2', 'دمو سریع', [
      { role: 'user' as const, content: 'سلام!', order: 0 },
      { role: 'assistant' as const, content: 'سلام! امروز چطور می‌توانم کمکتان کنم؟', order: 1 }
    ])
  ];

  private makeChat(id: string, title: string, msgData: { role: 'user' | 'assistant'; content: string; order: number }[]): ChatWithMessages {
    const now = new Date().toISOString();
    const messages: MessageResponse[] = msgData.map((m, i) => ({
      id: `${id}-msg-${i}`,
      chat_session_id: id,
      role: m.role,
      content: m.content,
      order_index: m.order,
      created_at: now
    }));
    return {
      id,
      user_id: 'demo',
      title,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      message_count: messages.length,
      last_message_at: now,
      messages
    };
  }

  listChats(): Observable<ChatListResponse> {
    const list = this.chats.map((c) => ({
      id: c.id,
      user_id: c.user_id,
      title: c.title,
      is_deleted: c.is_deleted,
      created_at: c.created_at,
      updated_at: c.updated_at,
      message_count: c.messages.length,
      last_message_at: c.last_message_at
    }));
    return of({
      total: list.length,
      chats: list,
      skip: 0,
      limit: 20
    }).pipe(delay(300));
  }

  createChat(title?: string): Observable<ChatResponse> {
    const id = `demo-chat-${Date.now()}`;
    const newCount = this.chats.length + 1;
    const defaultTitle = title ?? (newCount === 1 ? 'چت جدید' : `چت ${newCount}`);
    const chat = this.makeChat(id, defaultTitle, []);
    this.chats.unshift(chat);
    return of({
      id: chat.id,
      user_id: chat.user_id,
      title: chat.title,
      is_deleted: chat.is_deleted,
      created_at: chat.created_at,
      updated_at: chat.updated_at,
      message_count: 0,
      last_message_at: null
    }).pipe(delay(200));
  }

  getChat(chatId: string): Observable<ChatWithMessages> {
    const chat = this.chats.find((c) => c.id === chatId);
    if (!chat) {
      const empty = this.makeChat(chatId, 'چت جدید', []);
      this.chats.unshift(empty);
      return of(empty).pipe(delay(200));
    }
    return of({ ...chat }).pipe(delay(200));
  }

  private toChatResponse(c: ChatWithMessages): ChatResponse {
    return {
      id: c.id,
      user_id: c.user_id,
      title: c.title,
      is_deleted: c.is_deleted,
      created_at: c.created_at,
      updated_at: c.updated_at,
      message_count: c.messages.length,
      last_message_at: c.last_message_at
    };
  }

  updateChat(chatId: string, title: string): Observable<ChatResponse> {
    const chat = this.chats.find((c) => c.id === chatId);
    if (chat) {
      chat.title = title;
      chat.updated_at = new Date().toISOString();
      return of(this.toChatResponse(chat)).pipe(delay(150));
    }
    const newChat = this.makeChat(chatId, title, []);
    this.chats.unshift(newChat);
    return of(this.toChatResponse(newChat)).pipe(delay(150));
  }

  deleteChat(chatId: string): Observable<void> {
    this.chats = this.chats.filter((c) => c.id !== chatId) as ChatWithMessages[];
    return of(undefined).pipe(delay(150));
  }

  restoreChat(chatId: string): Observable<ChatResponse> {
    const chat = this.chats.find((c) => c.id === chatId);
    if (chat) {
      chat.is_deleted = false;
      return of(this.toChatResponse(chat)).pipe(delay(150));
    }
    const newChat = this.makeChat(chatId, 'چت جدید', []);
    this.chats.unshift(newChat);
    return of(this.toChatResponse(newChat)).pipe(delay(150));
  }

  sendMessage(chatId: string, content: string): Observable<RAGQueryResponse> {
    let chat = this.chats.find((c) => c.id === chatId);
    if (!chat) {
      chat = this.makeChat(chatId, 'چت جدید', []);
      this.chats.unshift(chat);
    }
    const now = new Date().toISOString();
    const userMsg: MessageResponse = {
      id: `msg-u-${Date.now()}`,
      chat_session_id: chatId,
      role: 'user',
      content,
      order_index: chat.messages.length,
      created_at: now
    };
    const assistMsg: MessageResponse = {
      id: `msg-a-${Date.now()}`,
      chat_session_id: chatId,
      role: 'assistant',
      content: 'این پاسخ دمو است. به بک‌اند واقعی متصل شوید تا پاسخ هوش مصنوعی دریافت کنید.',
      order_index: chat.messages.length + 1,
      created_at: now
    };
    chat.messages.push(userMsg, assistMsg);
    chat.message_count = chat.messages.length;
    chat.last_message_at = now;
    chat.updated_at = now;

    const remaining = (this.auth.user()?.remaining_messages_today ?? 3) - 1;
    this.auth.setRemainingMessages(remaining);

    return of({
      message_id: assistMsg.id,
      chat_id: chatId,
      user_message: userMsg,
      assistant_message: assistMsg,
      processing_time_ms: 150,
      quota_remaining: Math.max(0, remaining)
    }).pipe(delay(400));
  }
}
