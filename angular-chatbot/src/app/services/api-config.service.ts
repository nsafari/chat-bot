import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiConfigService {
  private static readonly USER_API_URL_KEY = 'user_api_url_override';

  getApiBaseUrl(): string {
    const userOverride = this.getUserApiBaseOverride();
    if (userOverride) return userOverride;
    return this.normalizeBaseUrl(
      (typeof (window as unknown as { __apiBase?: string }).__apiBase === 'string'
        ? (window as unknown as { __apiBase: string }).__apiBase
        : environment.apiUrl) ?? ''
    );
  }

  getUserApiBaseOverride(): string {
    return this.normalizeBaseUrl(localStorage.getItem(ApiConfigService.USER_API_URL_KEY) ?? '');
  }

  setUserApiBaseOverride(url: string): void {
    const normalized = this.normalizeBaseUrl(url);
    if (!normalized) {
      localStorage.removeItem(ApiConfigService.USER_API_URL_KEY);
      return;
    }
    localStorage.setItem(ApiConfigService.USER_API_URL_KEY, normalized);
  }

  clearUserApiBaseOverride(): void {
    localStorage.removeItem(ApiConfigService.USER_API_URL_KEY);
  }

  private normalizeBaseUrl(url: string): string {
    return url.trim().replace(/\/+$/, '');
  }
}
