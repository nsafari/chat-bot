import { Component } from '@angular/core';
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
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.nonNullable.group({
      email: ['', [Validators.email]],
      username: ['', [Validators.minLength(3), Validators.maxLength(50)]],
      full_name: [''],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(128)]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) return;
    const raw = this.form.getRawValue();
    if (!raw.email && !raw.username) {
      this.error = 'Please provide email or username';
      return;
    }
    this.loading = true;
    this.error = '';
    this.auth.register(raw).subscribe({
      next: () => this.router.navigate(['/chat']),
      error: (err) => {
        this.loading = false;
        this.error = getErrorMessage(err);
      },
      complete: () => (this.loading = false)
    });
  }

  get googleLoginUrl(): string {
    return this.auth.getGoogleLoginUrl();
  }

  get githubLoginUrl(): string {
    return this.auth.getGithubLoginUrl();
  }
}
