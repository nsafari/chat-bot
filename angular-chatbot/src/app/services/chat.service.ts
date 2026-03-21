import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from './api-config.service';
import { AuthService } from './auth.service';
import { DemoDataService } from './demo-data.service';
import type {
  ChatCreate,
  ChatListResponse,
  ChatResponse,
  ChatWithMessages,
  ChatUpdate,
  MessageCreate,
  RAGQueryResponse
} from '../models/chat.models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private auth = inject(AuthService);
  private demo = inject(DemoDataService);

  constructor(
    private http: HttpClient,
    private apiConfig: ApiConfigService
  ) {}

  private get apiUrl(): string {
    return `${this.apiConfig.getApiBaseUrl()}/api/v1/chats`;
  }

  createChat(title?: string): Observable<ChatResponse> {
    if (this.auth.isDemoMode()) return this.demo.createChat(title);
    return this.http.post<ChatResponse>(this.apiUrl, { title: title ?? 'New Chat' });
  }

  listChats(skip = 0, limit = 20, includeDeleted = false): Observable<ChatListResponse> {
    if (this.auth.isDemoMode()) return this.demo.listChats();
    const params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString())
      .set('include_deleted', includeDeleted.toString());
    return this.http.get<ChatListResponse>(this.apiUrl, { params });
  }

  getChat(chatId: string): Observable<ChatWithMessages> {
    if (this.auth.isDemoMode()) return this.demo.getChat(chatId);
    return this.http.get<ChatWithMessages>(`${this.apiUrl}/${chatId}`);
  }

  updateChat(chatId: string, title: string): Observable<ChatResponse> {
    if (this.auth.isDemoMode()) return this.demo.updateChat(chatId, title);
    return this.http.patch<ChatResponse>(`${this.apiUrl}/${chatId}`, { title });
  }

  deleteChat(chatId: string): Observable<void> {
    if (this.auth.isDemoMode()) return this.demo.deleteChat(chatId);
    return this.http.delete<void>(`${this.apiUrl}/${chatId}`);
  }

  restoreChat(chatId: string): Observable<ChatResponse> {
    if (this.auth.isDemoMode()) return this.demo.restoreChat(chatId);
    return this.http.post<ChatResponse>(`${this.apiUrl}/${chatId}/restore`, {});
  }

  sendMessage(chatId: string, content: string): Observable<RAGQueryResponse> {
    if (this.auth.isDemoMode()) return this.demo.sendMessage(chatId, content);
    return this.http.post<RAGQueryResponse>(`${this.apiUrl}/${chatId}/messages`, { content });
  }
}
