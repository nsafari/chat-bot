import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/chat', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then((m) => m.RegisterComponent) },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/chat/chat-layout/chat-layout.component').then((m) => m.ChatLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/chat/chat-home/chat-home.component').then((m) => m.ChatHomeComponent) },
      { path: ':id', loadComponent: () => import('./pages/chat/chat-view/chat-view.component').then((m) => m.ChatViewComponent) }
    ]
  },
  { path: '**', redirectTo: '/chat' }
];
