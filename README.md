# Rendezvoo (web)

Plan hangouts with your crew. Pick days, everyone fills in availability, and the app finds what works.
This is the website version (Vite + React + TypeScript). It runs on mock data for now.

## Run it

```
npm install
npm run dev
```

Open http://localhost:5173. On a phone on the same Wi-Fi, use the "Network" address Vite prints.

## Build for a demo

```
npm run build      # outputs to dist/
npm run preview    # serves the build locally
```

`dist/` is a static site. Drag it onto Netlify Drop, or deploy it with Vercel or GitHub Pages.
Routing uses the URL hash (`/#/group/g1`), so no server rewrite rules are needed.

## Where things are

```
src/
  pages/        Home, CalendarPage, Profile, GroupPage, GroupSettings, NewHangout, FillInvite
  components/   ui.tsx, MonthCalendar, DayPicker, AvailabilityGrid
  data/         types.ts, mock.ts, AppData.tsx  <- state + the seams for the real backend
  theme.tsx     Cactus flower / Lotus garden (CSS variables live in styles.css)
  utils/dates.ts
```

## Demo notes

- State is saved in the browser (localStorage). "Reset demo data" on the Profile page restores the seed data.
- Themes: Profile > My theme. Both palettes come from the Figma boards.
- The availability grid supports click, mouse drag, and tapping a day header.

## Next steps

- Replace `AppData.tsx` with Supabase calls (auth, groups, invites, responses).
- Add a Supabase Edge Function that pulls venues from SerpAPI and asks Gemini to rank them.
- Map on the profile and group screens, photo albums, carpool.
