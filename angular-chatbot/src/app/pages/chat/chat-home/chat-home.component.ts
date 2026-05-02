import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ChatService } from '../../../services/chat.service';
import type { ChatResponse } from '../../../models/chat.models';

@Component({
  selector: 'app-chat-home',
  standalone: true,
  imports: [],
  templateUrl: './chat-home.component.html',
  styleUrl: './chat-home.component.scss'
})
export class ChatHomeComponent {
  private chat = inject(ChatService);
  private router = inject(Router);
  creating = false;

  startNew(): void {
    if (this.creating) return;
    this.creating = true;
    this.chat.listChats(0, 50).subscribe({
      next: (res) => {
        const emptyChat = this.findEmptyChat(res.chats);
        if (emptyChat) {
          this.creating = false;
          this.router.navigate(['/chat', emptyChat.id]);
          return;
        }
        this.createChat();
      },
      error: () => this.createChat()
    });
  }

  private createChat(): void {
    this.chat.createChat().subscribe({
      next: (c) => this.router.navigate(['/chat', c.id]),
      error: () => {
        this.creating = false;
      },
      complete: () => {
        this.creating = false;
      }
    });
  }

  private findEmptyChat(chats: ChatResponse[]): ChatResponse | undefined {
    return chats.find((chat) => !chat.is_deleted && (chat.message_count ?? 0) === 0);
  }
}
