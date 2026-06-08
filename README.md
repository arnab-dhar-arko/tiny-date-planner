# Roam Budget

Production-oriented Travel Budget & Group Expense Tracker workspace.

The original Vite prototype still lives at the repository root. The production architecture requested for mobile/backend work now lives in:

- `backend/` - Express + TypeScript API, JWT auth, PostgreSQL migrations, transactional expense splits, settlements, and sync endpoints.
- `mobile/` - React Native + Expo app with SQLite-first offline caching, group balances, debt simplification, and Android Studio project files.

## Quick Start

```bash
docker compose up -d
cp backend/.env.example backend/.env
npm --prefix backend install
npm --prefix backend run migrate
npm --prefix backend run dev
```

In another terminal:

```bash
cp mobile/.env.example mobile/.env
npm --prefix mobile install
npm --prefix mobile run start
```

Open `mobile/android` in Android Studio for native Android configuration and future Play Store work.

## Public Deployment

Use [DEPLOY.md](./DEPLOY.md) to create an always-online API/web link and rebuild the Android APK against that backend URL.

## Backend Schema

The migration at `backend/db/migrations/001_init.sql` creates:

- `users`
- `trips`
- `trip_members`
- `expenses`
- `expense_splits`
- `settlements`
- `sync_events`

## Group Expense Logic

Both backend and mobile calculate net balances as:

`amount paid - share owed + settlements sent - settlements received`

Then they simplify debt by matching the largest debtor with the largest creditor until all balances are zero.

Roam Budget is a polished, local-first travel budget tracker inspired by the supplied mobile dashboard reference. It runs entirely in the browser: trips, expenses, manual exchange rates, preferences, and backups are stored in IndexedDB through Dexie.

## Highlights

- Responsive mobile-first dashboard with Entries, Stats, Search, Map, and Settings views
- Trip, expense, and exchange-rate CRUD with validation and confirmation dialogs
- Group trips for 2 to 5 people with equal, exact, or percentage expense splits
- Per-person balances, greedy debt simplification, and locally recorded settlements
- Multi-currency expense conversion with cached mock rates and manual-rate fallback
- Dynamic KPI cards, category analytics, date grouping, and search filters
- JSON backup export/import and dark mode
- No backend, authentication, cloud sync, analytics, or external map/rate API

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production build

```bash
npm run check
npm run build
npm run preview
```

The production output is written to `dist/`.

## Architecture

```text
src/
  components/   Reusable UI, forms, dialogs, charts, and navigation
  data/         Category metadata and currency options
  db/           Versioned Dexie database, rates, and backups
  screens/      Entries, Stats, Search, Map, and Settings views
  types/        Shared TypeScript models
  utils/        Currency, date, grouping, and formatting helpers
```

The app is ready for a later Capacitor wrapper because it has no server dependencies and all core behavior runs in the client.
