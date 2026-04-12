import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { getErrorMessage } from '../../utils/error';

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
  otpVerified = false;
  private otpProof: string | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.nonNullable.group({
      phone_number: ['', [Validators.required, Validators.pattern(/^09\d{9}$/)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(128)]]
    });
    this.otpForm = this.fb.nonNullable.group({
      code: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(8)]]
    });
    this.form.get('phone_number')?.valueChanges.subscribe(() => {
      this.otpVerified = false;
      this.otpProof = null;
    });
  }

  ngOnDestroy(): void {
    // no-op; reserved for future async cleanup
  }

  requestOtp(): void {
    if (this.otpLoading) return;
    const phone = this.form.get('phone_number')?.value?.trim() ?? '';
    if (!/^09\d{9}$/.test(phone)) {
      this.error = 'شماره موبایل باید با 09 شروع شود و 11 رقم باشد.';
      return;
    }
    this.otpLoading = true;
    this.error = '';
    this.otpMessage = '';
    const normalizedPhone = this.normalizePhone(phone);
    this.auth.requestOtp({ phone_number: normalizedPhone, purpose: 'register' }).subscribe({
      next: (res) => {
        this.otpMessage = res.message;
      },
      error: (err) => {
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
    if (!/^09\d{9}$/.test(phone)) {
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
        },
        complete: () => (this.loading = false)
      });
  }

  private normalizePhone(phone: string): string {
    return phone.startsWith('0') ? phone.slice(1) : phone;
  }

  get googleLoginUrl(): string {
    return this.auth.getGoogleLoginUrl();
  }

  get githubLoginUrl(): string {
    return this.auth.getGithubLoginUrl();
  }
}
