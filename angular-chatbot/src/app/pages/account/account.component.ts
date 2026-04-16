import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { PaymentService } from '../../services/payment.service';
import { CreditsService } from '../../services/credits.service';
import { getErrorMessage } from '../../utils/error';
import type { WalletResponse } from '../../models/payment.models';
import type { PricingResponse } from '../../models/credits.models';

const PHONE_REGEX = /^(09\d{9}|\+989\d{9}|989\d{9})$/;

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss'
})
export class AccountComponent implements OnInit {
  private auth = inject(AuthService);
  private payment = inject(PaymentService);
  private credits = inject(CreditsService);
  private fb = inject(FormBuilder);

  user = this.auth.user;
  remainingMessages = computed(() => this.auth.getRemainingMessages());

  loadingUser = signal(true);
  walletLoading = signal(true);
  pricingLoading = signal(true);
  emailLoading = signal(false);
  passwordLoading = signal(false);
  phoneOtpLoading = signal(false);
  phoneOtpVerifying = signal(false);
  phoneChangeLoading = signal(false);
  purchaseLoading = signal(false);

  profileError = signal('');
  emailMessage = signal('');
  passwordMessage = signal('');
  phoneMessage = signal('');
  purchaseMessage = signal('');
  pricingError = signal('');

  wallet = signal<WalletResponse | null>(null);
  pricing = signal<PricingResponse | null>(null);
  purchaseAmount = signal<number | null>(null);

  phoneOtpRequested = signal(false);
  phoneOtpVerified = signal(false);
  phoneProof = signal<string | null>(null);

  emailForm = this.fb.nonNullable.group({
    new_email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  passwordForm = this.fb.nonNullable.group({
    current_password: ['', [Validators.required]],
    new_password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(128)]]
  });

  phoneForm = this.fb.nonNullable.group({
    new_phone_number: ['', [Validators.required, Validators.pattern(PHONE_REGEX)]],
    code: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(8)]]
  });

  purchaseForm = this.fb.nonNullable.group({
    message_count: [10, [Validators.required, Validators.min(1)]]
  });

  estimatedPurchaseCost = computed(() => {
    const pricing = this.pricing();
    const count = this.purchaseForm.controls.message_count.value;
    if (!pricing || count <= 0) return null;
    return count * pricing.price_per_message;
  });

  ngOnInit(): void {
    this.loadUser();
    this.reloadWallet();
    this.loadPricing();
  }

  loadUser(): void {
    this.loadingUser.set(true);
    this.profileError.set('');
    this.auth.loadUser().subscribe({
      next: (u) => {
        this.emailForm.patchValue({ new_email: u.email ?? '' });
      },
      error: (err) => {
        this.profileError.set(getErrorMessage(err));
      },
      complete: () => this.loadingUser.set(false)
    });
  }

  reloadWallet(): void {
    this.walletLoading.set(true);
    this.payment.getWalletBalance().subscribe({
      next: (wallet) => {
        this.wallet.set(wallet);
      },
      error: (err) => {
        this.purchaseMessage.set(getErrorMessage(err));
      },
      complete: () => this.walletLoading.set(false)
    });
  }

  loadPricing(): void {
    this.pricingLoading.set(true);
    this.pricingError.set('');
    this.credits.getPricing().subscribe({
      next: (pricing) => {
        this.pricing.set(pricing);
        const current = this.purchaseForm.controls.message_count.value;
        const safeValue = Math.min(Math.max(current, pricing.min_purchase), pricing.max_purchase);
        this.purchaseForm.controls.message_count.setValue(safeValue);
      },
      error: (err) => {
        this.pricingError.set(getErrorMessage(err));
      },
      complete: () => this.pricingLoading.set(false)
    });
  }

  changeEmail(): void {
    if (this.emailForm.invalid || this.emailLoading()) return;
    this.emailLoading.set(true);
    this.emailMessage.set('');
    this.auth.changeEmail(this.emailForm.getRawValue()).subscribe({
      next: (res) => {
        this.emailMessage.set(res.message);
      },
      error: (err) => {
        this.emailMessage.set(getErrorMessage(err));
      },
      complete: () => this.emailLoading.set(false)
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid || this.passwordLoading()) return;
    this.passwordLoading.set(true);
    this.passwordMessage.set('');
    this.auth.changePassword(this.passwordForm.getRawValue()).subscribe({
      next: (res) => {
        this.passwordMessage.set(res.message);
        this.passwordForm.reset();
      },
      error: (err) => {
        this.passwordMessage.set(getErrorMessage(err));
      },
      complete: () => this.passwordLoading.set(false)
    });
  }

  requestPhoneOtp(): void {
    if (this.phoneOtpLoading()) return;
    const raw = this.phoneForm.controls.new_phone_number.value.trim();
    if (!PHONE_REGEX.test(raw)) {
      this.phoneMessage.set('شماره موبایل معتبر نیست.');
      return;
    }
    this.phoneOtpLoading.set(true);
    this.phoneMessage.set('');
    this.phoneProof.set(null);
    this.phoneOtpVerified.set(false);
    this.auth.requestOtp({ phone_number: this.normalizePhone(raw), purpose: 'change_phone' }).subscribe({
      next: (res) => {
        this.phoneOtpRequested.set(true);
        this.phoneMessage.set(res.message);
      },
      error: (err) => {
        this.phoneMessage.set(getErrorMessage(err));
      },
      complete: () => this.phoneOtpLoading.set(false)
    });
  }

  verifyPhoneOtp(): void {
    if (this.phoneOtpVerifying()) return;
    const rawPhone = this.phoneForm.controls.new_phone_number.value.trim();
    const code = this.phoneForm.controls.code.value.trim();
    if (!PHONE_REGEX.test(rawPhone) || !code) {
      this.phoneMessage.set('شماره موبایل یا کد تایید معتبر نیست.');
      return;
    }
    this.phoneOtpVerifying.set(true);
    this.phoneMessage.set('');
    this.auth.verifyOtp({ phone_number: this.normalizePhone(rawPhone), purpose: 'change_phone', code }).subscribe({
      next: (res) => {
        this.phoneProof.set(res.otp_proof);
        this.phoneOtpVerified.set(true);
        this.phoneMessage.set('کد تایید شد. حالا شماره جدید را ثبت کنید.');
      },
      error: (err) => {
        this.phoneMessage.set(getErrorMessage(err));
      },
      complete: () => this.phoneOtpVerifying.set(false)
    });
  }

  changePhone(): void {
    if (this.phoneChangeLoading()) return;
    const rawPhone = this.phoneForm.controls.new_phone_number.value.trim();
    const proof = this.phoneProof();
    if (!PHONE_REGEX.test(rawPhone) || !proof) {
      this.phoneMessage.set('ابتدا کد تایید را دریافت و تایید کنید.');
      return;
    }
    this.phoneChangeLoading.set(true);
    this.phoneMessage.set('');
    this.auth.changePhone({ new_phone_number: this.normalizePhone(rawPhone), otp_proof: proof }).subscribe({
      next: (res) => {
        this.phoneMessage.set(res.message);
        this.phoneOtpRequested.set(false);
        this.phoneOtpVerified.set(false);
        this.phoneProof.set(null);
        this.phoneForm.controls.code.setValue('');
      },
      error: (err) => {
        this.phoneMessage.set(getErrorMessage(err));
      },
      complete: () => this.phoneChangeLoading.set(false)
    });
  }

  purchaseCredits(): void {
    if (this.purchaseForm.invalid || this.purchaseLoading()) return;
    const pricing = this.pricing();
    if (!pricing) {
      this.purchaseMessage.set('اطلاعات قیمت‌گذاری در دسترس نیست.');
      return;
    }
    const count = this.purchaseForm.controls.message_count.value;
    if (count < pricing.min_purchase || count > pricing.max_purchase) {
      this.purchaseMessage.set(`تعداد پیام باید بین ${pricing.min_purchase} و ${pricing.max_purchase} باشد.`);
      return;
    }
    this.purchaseLoading.set(true);
    this.purchaseMessage.set('');
    this.credits.purchaseCredits({ message_count: count }).subscribe({
      next: (res) => {
        this.purchaseAmount.set(res.amount_charged);
        this.purchaseMessage.set(`${res.purchased} پیام با موفقیت خریداری شد.`);
        this.auth.updateRemainingMessages(res.remaining);
        this.reloadWallet();
      },
      error: (err) => {
        this.purchaseMessage.set(getErrorMessage(err));
      },
      complete: () => this.purchaseLoading.set(false)
    });
  }

  formatRials(value: number | null): string {
    if (value == null) {
      return '-';
    }
    return `${new Intl.NumberFormat('fa-IR').format(value)} ریال`;
  }

  private normalizePhone(phone: string): string {
    const compact = phone.replace(/\s+/g, '');
    if (compact.startsWith('+989')) {
      return compact.slice(1);
    }
    if (compact.startsWith('09')) {
      return `98${compact.slice(1)}`;
    }
    return compact;
  }
}
