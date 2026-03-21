import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from './api-config.service';
import type {
  PaymentInitiateRequest,
  PaymentInitiateResponse,
  WalletResponse,
  DiscountValidateRequest,
  DiscountValidateResponse
} from '../models/payment.models';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  constructor(
    private http: HttpClient,
    private apiConfig: ApiConfigService
  ) {}

  private get apiUrl(): string {
    return `${this.apiConfig.getApiBaseUrl()}/api/v1/payment`;
  }

  initiatePayment(request: PaymentInitiateRequest): Observable<PaymentInitiateResponse> {
    return this.http.post<PaymentInitiateResponse>(`${this.apiUrl}/initiate`, request);
  }

  getWalletBalance(): Observable<WalletResponse> {
    return this.http.get<WalletResponse>(`${this.apiUrl}/wallet/balance`);
  }

  validateDiscount(code: string, amount: number): Observable<DiscountValidateResponse> {
    return this.http.post<DiscountValidateResponse>(`${this.apiUrl}/discount/validate`, {
      code,
      amount
    } as DiscountValidateRequest);
  }
}
