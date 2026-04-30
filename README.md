# SafeGuard — Parental Control Platform

A full-stack parental control and child device monitoring platform built with React, React Native (Expo), Node.js, and Supabase.

## Architecture

```
safeguard/
├── backend/          Node.js + Express + Prisma → Railway
├── frontend/         React + Vite + Tailwind → Vercel
├── mobile/           React Native + Expo → EAS Build
├── docker/           Docker Compose for local development
└── .github/          GitHub Actions CI/CD
```

## Features

- **Parent Dashboard**: Login, child profiles, device management, screen time charts, app usage reports, remote lock/unlock, schedules, app blocking, notifications
- **Child Mobile App**: Device pairing, background activity tracking, push notifications, remote command execution
- **Real-time Commands**: Lock/unlock devices, block apps via Supabase Realtime + FCM fallback
- **Analytics**: Daily/weekly screen time charts, top apps by usage, overview stats

## Prerequisites

- Node.js 20+
- Supabase account (free tier)
- Firebase project (for FCM push notifications)
- Railway account (backend deployment)
- Vercel account (frontend deployment)

---

## 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `backend/supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and keys from **Settings → API**:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (service role — keep secret)
   - `SUPABASE_ANON_KEY` (anon key — safe to expose)
4. Copy your database connection strings from **Settings → Database**:
   - `DATABASE_URL` (use the **Session mode / PgBouncer** URI)
   - `DIRECT_URL` (use the **Direct** URI)

---

## 2. Firebase Setup (FCM)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Go to **Project Settings → Service accounts → Generate new private key**
3. Copy the entire JSON and set it as `FIREBASE_SERVICE_ACCOUNT_KEY` (one-line JSON string)

---

## 3. Local Development

```bash
# Start local Postgres
cd docker
docker compose -f docker-compose.dev.yml up -d

# Backend
cd backend
cp .env.example .env   # fill in your Supabase keys
npm install
npx prisma generate
npx prisma db push
npm run dev            # http://localhost:3000

# Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev            # http://localhost:5173

# Mobile (new terminal)
cd mobile
cp .env.example .env
npm install
npx expo start
```

---

## 4. Railway Deployment (Backend)

1. Push repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select the `backend/` folder (or set root to `backend`)
4. Railway will auto-detect `railway.toml` and use `npm run build` + `node dist/index.js`
5. Add environment variables in Railway dashboard (see `.env.example`):

```
NODE_ENV=production
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...
DIRECT_URL=...
FIREBASE_SERVICE_ACCOUNT_KEY=...
FRONTEND_URL=https://your-app.vercel.app
```

6. After first deploy, run Prisma migration:
   ```bash
   railway run npx prisma db push
   ```

---

## 5. Vercel Deployment (Frontend)

1. Go to [vercel.com](https://vercel.com) → Import Repository
2. Set **Root Directory** to `frontend`
3. Add environment variables:
   ```
   VITE_API_URL=https://your-backend.railway.app/api
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
4. Deploy — Vercel auto-handles SPA routing via `vercel.json`

---

## 6. GitHub Actions CI/CD

Add these secrets to your GitHub repository (**Settings → Secrets**):

| Secret | Description |
|--------|-------------|
| `RAILWAY_TOKEN` | Railway API token |
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `VITE_API_URL` | Backend URL for build |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

Workflows:
- **CI** (`ci.yml`): Runs on every PR — lint, build, security audit
- **Deploy** (`deploy.yml`): Runs on push to `main` — deploys backend to Railway, frontend to Vercel

---

## 7. Mobile App (EAS Build)

```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure

# Development APK
eas build --platform android --profile preview

# Production
eas build --platform android --profile production
```

Update `app.json` with your EAS project ID from `eas.json`.

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | No | Default `3000` |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `DATABASE_URL` | Yes | PostgreSQL connection (PgBouncer) |
| `DIRECT_URL` | Yes | PostgreSQL direct connection |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Yes | Firebase service account JSON (stringified) |
| `FRONTEND_URL` | Yes | CORS origin |
| `BETTERSTACK_SOURCE_TOKEN` | No | Betterstack logging token |
| `LOG_LEVEL` | No | Default `info` |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API base URL |
| `VITE_SUPABASE_URL` | No | Supabase URL (for future direct queries) |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anon key |

### Mobile (`mobile/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Yes | Backend API base URL |

---

## Monitoring

### Grafana Cloud (Free Tier)
1. Create account at [grafana.com](https://grafana.com)
2. Add a Prometheus data source pointed at your Railway metrics endpoint
3. Import the Node.js dashboard (ID: 11159) for request rates, error rates, latency

### Betterstack Logging
1. Create account at [betterstack.com](https://betterstack.com)
2. Create a new source and copy the token
3. Set `BETTERSTACK_SOURCE_TOKEN` in Railway environment variables
4. Logs from Winston will stream automatically

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register parent account |
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/refresh` | — | Refresh token |
| GET | `/api/children` | ✓ | List children |
| POST | `/api/children` | ✓ | Create child profile |
| GET | `/api/devices` | ✓ | List devices |
| POST | `/api/devices/generate-pairing-code` | ✓ | Generate pairing code |
| POST | `/api/devices/pair` | — | Pair mobile device |
| POST | `/api/control/lock/:deviceId` | ✓ | Lock device |
| POST | `/api/control/unlock/:deviceId` | ✓ | Unlock device |
| POST | `/api/control/block-app` | ✓ | Block an app |
| POST | `/api/monitoring/screen-time` | ✓ | Report screen time |
| GET | `/api/analytics/overview` | ✓ | Dashboard overview stats |
| GET | `/health` | — | Health check |

---

## License

MIT
