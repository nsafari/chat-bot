import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ChatLayoutComponent } from './pages/chat/chat-layout/chat-layout.component';
import { ChatHomeComponent } from './pages/chat/chat-home/chat-home.component';
import { ChatViewComponent } from './pages/chat/chat-view/chat-view.component';

export const routes: Routes = [
  { path: '', redirectTo: '/chat', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'chat',
    canActivate: [authGuard],
    component: ChatLayoutComponent,
    children: [
      { path: '', component: ChatHomeComponent },
      { path: ':id', component: ChatViewComponent }
    ]
  },
  { path: '**', redirectTo: '/chat' }
];
