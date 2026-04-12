import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ChatService } from '../../../services/chat.service';
import { ApiConfigService } from '../../../services/api-config.service';
import { PaymentModalComponent } from '../../../components/payment-modal/payment-modal.component';
import { FREE_MESSAGE_LIMIT } from '../../../constants/payment';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, RouterOutlet, PaymentModalComponent],
  templateUrl: './chat-layout.component.html',
  styleUrl: './chat-layout.component.scss'
})
export class ChatLayoutComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private chat = inject(ChatService);
  private apiConfig = inject(ApiConfigService);
  private router = inject(Router);
  private navSub?: Subscription;

  showPaymentModal = signal(false);
  sidebarOpen = signal(true);
  demoApiUrlInput = signal('');
  demoApiUrlMessage = signal('');
  demoApiUrlMessageType = signal<'success' | 'error'>('success');

  user = this.auth.user;
  chats = signal<Array<{ id: string; title: string; message_count?: number }>>([]);
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
    if (this.auth.isDemoMode()) {
      this.demoApiUrlInput.set(this.apiConfig.getApiBaseUrl());
    }
    this.loadChats();
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.loadChats());
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
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
    if (!this.auth.isDemoMode()) {
      this.auth.loadUser().subscribe();
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  saveDemoApiUrl(): void {
    const value = this.demoApiUrlInput().trim();
    this.demoApiUrlMessage.set('');

    if (!this.isValidHttpUrl(value)) {
      this.demoApiUrlMessageType.set('error');
      this.demoApiUrlMessage.set('API URL must start with http:// or https://');
      return;
    }

    this.apiConfig.setUserApiBaseOverride(value);
    this.demoApiUrlInput.set(this.apiConfig.getApiBaseUrl());
    this.demoApiUrlMessageType.set('success');
    this.demoApiUrlMessage.set('API URL saved for this browser.');
  }

  resetDemoApiUrl(): void {
    this.apiConfig.clearUserApiBaseOverride();
    this.demoApiUrlInput.set(this.apiConfig.getApiBaseUrl());
    this.demoApiUrlMessageType.set('success');
    this.demoApiUrlMessage.set('API URL reset to app default.');
  }

  updateDemoApiUrlInput(value: string): void {
    this.demoApiUrlInput.set(value);
    this.demoApiUrlMessage.set('');
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  isDemoMode = (): boolean => this.auth.isDemoMode();
}
