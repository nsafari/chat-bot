import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { getErrorMessage } from '../../utils/error';

const PHONE_REGEX = /^(09\d{9}|\+989\d{9}|989\d{9})$/;
type RegisterStep = 'phone' | 'otp' | 'profile';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnDestroy {
  phoneForm: FormGroup;
  otpForm: FormGroup;
  accountForm: FormGroup;
  step: RegisterStep = 'phone';
  loading = false;
  otpLoading = false;
  verifyingOtp = false;
  error = '';
  otpInlineError = '';
  otpMessage = '';
  private otpProof: string | null = null;
  private verifiedPhone: string | null = null;
  private requestedPhone: string | null = null;
  otpCooldownSeconds = 0;
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.phoneForm = this.fb.nonNullable.group({
      phone_number: ['', [Validators.required, Validators.pattern(PHONE_REGEX)]]
    });
    this.otpForm = this.fb.nonNullable.group({
      code: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(8)]]
    });
    this.accountForm = this.fb.nonNullable.group(
      {
        username: ['', [Validators.minLength(3), Validators.maxLength(50)]],
        email: ['', [Validators.email]],
        full_name: [''],
        password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(128)]]
      },
      { validators: [this.usernameOrEmailRequired] }
    );
    this.phoneForm.get('phone_number')?.valueChanges.subscribe((value) => {
      const normalized = PHONE_REGEX.test(value?.trim() ?? '') ? this.normalizePhone(value.trim()) : null;
      if (this.requestedPhone && normalized !== this.requestedPhone) {
        this.resetOtpState();
      }
    });
  }

  ngOnDestroy(): void {
    this.clearCooldown();
  }

  requestOtp(preserveStepOnError = false): void {
    if (this.otpLoading || this.otpCooldownSeconds > 0) return;
    const phone = this.phoneForm.get('phone_number')?.value?.trim() ?? '';
    if (!PHONE_REGEX.test(phone)) {
      this.error = 'شماره موبایل معتبر نیست. قالب مجاز: 09xxxxxxxxx یا +989xxxxxxxxx یا 989xxxxxxxxx';
      return;
    }
    this.otpLoading = true;
    this.error = '';
    this.otpInlineError = '';
    this.otpMessage = '';
    const normalizedPhone = this.normalizePhone(phone);
    this.auth
      .requestOtp({ phone_number: normalizedPhone, purpose: 'register' })
      .pipe(finalize(() => (this.otpLoading = false)))
      .subscribe({
        next: (res) => {
          this.otpMessage = res.message;
          this.step = 'otp';
          this.otpProof = null;
          this.verifiedPhone = null;
          this.requestedPhone = normalizedPhone;
          this.otpForm.reset();
          this.startCooldown(res.resend_after_seconds);
        },
        error: (err) => {
          const message = getErrorMessage(err);
          if (preserveStepOnError) {
            this.otpInlineError = message;
          } else {
            this.error = message;
          }
        }
      });
  }

  verifyOtp(): void {
    if (this.verifyingOtp || this.otpForm.invalid) return;
    const phone = this.phoneForm.get('phone_number')?.value?.trim() ?? '';
    if (!PHONE_REGEX.test(phone)) {
      this.error = 'شماره موبایل معتبر نیست.';
      return;
    }
    const code = this.otpForm.get('code')?.value?.trim() ?? '';
    this.verifyingOtp = true;
    this.error = '';
    this.otpInlineError = '';
    this.otpMessage = '';
    this.auth
      .verifyOtp({
        phone_number: this.normalizePhone(phone),
        purpose: 'register',
        code
      })
      .pipe(finalize(() => (this.verifyingOtp = false)))
      .subscribe({
        next: (res) => {
          this.otpProof = res.otp_proof;
          this.verifiedPhone = this.normalizePhone(phone);
          this.step = 'profile';
          this.otpMessage = 'شماره موبایل تایید شد. اطلاعات حساب را تکمیل کنید.';
        },
        error: (err) => {
          this.otpProof = null;
          this.verifiedPhone = null;
          this.error = getErrorMessage(err);
          this.otpMessage = '';
        }
      });
  }

  onSubmit(): void {
    if (this.accountForm.invalid || this.loading) {
      this.accountForm.markAllAsTouched();
      return;
    }
    if (!this.otpProof || !this.verifiedPhone) {
      this.error = 'ابتدا کد تایید پیامک را دریافت و تایید کنید.';
      return;
    }
    const raw = this.accountForm.getRawValue();
    this.loading = true;
    this.error = '';
    this.otpMessage = '';
    this.auth
      .register({
        phone_number: this.verifiedPhone,
        otp_proof: this.otpProof,
        password: raw.password,
        username: this.cleanOptional(raw.username),
        email: this.cleanOptional(raw.email),
        full_name: this.cleanOptional(raw.full_name)
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => this.router.navigate(['/chat']),
        error: (err) => {
          this.error = getErrorMessage(err);
          this.otpMessage = '';
        }
      });
  }

  resendOtp(): void {
    if (this.otpLoading || this.otpCooldownSeconds > 0) return;
    this.otpForm.reset();
    this.otpProof = null;
    this.verifiedPhone = null;
    this.requestOtp(true);
  }

  editPhone(): void {
    this.resetOtpState();
    this.error = '';
    this.otpInlineError = '';
    this.otpMessage = '';
  }

  private resetOtpState(): void {
    this.step = 'phone';
    this.otpProof = null;
    this.verifiedPhone = null;
    this.requestedPhone = null;
    this.otpInlineError = '';
    this.otpForm.reset();
    this.clearCooldown();
  }

  backToPhone(): void {
    this.editPhone();
  }

  backToOtp(): void {
    this.step = 'otp';
    this.error = '';
    this.otpMessage = '';
  }

  get stepSubtitle(): string {
    if (this.step === 'phone') return 'ثبت‌نام با شماره موبایل';
    if (this.step === 'otp') return 'کد تایید ارسال‌شده را وارد کنید';
    return 'اطلاعات حساب را تکمیل کنید';
  }

  get displayPhone(): string {
    return this.phoneForm.get('phone_number')?.value?.trim() || '-';
  }

  private usernameOrEmailRequired(control: AbstractControl): ValidationErrors | null {
    const username = control.get('username')?.value?.trim();
    const email = control.get('email')?.value?.trim();
    return username || email ? null : { usernameOrEmailRequired: true };
  }

  private cleanOptional(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private startCooldown(seconds: number): void {
    this.clearCooldown();
    this.otpCooldownSeconds = Math.max(0, seconds || 0);
    if (this.otpCooldownSeconds <= 0) return;
    this.cooldownTimer = setInterval(() => {
      this.otpCooldownSeconds = Math.max(0, this.otpCooldownSeconds - 1);
      if (this.otpCooldownSeconds === 0) {
        this.clearCooldown();
      }
    }, 1000);
  }

  private clearCooldown(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    this.otpCooldownSeconds = 0;
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

  get googleLoginUrl(): string {
    return this.auth.getGoogleLoginUrl();
  }

  get githubLoginUrl(): string {
    return this.auth.getGithubLoginUrl();
  }
}
