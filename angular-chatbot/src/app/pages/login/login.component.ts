import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { getErrorMessage } from '../../utils/error';
import { finalize } from 'rxjs';

const PHONE_REGEX = /^(09\d{9}|\+989\d{9}|989\d{9})$/;
type ResetStep = 'phone' | 'otp' | 'password';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  form: FormGroup;
  resetPhoneForm: FormGroup;
  resetOtpForm: FormGroup;
  resetPasswordForm: FormGroup;
  loading = false;
  resetOtpLoading = false;
  resetVerifyLoading = false;
  resetPasswordLoading = false;
  showResetPassword = false;
  resetStep: ResetStep = 'phone';
  error = '';
  resetError = '';
  resetMessage = '';
  private resetOtpProof: string | null = null;
  private resetPhoneNumber = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.nonNullable.group({
      login: ['', Validators.required],
      password: ['', Validators.required]
    });
    this.resetPhoneForm = this.fb.nonNullable.group({
      phone_number: ['', [Validators.required, Validators.pattern(PHONE_REGEX)]]
    });
    this.resetOtpForm = this.fb.nonNullable.group({
      code: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(8)]]
    });
    this.resetPasswordForm = this.fb.nonNullable.group({
      new_password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(128)]]
    });
  }

  get resetMode(): boolean {
    return this.showResetPassword;
  }

  get message(): string {
    return this.resetMessage;
  }

  get displayError(): string {
    return this.resetMode ? this.resetError : this.error;
  }

  get otpLoading(): boolean {
    return this.resetOtpLoading;
  }

  get verifyingOtp(): boolean {
    return this.resetVerifyLoading;
  }

  get resetLoading(): boolean {
    return this.resetPasswordLoading;
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) return;
    const { login, password } = this.form.getRawValue();
    this.loading = true;
    this.error = '';
    this.auth.login({ login, password }).subscribe({
      next: () => this.router.navigate(['/chat']),
      error: (err) => {
        this.loading = false;
        this.error = getErrorMessage(err);
      },
      complete: () => (this.loading = false)
    });
  }

  openResetPassword(): void {
    this.showResetPassword = true;
    this.error = '';
    this.resetError = '';
    this.resetMessage = '';
  }

  startReset(): void {
    this.openResetPassword();
  }

  closeResetPassword(): void {
    this.showResetPassword = false;
    this.resetStep = 'phone';
    this.resetOtpProof = null;
    this.resetPhoneNumber = '';
    this.resetError = '';
    this.resetMessage = '';
    this.resetPhoneForm.reset();
    this.resetOtpForm.reset();
    this.resetPasswordForm.reset();
  }

  cancelReset(): void {
    this.closeResetPassword();
  }

  requestResetOtp(): void {
    if (this.resetOtpLoading || this.resetPhoneForm.invalid) return;
    const phone = this.resetPhoneForm.controls['phone_number'].value.trim();
    if (!PHONE_REGEX.test(phone)) {
      this.resetError = 'شماره موبایل معتبر نیست.';
      return;
    }
    this.resetOtpLoading = true;
    this.resetError = '';
    this.resetMessage = '';
    this.resetPhoneNumber = this.normalizePhone(phone);
    this.auth
      .requestOtp({ phone_number: this.resetPhoneNumber, purpose: 'reset_password' })
      .pipe(finalize(() => (this.resetOtpLoading = false)))
      .subscribe({
        next: (res) => {
          this.resetMessage = res.message;
          this.resetStep = 'otp';
          this.resetOtpProof = null;
          this.resetOtpForm.reset();
        },
        error: (err) => {
          this.resetError = getErrorMessage(err);
          this.resetMessage = '';
        }
      });
  }

  verifyResetOtp(): void {
    if (this.resetVerifyLoading || this.resetOtpForm.invalid || !this.resetPhoneNumber) return;
    this.resetVerifyLoading = true;
    this.resetError = '';
    this.resetMessage = '';
    this.auth
      .verifyOtp({
        phone_number: this.resetPhoneNumber,
        purpose: 'reset_password',
        code: this.resetOtpForm.controls['code'].value.trim()
      })
      .pipe(finalize(() => (this.resetVerifyLoading = false)))
      .subscribe({
        next: (res) => {
          this.resetOtpProof = res.otp_proof;
          this.resetMessage = 'کد تایید شد. رمز جدید را وارد کنید.';
          this.resetStep = 'password';
        },
        error: (err) => {
          this.resetOtpProof = null;
          this.resetError = getErrorMessage(err);
        }
      });
  }

  submitResetPassword(): void {
    if (this.resetPasswordLoading || this.resetPasswordForm.invalid || !this.resetOtpProof || !this.resetPhoneNumber) return;
    this.resetPasswordLoading = true;
    this.resetError = '';
    this.resetMessage = '';
    this.auth
      .resetPassword({
        phone_number: this.resetPhoneNumber,
        otp_proof: this.resetOtpProof,
        new_password: this.resetPasswordForm.controls['new_password'].value
      })
      .pipe(finalize(() => (this.resetPasswordLoading = false)))
      .subscribe({
        next: (res) => {
          this.resetMessage = res.message || 'رمز عبور با موفقیت تغییر کرد.';
          this.form.patchValue({ login: this.resetPhoneForm.controls['phone_number'].value, password: '' });
          this.resetStep = 'phone';
          this.resetOtpProof = null;
          this.resetOtpForm.reset();
          this.resetPasswordForm.reset();
        },
        error: (err) => {
          this.resetError = getErrorMessage(err);
        }
      });
  }

  resetPassword(): void {
    this.submitResetPassword();
  }

  backToResetPhone(): void {
    this.resetStep = 'phone';
    this.resetOtpProof = null;
    this.resetPhoneNumber = '';
    this.resetError = '';
    this.resetMessage = '';
    this.resetOtpForm.reset();
    this.resetPasswordForm.reset();
  }

  resendResetOtp(): void {
    if (!this.resetPhoneNumber) {
      this.resetStep = 'phone';
      return;
    }
    this.resetOtpLoading = true;
    this.resetError = '';
    this.resetMessage = '';
    this.auth
      .requestOtp({ phone_number: this.resetPhoneNumber, purpose: 'reset_password' })
      .pipe(finalize(() => (this.resetOtpLoading = false)))
      .subscribe({
        next: (res) => {
          this.resetMessage = res.message;
          this.resetStep = 'otp';
          this.resetOtpProof = null;
          this.resetOtpForm.reset();
        },
        error: (err) => {
          this.resetError = getErrorMessage(err);
        }
      });
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
