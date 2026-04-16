import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from './api-config.service';
import type { PricingResponse, PurchaseRequest, PurchaseResponse } from '../models/credits.models';

@Injectable({ providedIn: 'root' })
export class CreditsService {
  constructor(
    private http: HttpClient,
    private apiConfig: ApiConfigService
  ) {}

  private get apiUrl(): string {
    return `${this.apiConfig.getApiBaseUrl()}/api/v1/credits`;
  }

  getPricing(): Observable<PricingResponse> {
    return this.http.get<PricingResponse>(`${this.apiUrl}/pricing`);
  }

  purchaseCredits(request: PurchaseRequest): Observable<PurchaseResponse> {
    return this.http.post<PurchaseResponse>(`${this.apiUrl}/purchase`, request);
  }
}
