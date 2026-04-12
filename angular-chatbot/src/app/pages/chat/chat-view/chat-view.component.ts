import { Component, inject, signal, computed, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ChatService } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';
import { PaymentModalComponent } from '../../../components/payment-modal/payment-modal.component';
import type { MessageResponse } from '../../../models/chat.models';
import { FREE_MESSAGE_LIMIT } from '../../../constants/payment';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaymentModalComponent],
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
    this.chat.sendMessage(id, text).subscribe({
      next: (res) => {
        this.messages.update((m) => [
          ...m,
          res.user_message,
          res.assistant_message
        ]);
        this.scrollToBottom();
        if (!this.auth.isDemoMode()) this.auth.loadUser().subscribe();
        this.sending.set(false);
      },
      error: (err) => {
        this.sending.set(false);
        this.input.setValue(text);
        if (this.auth.isDemoMode()) {
          this.error.set('حالت دمو – برای ارسال پیام به بک‌اند متصل شوید.');
        } else if (err.status === 402 || err.error?.detail?.includes?.('quota')) {
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
    if (!this.auth.isDemoMode()) {
      this.auth.loadUser().subscribe();
    }
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
