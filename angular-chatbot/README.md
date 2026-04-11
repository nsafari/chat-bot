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

2. Configure API URL:
   - **Dev:** `src/environments/environment.ts` → `apiUrl: 'http://localhost:8000'`
   - **Prod (GitHub Pages):** Repo → Settings → Secrets and variables → Actions → Add variable `API_URL` = `https://your-rag-backend.com` (no trailing slash). The app loads `config.json` at runtime.
   - **Demo mode override:** When logged in with demo credentials, use the banner setting in chat layout to set a runtime `api_url` override (stored in browser localStorage).

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

## Deployment (aligned with mission-selection)

On push to `main`, GitHub Actions:

1. **GitHub Pages**: Builds the web app and deploys
   - From `nsafari.github.io` repo → **https://nsafari.github.io** (root)
   - From `chat-bot` repo → https://nsafari.github.io/chat-bot/
2. **Android APK**: Builds via Capacitor, creates a release with the APK attached

To run at **https://nsafari.github.io**: create repo `nsafari.github.io`, push this project into it, and enable Pages (Source: GitHub Actions).

See `.github/workflows/deploy.yml`.
