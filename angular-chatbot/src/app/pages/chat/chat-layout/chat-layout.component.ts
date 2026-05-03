import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ChatService } from '../../../services/chat.service';
import type { ChatResponse } from '../../../models/chat.models';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './chat-layout.component.html',
  styleUrl: './chat-layout.component.scss'
})
export class ChatLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private chat = inject(ChatService);
  private router = inject(Router);

  sidebarOpen = signal(true);

  user = this.auth.user;
  chats = signal<ChatResponse[]>([]);
  loadingChats = signal(true);
  creatingChat = signal(false);

  userDisplayName = computed(() => {
    const u = this.user();
    return u?.username || u?.email || u?.phone_number || 'حساب کاربری';
  });

  remainingMessages = computed(() => this.auth.user()?.remaining_messages ?? null);
  needsPayment = computed(() => {
    const r = this.remainingMessages();
    return r !== null && r <= 0;
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
    if (this.creatingChat()) return;
    const emptyChat = this.chats().find((chat) => (chat.message_count ?? 0) === 0);
    if (emptyChat) {
      this.router.navigate(['/chat', emptyChat.id]);
      this.closeSidebarOnMobile();
      return;
    }
    this.creatingChat.set(true);
    this.chat.createChat().subscribe({
      next: (chat) => {
        this.loadChats();
        this.router.navigate(['/chat', chat.id]);
        this.closeSidebarOnMobile();
      },
      complete: () => this.creatingChat.set(false),
      error: () => this.creatingChat.set(false)
    });
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
