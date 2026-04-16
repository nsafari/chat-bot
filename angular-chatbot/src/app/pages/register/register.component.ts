import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { getErrorMessage } from '../../utils/error';

const PHONE_REGEX = /^(09\d{9}|\+989\d{9}|989\d{9})$/;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnDestroy {
  form: FormGroup;
  otpForm: FormGroup;
  loading = false;
  otpLoading = false;
  verifyingOtp = false;
  error = '';
  otpMessage = '';
  otpRequested = false;
  otpVerified = false;
  private otpProof: string | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.nonNullable.group({
      phone_number: ['', [Validators.required, Validators.pattern(PHONE_REGEX)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(128)]]
    });
    this.otpForm = this.fb.nonNullable.group({
      code: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(8)]]
    });
    this.form.get('phone_number')?.valueChanges.subscribe(() => {
      this.resetOtpState();
    });
  }

  ngOnDestroy(): void {
    // no-op; reserved for future async cleanup
  }

  requestOtp(): void {
    if (this.otpLoading) return;
    const phone = this.form.get('phone_number')?.value?.trim() ?? '';
    if (!PHONE_REGEX.test(phone)) {
      this.error = 'شماره موبایل معتبر نیست. قالب مجاز: 09xxxxxxxxx یا +989xxxxxxxxx یا 989xxxxxxxxx';
      return;
    }
    this.otpLoading = true;
    this.error = '';
    this.otpMessage = '';
    const normalizedPhone = this.normalizePhone(phone);
    this.auth.requestOtp({ phone_number: normalizedPhone, purpose: 'register' }).subscribe({
      next: (res) => {
        this.otpMessage = res.message;
        this.otpRequested = true;
        this.otpVerified = false;
        this.otpProof = null;
        this.otpForm.reset();
      },
      error: (err) => {
        this.resetOtpState();
        this.error = getErrorMessage(err);
      },
      complete: () => {
        this.otpLoading = false;
      }
    });
  }

  verifyOtp(): void {
    if (this.verifyingOtp || this.otpForm.invalid) return;
    const phone = this.form.get('phone_number')?.value?.trim() ?? '';
    if (!PHONE_REGEX.test(phone)) {
      this.error = 'شماره موبایل معتبر نیست.';
      return;
    }
    const code = this.otpForm.get('code')?.value?.trim() ?? '';
    this.verifyingOtp = true;
    this.error = '';
    this.otpMessage = '';
    this.auth
      .verifyOtp({
        phone_number: this.normalizePhone(phone),
        purpose: 'register',
        code
      })
      .subscribe({
        next: (res) => {
          this.otpProof = res.otp_proof;
          this.otpVerified = true;
          this.otpMessage = 'شماره موبایل تایید شد.';
        },
        error: (err) => {
          this.otpProof = null;
          this.otpVerified = false;
          this.error = getErrorMessage(err);
          this.otpMessage = 'در تایید کد خطا رخ داد. در صورت نیاز کد را دوباره ارسال کنید.';
        },
        complete: () => {
          this.verifyingOtp = false;
        }
      });
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) return;
    if (!this.otpVerified || !this.otpProof) {
      this.error = 'ابتدا کد تایید پیامک را دریافت و تایید کنید.';
      return;
    }
    const raw = this.form.getRawValue();
    this.loading = true;
    this.error = '';
    this.otpMessage = '';
    this.auth
      .register({
        phone_number: this.normalizePhone(raw.phone_number),
        otp_proof: this.otpProof,
        password: raw.password
      })
      .subscribe({
        next: () => this.router.navigate(['/chat']),
        error: (err) => {
          this.loading = false;
          this.error = getErrorMessage(err);
          this.otpMessage = 'ثبت‌نام ناموفق بود. لطفاً دوباره کد تایید دریافت کنید.';
          this.resetOtpState();
        },
        complete: () => (this.loading = false)
      });
  }

  restartOtpFlow(): void {
    this.resetOtpState();
    this.error = '';
    this.otpMessage = '';
  }

  private resetOtpState(): void {
    this.otpRequested = false;
    this.otpVerified = false;
    this.otpProof = null;
    this.otpForm.reset();
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
