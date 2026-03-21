import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiConfigService {
  getApiBaseUrl(): string {
    return (typeof (window as unknown as { __apiBase?: string }).__apiBase === 'string'
      ? (window as unknown as { __apiBase: string }).__apiBase
      : environment.apiUrl) ?? '';
  }
}
