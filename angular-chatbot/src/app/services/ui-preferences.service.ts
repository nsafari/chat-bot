import { Injectable, signal } from '@angular/core';

const CHAT_FONT_SIZE_KEY = 'chat_font_size';
const DEFAULT_CHAT_FONT_SIZE = 20;
const MIN_CHAT_FONT_SIZE = 16;
const MAX_CHAT_FONT_SIZE = 24;

@Injectable({ providedIn: 'root' })
export class UiPreferencesService {
  readonly minChatFontSize = MIN_CHAT_FONT_SIZE;
  readonly maxChatFontSize = MAX_CHAT_FONT_SIZE;
  private chatFontSizeSignal = signal(this.readChatFontSize());

  chatFontSize = this.chatFontSizeSignal.asReadonly();

  setChatFontSize(size: number): void {
    const normalized = this.clamp(Math.round(size));
    this.chatFontSizeSignal.set(normalized);
    localStorage.setItem(CHAT_FONT_SIZE_KEY, String(normalized));
  }

  resetChatFontSize(): void {
    this.setChatFontSize(DEFAULT_CHAT_FONT_SIZE);
  }

  private readChatFontSize(): number {
    const stored = Number(localStorage.getItem(CHAT_FONT_SIZE_KEY));
    if (!Number.isFinite(stored)) return DEFAULT_CHAT_FONT_SIZE;
    return this.clamp(stored);
  }

  private clamp(value: number): number {
    return Math.min(Math.max(value, MIN_CHAT_FONT_SIZE), MAX_CHAT_FONT_SIZE);
  }
}
