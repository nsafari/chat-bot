import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ChatService } from '../../../services/chat.service';
import { PaymentModalComponent } from '../../../components/payment-modal/payment-modal.component';
import { FREE_MESSAGE_LIMIT } from '../../../constants/payment';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, PaymentModalComponent],
  templateUrl: './chat-layout.component.html',
  styleUrl: './chat-layout.component.scss'
})
export class ChatLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private chat = inject(ChatService);
  private router = inject(Router);

  showPaymentModal = signal(false);
  sidebarOpen = signal(true);

  user = this.auth.user;
  chats = signal<Array<{ id: string; title: string }>>([]);
  loadingChats = signal(true);

  remainingMessages = computed(() => this.auth.user()?.remaining_messages ?? null);
  needsPayment = computed(() => {
    const r = this.remainingMessages();
    return r !== null && r <= 0;
  });
  freeMessagesLeft = computed(() => {
    const r = this.remainingMessages();
    return r !== null ? Math.max(0, r) : FREE_MESSAGE_LIMIT;
  });

  ngOnInit(): void {
    this.loadChats();
  }

  loadChats(): void {
    this.loadingChats.set(true);
    this.chat.listChats(0, 50).subscribe({
      next: (res) => {
        const seen = new Set<string>();
        const unique = res.chats.filter((c) => {
          if (c.is_deleted || seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        });
        this.chats.set(unique);
        this.loadingChats.set(false);
      },
      error: () => this.loadingChats.set(false)
    });
  }

  logout(): void {
    this.auth.logout().subscribe();
  }

  newChat(): void {
    this.chat.createChat().subscribe({
      next: (chat) => {
        this.loadChats();
        this.router.navigate(['/chat', chat.id]);
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

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebarOnMobile(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.sidebarOpen.set(false);
    }
  }

  deleteChat(chatId: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.chat.deleteChat(chatId).subscribe({
      next: () => {
        this.chats.update((items) => items.filter((item) => item.id !== chatId));
        if (this.router.url.includes(`/chat/${chatId}`)) {
          this.router.navigate(['/chat']);
        }
      }
    });
  }

  isActiveChat(chatId: string): boolean {
    return this.router.url.includes(`/chat/${chatId}`);
  }
}
