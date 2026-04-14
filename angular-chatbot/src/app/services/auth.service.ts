import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import type {
  UserCreate,
  UserLogin,
  Token,
  UserResponse,
  OTPRequestBody,
  OTPRequestResponse,
  OTPVerifyBody,
  OTPVerifyResponse
} from '../models/auth.models';
import { ApiConfigService } from './api-config.service';

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const USER_KEY = 'user';

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
      this.loadUser().subscribe();
    }
  }

  register(data: UserCreate): Observable<Token> {
    return this.http.post<Token>(`${this.apiUrl}/register`, data).pipe(
      tap((res) => this.handleAuthSuccess(res))
    );
  }

  requestOtp(data: OTPRequestBody): Observable<OTPRequestResponse> {
    return this.http.post<OTPRequestResponse>(`${this.apiUrl}/otp/request`, data);
  }

  verifyOtp(data: OTPVerifyBody): Observable<OTPVerifyResponse> {
    return this.http.post<OTPVerifyResponse>(`${this.apiUrl}/otp/verify`, data);
  }

  login(data: UserLogin): Observable<Token> {
    return this.http.post<Token>(`${this.apiUrl}/login`, data).pipe(
      tap((res) => this.handleAuthSuccess(res))
    );
  }

  logout(): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/logout`, {}).pipe(
      tap(() => this.clearAuth()),
      catchError(() => {
        this.clearAuth();
        return of(null);
      })
    );
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
    return this.userSignal()?.remaining_messages ?? this.userSignal()?.remaining_messages_today ?? null;
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
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return null;
    }

    // Legacy demo-mode token can leak into real requests.
    if (token.trim().toLowerCase() === 'demo') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      return null;
    }

    return token;
  }
}
