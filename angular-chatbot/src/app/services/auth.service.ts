import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import type { UserCreate, UserLogin, Token, UserResponse } from '../models/auth.models';
import { ApiConfigService } from './api-config.service';

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const USER_KEY = 'user';

/** Demo credentials to try the UI without a backend: demo / demo123 */
export const DEMO_CREDENTIALS = { login: 'demo', password: 'demo123' };
const DEMO_TOKEN = 'demo';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private get apiUrl(): string {
    return `${this.apiConfig.getApiBaseUrl()}/api/v1/auth`;
  }

  private userSignal = signal<UserResponse | null>(null);
  private tokenSignal = signal<string | null>(this.getStoredToken());

  user = this.userSignal.asReadonly();
  token = this.tokenSignal.asReadonly();
  isAuthenticated = computed(() => !!this.tokenSignal());

  constructor(
    private http: HttpClient,
    private router: Router,
    private apiConfig: ApiConfigService
  ) {
    const token = this.tokenSignal();
    if (token) {
      if (token === DEMO_TOKEN) {
        const stored = localStorage.getItem(USER_KEY);
        if (stored) {
          try {
            this.userSignal.set(JSON.parse(stored));
          } catch {
            this.demoLogin();
          }
        } else {
          this.demoLogin();
        }
      } else {
        this.loadUser().subscribe();
      }
    }
  }

  register(data: UserCreate): Observable<Token> {
    return this.http.post<Token>(`${this.apiUrl}/register`, data).pipe(
      tap((res) => this.handleAuthSuccess(res))
    );
  }

  login(data: UserLogin): Observable<Token> {
    return this.http.post<Token>(`${this.apiUrl}/login`, data).pipe(
      tap((res) => this.handleAuthSuccess(res))
    );
  }

  logout(): Observable<unknown> {
    if (this.isDemoMode()) {
      this.clearAuth();
      return of(null);
    }
    return this.http.post(`${this.apiUrl}/logout`, {}).pipe(
      tap(() => this.clearAuth()),
      catchError(() => {
        this.clearAuth();
        return of(null);
      })
    );
  }

  /** Demo login – bypasses API, lets you explore the UI without a backend */
  demoLogin(): void {
    const mockUser: UserResponse = {
      username: 'demo',
      email: 'demo@example.com',
      full_name: 'Demo User',
      remaining_messages_today: 3,
      is_admin: false,
      created_at: new Date().toISOString()
    };
    localStorage.setItem(TOKEN_KEY, DEMO_TOKEN);
    localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
    localStorage.removeItem(REFRESH_KEY);
    this.tokenSignal.set(DEMO_TOKEN);
    this.userSignal.set(mockUser);
  }

  isDemoMode(): boolean {
    return this.getAccessToken() === DEMO_TOKEN;
  }

  /** Demo mode: update remaining messages (for mock send) */
  setRemainingMessages(n: number): void {
    const u = this.userSignal();
    if (u) {
      const updated = { ...u, remaining_messages_today: n };
      this.userSignal.set(updated);
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
    }
  }

  refreshToken(): Observable<Token> {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) {
      this.clearAuth();
      return of(null as unknown as Token);
    }
    return this.http.post<Token>(`${this.apiUrl}/refresh`, { refresh_token: refresh }).pipe(
      tap((res) => this.handleAuthSuccess(res)),
      catchError(() => {
        this.clearAuth();
        return of(null as unknown as Token);
      })
    );
  }

  loadUser(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiUrl}/me`).pipe(
      tap((user) => {
        this.userSignal.set(user);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      })
    );
  }

  getGoogleLoginUrl(): string {
    return `${this.apiUrl}/google/login`;
  }

  getGithubLoginUrl(): string {
    return `${this.apiUrl}/github/login`;
  }

  getAccessToken(): string | null {
    return this.tokenSignal() ?? this.getStoredToken();
  }

  getRemainingMessages(): number | null {
    return this.userSignal()?.remaining_messages_today ?? null;
  }

  private handleAuthSuccess(res: Token): void {
    localStorage.setItem(TOKEN_KEY, res.access_token);
    localStorage.setItem(REFRESH_KEY, res.refresh_token);
    this.tokenSignal.set(res.access_token);
    const user = (res as Token & { user?: UserResponse }).user;
    if (user) {
      this.userSignal.set(user);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      this.loadUser().subscribe();
    }
  }

  private clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
}
