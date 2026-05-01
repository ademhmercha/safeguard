# Rakeb — Parental Control Platform

> Real-time parental monitoring and control for modern families.

**Live:** [rakeb.vercel.app](https://safeguard-frontend.vercel.app) · **Backend:** Railway · **Mobile:** Expo / EAS

---

## What is Rakeb?

Rakeb is a full-stack parental control platform that gives parents full visibility and real-time control over their children's digital activity — from any device, anywhere.

| Layer | Stack | Hosting |
|-------|-------|---------|
| Parent Dashboard | React 18 + Vite + Tailwind CSS | Vercel |
| Backend API | Node.js + Express + Prisma | Railway |
| Database | PostgreSQL (via Supabase) | Supabase |
| Mobile (child device) | React Native + Expo | EAS Build |
| Real-time | Supabase Realtime | Supabase |
| Push notifications | Firebase Cloud Messaging | Firebase |

---

## Features

### Parent Dashboard
- Real-time overview — children, devices, screen time, alerts
- Remote **lock / unlock** any paired device instantly
- **Website blocking** — block any domain, child sees an alert when blocked
- **App blocking** — restrict specific apps on child device
- **Screen time charts** — daily and weekly breakdowns
- **Browser history** — full URL history, search terms, top domains
- **Activity timeline** — chronological log of all activity
- **Real-time alerts** — instant toast notification when child tries to visit a blocked site
- **Schedules** — bedtime and study hour restrictions
- PWA-ready — installable from Safari/Chrome

### Child Mobile App
- Simple pairing with a 6-character code
- Monitored in-app browser — every visit tracked in real time
- Blocked site detection — navigation stops instantly with an alert
- Screen time reporting on app background
- Device lock screen when parent locks remotely
- Supabase Realtime for instant command delivery

---

## Project Structure

```
rakeb/
├── backend/          Express API + Prisma ORM
│   ├── src/
│   │   ├── routes/       All API endpoints
│   │   ├── services/     Command & notification services
│   │   ├── middleware/   Auth, error handling
│   │   └── utils/        Prisma, Supabase, Firebase, Logger
│   └── prisma/           Database schema
├── frontend/         React parent dashboard
│   ├── src/
│   │   ├── pages/        All dashboard pages
│   │   ├── components/   Layout, Modal, StatCard, Skeleton
│   │   ├── hooks/        React Query data hooks
│   │   ├── stores/       Zustand auth & child stores
│   │   └── lib/          Axios API client, Supabase client
│   └── public/           PWA manifest, service worker, icons
├── mobile/           React Native child app
│   ├── app/              Expo Router entry
│   └── src/
│       ├── screens/      PairingScreen, HomeScreen
│       ├── components/   MonitoredWebView
│       ├── services/     Tracking, notifications, commands
│       └── stores/       Device state (Zustand)
└── docker/           Docker Compose for local dev
```

---

## Local Development

### Prerequisites

- Node.js 20+
- Supabase project → [supabase.com](https://supabase.com)
- Firebase project → [console.firebase.google.com](https://console.firebase.google.com)

### Backend

```bash
cd backend
cp .env.example .env    # fill in your keys
npm install
npx prisma generate
npx prisma db push
npm run dev             # http://localhost:3000
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev             # http://localhost:5173
```

### Mobile

```bash
cd mobile
cp .env.example .env
npm install
npx expo start --lan    # scan QR with Expo Go
```

---

## Deployment

### Backend → Railway

1. Import repo at [railway.app](https://railway.app)
2. Set **Root Directory** → `backend`
3. Set **Build Command** → `npm run build`
4. Set **Start Command** → `npm start`
5. Add environment variables:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=...
DIRECT_URL=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
FIREBASE_SERVICE_ACCOUNT_KEY=...   # full JSON, single line
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend → Vercel

1. Import repo at [vercel.com](https://vercel.com)
2. Set **Root Directory** → `frontend`
3. Add environment variables:

```env
VITE_API_URL=https://your-backend.up.railway.app/api
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Mobile → EAS Build (standalone APK)

```bash
cd mobile
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

Returns a download link for a `.apk` you can install directly — no Expo Go needed.

---

## Environment Variables

### `backend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | ✓ | `development` or `production` |
| `PORT` | | Default `3000` |
| `DATABASE_URL` | ✓ | PostgreSQL (PgBouncer) |
| `DIRECT_URL` | ✓ | PostgreSQL direct |
| `SUPABASE_URL` | ✓ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | Service role key (secret) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | ✓ | Firebase JSON (stringified) |
| `FRONTEND_URL` | ✓ | CORS allowed origin |

### `frontend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✓ | Backend API base URL |
| `VITE_SUPABASE_URL` | ✓ | Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | ✓ | Supabase anon key |

### `mobile/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_API_URL` | ✓ | Backend API base URL |
| `EXPO_PUBLIC_SUPABASE_URL` | ✓ | Supabase URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✓ | Supabase anon key |

---

## API Reference

### Public (no auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/auth/register` | Register parent |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/devices/pair` | Pair child device |
| `POST` | `/api/activity/browser-visit` | Report browser visit (device) |
| `POST` | `/api/activity/browser-visits/batch` | Batch visits (device) |
| `POST` | `/api/monitoring/screen-time` | Report screen time (device) |

### Authenticated (parent token)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/children` | List children |
| `POST` | `/api/children` | Create child |
| `GET` | `/api/devices` | List devices |
| `DELETE` | `/api/devices/:id` | Remove device |
| `POST` | `/api/devices/generate-pairing-code` | Generate pairing code |
| `POST` | `/api/control/lock/:deviceId` | Lock device |
| `POST` | `/api/control/unlock/:deviceId` | Unlock device |
| `POST` | `/api/control/block-website` | Block a domain |
| `POST` | `/api/control/block-app` | Block an app |
| `GET` | `/api/analytics/overview` | Dashboard stats |
| `GET` | `/api/activity/browser-history/:childId` | Browser history |
| `GET` | `/api/activity/timeline/:childId` | Activity timeline |
| `GET` | `/api/notifications` | Notifications list |

---

## Keep-Alive (Recommended)

Railway free tier sleeps after inactivity. Set up a free monitor on [uptimerobot.com](https://uptimerobot.com) to ping `/health` every 5 minutes.

---

## License

MIT © 2026 Rakeb
