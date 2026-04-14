import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getAccessToken();
  const isPublicAuthRequest = /\/api\/v1\/auth\/(login|register|otp\/request|otp\/verify|refresh)(\/|$)/.test(req.url);

  let authReq = req;
  if (!isPublicAuthRequest && token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/refresh')) {
        return auth.refreshToken().pipe(
          switchMap(() => {
            const newToken = auth.getAccessToken();
            if (!newToken) {
              router.navigate(['/login']);
              return throwError(() => err);
            }
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` }
            });
            return next(retryReq);
          }),
          catchError(() => {
            router.navigate(['/login']);
            return throwError(() => err);
          })
        );
      }
      return throwError(() => err);
    })
  );
};
