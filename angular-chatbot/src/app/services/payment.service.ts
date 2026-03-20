import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  PaymentInitiateRequest,
  PaymentInitiateResponse,
  WalletResponse,
  DiscountValidateRequest,
  DiscountValidateResponse
} from '../models/payment.models';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/payment`;

  constructor(private http: HttpClient) {}

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
