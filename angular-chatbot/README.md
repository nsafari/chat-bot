# Angular Chatbot Frontend

A mobile-first, user-friendly chatbot frontend built with Angular 19, designed to work with the RAG Service backend API.

## Features

- **Authentication**: Login, register, Google/GitHub OAuth
- **Chat**: Create new chats, view history, send messages
- **Payment**: Upgrade flow when free message limit (3) is exceeded
- **Mobile-first**: Responsive design with touch-friendly UI
- **Dark theme**: Modern slate/cyan color scheme

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure API URL in `src/environments/environment.ts`:
   ```ts
   apiUrl: 'http://localhost:8000'  // Your backend URL
   ```

3. Start the dev server:
   ```bash
   npm start
   ```

4. Open http://localhost:4200

## Project Structure

- `src/app/models/` - API data models
- `src/app/services/` - Auth, Chat, Payment services
- `src/app/pages/` - Login, Register, Chat layout & view
- `src/app/components/` - Payment modal
- `src/app/guards/` - Auth guard for protected routes
- `src/app/interceptors/` - HTTP auth interceptor (Bearer token, refresh)

## API Integration

The frontend expects the RAG Service backend with:

- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`
- `GET /api/v1/auth/me` (returns `remaining_messages_today`)
- `POST /api/v1/chats`, `GET /api/v1/chats`, `GET /api/v1/chats/:id`
- `POST /api/v1/chats/:id/messages`
- `POST /api/v1/payment/initiate`, `GET /api/v1/payment/wallet/balance`
- `POST /api/v1/payment/discount/validate`

## Build

```bash
npm run build
```

Output: `dist/angular-chatbot/`
