# Rendezvoo (web app)

Plan hangouts with friends: send an invite, everyone marks when they're free and answers a few
questions, and AI picks the best time and place.

**Stack:** Next.js (React + TypeScript) · Tailwind CSS · Supabase (database, login, photo storage) ·
FullCalendar · Leaflet + OpenStreetMap · SerpAPI · Google Gemini API · hosted on Vercel · installable as a PWA.

## Run it (Windows)

1. **Supabase** (one person, once)
   - Create a project at supabase.com.
   - SQL Editor → New query → paste all of `supabase/schema.sql` → Run.
   - Authentication → Sign In / Providers → Email → turn **off** "Confirm email".
   - Project Settings → API: copy the URL, the anon/publishable key, and the service role key.

2. **Keys** — copy `.env.example` to a new file named `.env.local` and fill it in.
   SerpAPI key: serpapi.com/manage-api-key. Gemini key: aistudio.google.com → Get API key.
   The AI button still works without those two (it makes a simpler plan).

3. **Install and start** (Command Prompt or PowerShell, in this folder):
   ```
   npm install
   npm run dev
   ```
   Open http://localhost:3000

4. **Demo data** (optional): set `SEED_LAT` / `SEED_LNG` in `.env.local` to a spot in your city, then
   ```
   npm run seed
   ```
   Log in as `demo5@rendezvoo.test` / `demo1234` → Demo Crew → "Weekend hang" → mark some times →
   "Plan it with AI".

## Put it online (for judges)
Push to GitHub → vercel.com → Add New Project → import the repo → add every variable from
`.env.local` (except the SEED_ ones) under Environment Variables → Deploy.
On an Android phone, open the link in Chrome → menu → **Add to Home screen** to install it like an app.

## Where things are
```
src/app/(auth)/login, signup        login + sign-up (stays logged in)
src/app/(app)/page.tsx               groups home (pin groups)
src/app/(app)/groups/new             create (friends / school / work) or join by code
src/app/(app)/groups/[id]            group page: members, code, invites, calendar, upcoming/past, homes map
src/app/(app)/groups/[id]/settings   photo, name, type, your color, pin, share home, priority attendees, leave
src/app/(app)/groups/[id]/plan       invite maker: days, premade + custom questions, deadline, area, album
src/app/(app)/groups/[id]/add        add a hangout planned in person
src/app/(app)/invites/[id]           availability grid, questions, who answered, "Plan it with AI"
src/app/(app)/events/[id]            plan details, itinerary, RSVP, photo album
src/app/(app)/calendar               personal calendar across all groups
src/app/(app)/profile                name, photo, home pin on a map, log out
src/app/api/plan/route.ts            AI planner endpoint (logic in src/lib/planner.ts)
src/lib/api.ts                       every database call
src/components/                      UI kit, calendars, map, availability grid, question inputs
supabase/schema.sql                  tables + security rules + storage
scripts/seed.mjs                     demo data
```

## Splitting the work
- **Backend/AI:** `supabase/schema.sql`, `src/lib/planner.ts`, `src/app/api/plan`, `scripts/seed.mjs`
- **Invite flow:** `groups/[id]/plan`, `invites/[id]`, `AvailabilityGrid`, `QuestionField`
- **App shell:** auth pages, groups, settings, calendars, profile, events, map

## Known shortcuts
- Plans are made when someone taps the button, not automatically at the deadline.
- Times use the invite creator's UTC offset (ignores a daylight-saving change between now and the hangout).
