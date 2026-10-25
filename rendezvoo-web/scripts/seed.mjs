// Demo data. Run from the project folder:   npm run seed
// Needs in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_LAT, SEED_LNG (SEED_AREA optional)
// Safe to re-run: it rebuilds the "Demo Crew" group each time.

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const lat = Number(process.env.SEED_LAT);
const lng = Number(process.env.SEED_LNG);
const area = process.env.SEED_AREA || null;
if (!url || !serviceKey || !lat || !lng) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_LAT and SEED_LNG in .env.local');
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const PASSWORD = 'demo1234';
const PEOPLE = [
  { name: 'Maya Patel', email: 'demo1@rendezvoo.test', dLat: 0.012, dLng: -0.020 },
  { name: 'Jordan Lee', email: 'demo2@rendezvoo.test', dLat: -0.018, dLng: 0.010 },
  { name: 'Priya Shah', email: 'demo3@rendezvoo.test', dLat: 0.025, dLng: 0.015 },
  { name: 'Sam Rivera', email: 'demo4@rendezvoo.test', dLat: -0.008, dLng: -0.030 },
  { name: 'Alex Kim',   email: 'demo5@rendezvoo.test', dLat: 0.004, dLng: 0.028 },
];

// Same premade questions as src/lib/invite.ts
const QUESTIONS = [
  { id: 'vibe', type: 'mcq', prompt: 'What kind of hangout?', options: ['Casual', 'Night out', 'Night in', 'Day out', 'Day in', 'Meeting'] },
  { id: 'budget', type: 'mcq', prompt: 'Budget per person?', options: ['Free', '$ (under $15)', '$$ ($15–40)', '$$$ ($40+)'] },
  { id: 'driver', type: 'yn', prompt: 'Can you drive others (carpool)?' },
  { id: 'ideas', type: 'frq', prompt: 'Any ideas or requests?' },
];

const pad = (n) => String(n).padStart(2, '0');
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function nextWeekday(dow) { // 0=Sun … 6=Sat, at least 2 days from now
  const d = new Date();
  d.setDate(d.getDate() + 2);
  while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
  return d;
}
async function must(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

// 1. Users (reused if they already exist)
const existing = await must(db.auth.admin.listUsers({ perPage: 1000 }), 'list users');
const ids = [];
for (const p of PEOPLE) {
  let user = existing.users.find((u) => u.email === p.email);
  if (!user) {
    user = (await must(db.auth.admin.createUser({
      email: p.email, password: PASSWORD, email_confirm: true, user_metadata: { name: p.name },
    }), `create ${p.email}`)).user;
  }
  ids.push(user.id);
  await must(db.from('profiles').upsert({ id: user.id, name: p.name }), 'profile');
  await must(db.from('homes').upsert({ user_id: user.id, lat: lat + p.dLat, lng: lng + p.dLng }), 'home');
}

// 2. Group (rebuilt each run)
await must(db.from('groups').delete().eq('name', 'Demo Crew'), 'clear old group');
const group = await must(db.from('groups').insert({ name: 'Demo Crew', kind: 'friends', admin_id: ids[0] }).select().single(), 'group');
await must(db.from('group_members').insert(ids.map((id) => ({ group_id: group.id, user_id: id, share_location: true }))), 'members');

// 3. A past hangout so calendars aren't empty
const past = new Date(); past.setDate(past.getDate() - 6); past.setHours(19, 0, 0, 0);
const pastEvent = await must(db.from('events').insert({
  group_id: group.id, title: 'Trivia night', starts_at: past.toISOString(),
  ends_at: new Date(past.getTime() + 2 * 3600000).toISOString(), location: 'The usual spot', created_by: ids[0],
}).select('id').single(), 'past event');
await must(db.from('event_rsvps').insert(ids.slice(0, 4).map((id) => ({ event_id: pastEvent.id, user_id: id, status: 'going' }))), 'past rsvps');

// 4. Open invite for Fri/Sat/Sun. Alex (demo5) hasn't answered: answer live in the demo, then "Plan it with AI".
const fri = key(nextWeekday(5)), sat = key(nextWeekday(6)), sun = key(nextWeekday(0));
const invite = await must(db.from('invites').insert({
  group_id: group.id, creator_id: ids[0], title: 'Weekend hang', dates: [fri, sat, sun],
  questions: QUESTIONS, tz_offset: new Date().getTimezoneOffset(), location_hint: area,
  start_hour: 10, end_hour: 23,
}).select('id').single(), 'invite');

const hrs = (from, to) => Array.from({ length: to - from }, (_, i) => from + i); // [from, to)
// Everyone overlaps Saturday 6–9 PM; other overlaps are smaller.
const responses = [
  { availability: { [fri]: hrs(17, 21), [sat]: hrs(13, 22) }, answers: { vibe: 'Night out', budget: '$$ ($15–40)', driver: true, ideas: 'Somewhere with good food, not too loud' } },
  { availability: { [sat]: hrs(18, 23), [sun]: hrs(12, 16) }, answers: { vibe: 'Night out', budget: '$$ ($15–40)', driver: false, ideas: 'Live music?' } },
  { availability: { [fri]: hrs(18, 22), [sat]: hrs(17, 21) }, answers: { vibe: 'Casual', budget: '$ (under $15)', driver: true, ideas: 'I’m vegetarian' } },
  { availability: { [sat]: hrs(14, 21), [sun]: hrs(10, 12) }, answers: { vibe: 'Night out', budget: '$$ ($15–40)', driver: false } },
];
await must(db.from('responses').insert(responses.map((r, i) => ({ invite_id: invite.id, user_id: ids[i], ...r }))), 'responses');

console.log(`Seeded "Demo Crew" (join code ${group.invite_code}). Log in with any of:`);
for (const p of PEOPLE) console.log(`  ${p.email} / ${PASSWORD}`);
