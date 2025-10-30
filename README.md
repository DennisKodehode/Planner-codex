# DayPlanner

DayPlanner is a progressive web app built with Next.js 14 that helps you plan your day with voice commands, get activity recommendations near you, and manage your preferences in a privacy-aware way.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Set environment variables**
   - Copy `.env.example` to `.env.local` and update values.
3. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```
4. **Run database migrations**
   ```bash
   npx prisma migrate deploy
   ```
5. **Seed demo data (optional)**
   ```bash
   npm run db:seed
   ```
6. **Start the development server**
   ```bash
   npm run dev
   ```

The app is available at `http://localhost:3000`. Sign in with Google or email, complete your onboarding preferences, and start planning.

## Environment Variables

See `.env.example` for the complete list. Key variables include:

- `DATABASE_URL` – PostgreSQL connection string.
- `NEXTAUTH_URL` / `NEXTAUTH_SECRET` – NextAuth configuration.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – OAuth credentials.
- `MAPBOX_TOKEN` / `NEXT_PUBLIC_MAPBOX_TOKEN` – Map tiles and geocoding.
- `GOOGLE_PLACES_API_KEY` or `OPENTRIPMAP_API_KEY` – external place data (optional in current fallback mode).
- `OPENAI_API_KEY` – Whisper transcription (optional, server fallback disabled without it).
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` – rate limiting store.
- `POSTHOG_PROJECT_API_KEY` / `NEXT_PUBLIC_POSTHOG_KEY` – analytics instrumentation.

## Project Structure

```
app/
  [locale]/
    (auth)/sign-in
    (dashboard)/{page,discover,favorites,settings}
  api/
    auth/[...nextauth]
    blocks/[id]
    me
    plans
    preferences
    recommendations
    travel-time
    voice/{interpret,transcribe}
components/
  favorites/
  layout/
  plan/
  recommendations/
  settings/
  ui/
  voice/
lib/
  hooks/
  intent/
  server/
  telemetry/
  voice/
prisma/
  schema.prisma
  seed.ts
```

## Testing & Quality

- **Unit tests** – run `npm test` (Vitest).
- **E2E tests** – run `npm run test:e2e` (Playwright) after installing browsers (`npx playwright install`).
- **Linting** – run `npm run lint`.
- **Type checking** – run `npm run typecheck`.

GitHub Actions in `.github/workflows/ci.yml` enforce lint, typecheck, unit tests, and build on pull requests.

## Voice Commands

Supported command grammar (processed without LLMs):

- `Add <title> at <time> for <duration> minutes`
- `Move <title> to <time>`
- `Delete <title>`
- `What's my next task?`

Times are parsed via `chrono-node` and normalized to five-minute increments. If parsing fails, the UI surfaces an error toast and asks the user to retry. Client-side speech recognition uses the Web Speech API with a Whisper API fallback stub.

## Security & Privacy

- Authenticated routes are protected through middleware using NextAuth and locale-aware routing.
- API input validation uses Zod schemas.
- Prisma relations enforce per-user access with cascading deletes.
- Rate limiting for voice and recommendation endpoints uses Upstash.
- GDPR endpoints: `/api/me/export` (data export) and `/api/me` (DELETE) for account removal.
- PWA offline support caches the shell, most recent plan, and recommendation results via the service worker.

## Assumptions

- External place and travel-time integrations use curated fallback datasets; replace with Google Places, Mapbox, or OpenTripMap APIs in production by extending the corresponding API route implementations.
- Email provider settings in `.env.example` target a local SMTP dev server; configure a production provider before launch.
- Whisper transcription is disabled until `OPENAI_API_KEY` and file storage are configured.
- PWA icons ship as lightweight SVG placeholders so the repository stays text-only; swap in branded PNG assets before release to better satisfy Apple touch icon guidance.

## Checklist

- [x] Authentication (NextAuth with Google/email)
- [x] Plan CRUD with drag-and-drop ordering
- [x] Voice add/move/delete/read commands
- [x] Recommendation list + map with quick add
- [x] Favorites quick-add workflow
- [x] Settings page with data export/delete
- [x] PWA install and offline caching hooks
- [x] Internationalization (English + Norwegian)
- [x] Dark/light theme synced with system

## Outstanding Work

- Refine plan reordering to better respect gaps, travel buffers, and add regression tests for the logic.
- Gate service worker auto-registration so it only runs in production builds.
- Complete the "Add block" workflow in the plan timeline instead of showing a placeholder toast.
- Implement Whisper/OpenAI transcription in `/api/voice/transcribe` once credentials and storage are configured.
- Replace the curated recommendation catalog with live Mapbox/Google/OpenTripMap integrations when API keys are available.
- Expand automated test coverage for API routes, Playwright journeys, and offline behavior.
