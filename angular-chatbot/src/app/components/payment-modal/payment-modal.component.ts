import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { DEFAULT_PAYMENT_AMOUNT } from '../../constants/payment';
import { getErrorMessage } from '../../utils/error';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment-modal.component.html',
  styleUrl: './payment-modal.component.scss'
})
export class PaymentModalComponent {
  closed = output<void>();

  form: FormGroup;
  loading = signal(false);
  error = signal('');
  discountValid = signal<{ valid: boolean; finalAmount?: number; message: string } | null>(null);

  constructor(
    private fb: FormBuilder,
    private payment: PaymentService
  ) {
    this.form = this.fb.nonNullable.group({
      amount: [DEFAULT_PAYMENT_AMOUNT],
      discount_code: ['']
    });
  }

  validateDiscount(): void {
    const code = this.form.get('discount_code')?.value?.trim();
    const amount = this.form.get('amount')?.value ?? DEFAULT_PAYMENT_AMOUNT;
    if (!code || amount <= 0) {
      this.discountValid.set(null);
      return;
    }
    this.payment.validateDiscount(code, amount).subscribe({
      next: (res) => {
        this.discountValid.set({
          valid: res.valid,
          finalAmount: res.final_amount ?? undefined,
          message: res.message
        });
      },
      error: () => this.discountValid.set({ valid: false, message: 'Validation failed' })
    });
  }

  pay(): void {
    const amount = this.form.get('amount')?.value ?? DEFAULT_PAYMENT_AMOUNT;
    const discountCode = this.form.get('discount_code')?.value?.trim() || null;
    if (amount <= 0) {
      this.error.set('Invalid amount');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.payment.initiatePayment({ amount, discount_code: discountCode }).subscribe({
      next: (res) => {
        window.location.href = res.redirect_url;
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(getErrorMessage(err));
      }
    });
  }

  close(): void {
    this.closed.emit();
  }

  get displayAmount(): number {
    const d = this.discountValid();
    if (d?.valid && d.finalAmount != null) return d.finalAmount;
    return this.form.get('amount')?.value ?? DEFAULT_PAYMENT_AMOUNT;
  }

  formatRials(n: number): string {
    return new Intl.NumberFormat('fa-IR').format(n) + ' ریال';
  }
}
