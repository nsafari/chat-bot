import { Component, inject, signal, computed, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ChatService } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';
import { PaymentModalComponent } from '../../../components/payment-modal/payment-modal.component';
import { MarkdownPipe } from '../../../pipes/markdown.pipe';
import type { MessageResponse } from '../../../models/chat.models';
import { Subscription } from 'rxjs';
import type { RAGQueryResponse } from '../../../models/chat.models';

@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaymentModalComponent, MarkdownPipe],
  templateUrl: './chat-view.component.html',
  styleUrl: './chat-view.component.scss'
})
export class ChatViewComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesEl?: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private chat = inject(ChatService);
  private auth = inject(AuthService);
  private sub?: Subscription;
  private scrollPending = false;
  private typingTimer: ReturnType<typeof setInterval> | null = null;
  private optimisticCounter = -1;

  chatId = signal<string | null>(null);
  messages = signal<MessageResponse[]>([]);
  loading = signal(true);
  sending = signal(false);
  error = signal('');
  showPaymentModal = signal(false);

  input = new FormControl('', { nonNullable: true });

  remainingMessages = computed(() => this.auth.user()?.remaining_messages ?? null);
  canSend = computed(() => {
    const r = this.remainingMessages();
    if (r === null) return true;
    return r > 0;
  });
  needsPayment = computed(() => !this.canSend());

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.chatId.set(id);
        this.loadChat(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.clearTypingTimer();
  }

  ngAfterViewChecked(): void {
    if (this.scrollPending && this.messagesEl?.nativeElement) {
      this.scrollPending = false;
      const el = this.messagesEl.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  private scrollToBottom(): void {
    this.scrollPending = true;
  }

  loadChat(id: string): void {
    this.loading.set(true);
    this.chat.getChat(id).subscribe({
      next: (chat) => {
        this.messages.set([...(chat.messages ?? [])]);
        this.loading.set(false);
        this.scrollToBottom();
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.router.navigate(['/chat']);
        } else {
          this.error.set('Failed to load chat');
        }
      }
    });
  }

  send(): void {
    const text = this.input.value.trim();
    const id = this.chatId();
    if (!text || !id || this.sending() || !this.canSend()) {
      if (!this.canSend()) this.showPaymentModal.set(true);
      return;
    }
    this.sending.set(true);
    this.error.set('');
    this.input.setValue('');
    this.appendPendingMessages(id, text);
    this.chat.sendMessage(id, text).subscribe({
      next: (res) => {
        this.replacePendingUserMessage(res.user_message);
        this.startAssistantTyping(res.assistant_message);
        this.auth.updateRemainingMessages(this.extractRemainingCredits(res));
      },
      error: (err) => {
        this.removePendingMessages();
        this.sending.set(false);
        this.input.setValue(text);
        if (err.status === 402 || err.error?.detail?.includes?.('quota')) {
          this.showPaymentModal.set(true);
        } else {
          this.error.set(err.error?.detail ?? 'Failed to send message');
        }
      }
    });
  }

  openPayment(): void {
    this.showPaymentModal.set(true);
  }

  closePayment(): void {
    this.showPaymentModal.set(false);
    this.auth.loadUser().subscribe();
  }

  private appendPendingMessages(chatId: string, userText: string): void {
    const nowIso = new Date().toISOString();
    const userPending: MessageResponse = {
      id: `pending-user-${Math.abs(this.optimisticCounter--)}`,
      chat_session_id: chatId,
      role: 'user',
      content: userText,
      order_index: Number.MAX_SAFE_INTEGER - 1,
      created_at: nowIso
    };
    const assistantPending: MessageResponse = {
      id: `pending-assistant-${Math.abs(this.optimisticCounter--)}`,
      chat_session_id: chatId,
      role: 'assistant',
      content: 'در حال پردازش پاسخ...',
      order_index: Number.MAX_SAFE_INTEGER,
      created_at: nowIso,
      metadata: { pending: true }
    };
    this.messages.update((m) => [...m, userPending, assistantPending]);
    this.scrollToBottom();
  }

  private replacePendingUserMessage(userMessage: MessageResponse): void {
    this.messages.update((items) => {
      const idx = items.findIndex((item) => item.id.startsWith('pending-user-'));
      if (idx === -1) return items;
      const next = [...items];
      next[idx] = userMessage;
      return next;
    });
  }

  private startAssistantTyping(assistantMessage: MessageResponse): void {
    this.clearTypingTimer();
    const fullText = assistantMessage.content ?? '';
    const words = fullText.split(/(\s+)/).filter((part) => part.length > 0);
    let currentText = '';
    let cursor = 0;

    this.messages.update((items) => {
      const idx = items.findIndex((item) => item.id.startsWith('pending-assistant-'));
      if (idx === -1) return [...items, { ...assistantMessage, content: '' }];
      const next = [...items];
      next[idx] = { ...assistantMessage, content: '', metadata: { ...(assistantMessage.metadata ?? {}), streaming: true } };
      return next;
    });

    if (words.length === 0) {
      this.finishAssistantTyping(assistantMessage, '');
      return;
    }

    this.typingTimer = setInterval(() => {
      if (cursor >= words.length) {
        this.finishAssistantTyping(assistantMessage, fullText);
        return;
      }
      currentText += words[cursor];
      cursor += 1;
      this.messages.update((items) => {
        const idx = items.findIndex((item) => item.id === assistantMessage.id);
        if (idx === -1) return items;
        const next = [...items];
        next[idx] = {
          ...assistantMessage,
          content: currentText,
          metadata: { ...(assistantMessage.metadata ?? {}), streaming: true }
        };
        return next;
      });
      this.scrollToBottom();
    }, 35);
  }

  private finishAssistantTyping(assistantMessage: MessageResponse, content: string): void {
    this.clearTypingTimer();
    this.messages.update((items) => {
      const idx = items.findIndex((item) => item.id === assistantMessage.id);
      if (idx === -1) return items;
      const next = [...items];
      next[idx] = { ...assistantMessage, content, metadata: { ...(assistantMessage.metadata ?? {}), streaming: false } };
      return next;
    });
    this.scrollToBottom();
    this.sending.set(false);
  }

  private removePendingMessages(): void {
    this.clearTypingTimer();
    this.messages.update((items) =>
      items.filter((item) => !item.id.startsWith('pending-user-') && !item.id.startsWith('pending-assistant-'))
    );
  }

  private clearTypingTimer(): void {
    if (this.typingTimer) {
      clearInterval(this.typingTimer);
      this.typingTimer = null;
    }
  }

  private extractRemainingCredits(res: RAGQueryResponse): number | null | undefined {
    return res.credits_remaining ?? res.credit_remaining ?? res.quota_remaining ?? undefined;
  }

  formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }
}
