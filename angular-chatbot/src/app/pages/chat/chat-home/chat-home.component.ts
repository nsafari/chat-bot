import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ChatService } from '../../../services/chat.service';

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

  startNew(): void {
    this.chat.createChat().subscribe({
      next: (c) => this.router.navigate(['/chat', c.id])
    });
  }
}
