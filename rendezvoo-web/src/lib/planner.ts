// AI hangout planner. SERVER ONLY — imported by src/app/api/plan/route.ts.
//
// 1. Checks the caller is in the invite's group.
// 2. Finds the best stretches of consecutive hours most people are free (priority attendees first).
// 3. SerpAPI Google Maps: real places near the group's shared homes (or the invite's "Area").
//    SerpAPI Google Events: what's happening nearby.
// 4. Asks Google Gemini to pick one plan as JSON.
// 5. SerpAPI Google Maps Directions: each member's drive time to the chosen spot.
// 6. Saves it as an event (replacing any earlier plan), sets everyone's RSVP to pending, marks the invite planned.
// If SerpAPI or Gemini is missing or fails, it still saves a simple plan so the demo never dead-ends.

import { createClient } from '@supabase/supabase-js';
import { AT_HOME_VIBES, DEFAULT_END_HOUR, DEFAULT_START_HOUR, hourLabel, VIBE_QUERY } from './invite';
import { driveTime, searchEvents as serpEvents, searchPlaces as serpPlaces } from './serp';
import type { PlaceResult, TravelTime } from './types';

type Slot = { date: string; start: number; end: number; people: string[]; priority: number }; // hours, end exclusive
type Place = PlaceResult;
type Plan = {
  title: string; slot_index: number; start_hour: number; end_hour: number;
  location: string; description: string; reasoning: string;
  itinerary: { time?: string; activity: string; place?: string }[];
};
type LatLng = { lat: number; lng: number };

export const PLAN_UNAVAILABLE = 'We couldn’t make a plan right now. Please try again in a moment.';

// Errors with messages that are safe to show users.
export class PlanError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}


export type PlanOptions = { rethink?: boolean; feedback?: string };

export async function planHangout(inviteId: string, accessToken: string, opts: PlanOptions = {}): Promise<string> {
  if (!inviteId) throw new PlanError('inviteId is required');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  // Read the invite as the caller, so database security proves they're in the group.
  const asUser = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });
  const { data: invite } = await asUser.from('invites').select('*').eq('id', inviteId).maybeSingle();
  if (!invite) throw new PlanError('Invite not found, or you are not in this group', 403);

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey || serviceKey.startsWith('your')) {
    // Setup problem: details go to the server log (your terminal), users see a friendly message.
    console.error('[planner] SUPABASE_SERVICE_ROLE_KEY is missing in .env.local (Supabase → Project Settings → API → service_role). Add it and restart.');
    throw new PlanError(PLAN_UNAVAILABLE, 500);
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const [{ data: responses, error: respErr }, { data: members }] = await Promise.all([
    admin.from('responses').select('*').eq('invite_id', inviteId),
    admin.from('group_members').select('user_id, share_location, is_priority, profiles(name)').eq('group_id', invite.group_id),
  ]);
  if (respErr) {
    console.error('[planner] Database error (check SUPABASE_SERVICE_ROLE_KEY in .env.local):', respErr.message);
    throw new PlanError(PLAN_UNAVAILABLE, 500);
  }
  if (!responses?.length) throw new PlanError('Nobody has answered yet');
  const mems = (members ?? []) as any[];
  const nameOf = (uid: string) => mems.find((m) => m.user_id === uid)?.profiles?.name ?? 'Someone';
  const priorityIds = new Set(mems.filter((m) => m.is_priority).map((m) => m.user_id));

  // ---- When ----
  const slots = rankSlots(invite, responses, priorityIds);
  if (!slots.length) throw new PlanError('No one is free on the listed days yet');

  // ---- What people want ----
  const vibe = majority(responses, 'vibe');
  const budget = majority(responses, 'budget');
  const drivers = responses.filter((r: any) => r.answers?.driver === true).map((r: any) => nameOf(r.user_id));
  const answers = (invite.questions ?? []).map((q: any) => ({
    question: q.prompt,
    answers: responses
      .filter((r: any) => r.answers?.[q.id] !== undefined && r.answers?.[q.id] !== '')
      .map((r: any) => ({ name: nameOf(r.user_id), answer: r.answers[q.id] })),
  }));

  // ---- Where (only homes shared with this group) ----
  const sharing = mems.filter((m) => m.share_location).map((m) => m.user_id);
  const homes: (LatLng & { user_id: string })[] = sharing.length
    ? ((await admin.from('homes').select('*').in('user_id', sharing)).data ?? [])
    : [];
  const center = centroid(homes);

  // If nobody shares a home with the group, search around the planner's own pinned home
  // (used only on the server to center the search; never shown to anyone).
  let searchFrom: LatLng | null = center;
  let distanceFrom: LatLng[] = homes;
  if (!searchFrom) {
    const { data: own } = await admin.from('homes').select('lat, lng').eq('user_id', invite.creator_id).maybeSingle();
    if (own) { searchFrom = own; distanceFrom = [own]; }
  }

  // Strictest travel limit anyone gave ("15 min", "I'll drive 20 minutes max", …). No answer → 30 min.
  // Adults are flexible, so drive times are a guide, not a wall:
  //   the main pick may run up to 10 min over the strictest limit,
  //   "other spots" up to 15 min over. Times are each person's direct drive (carpool pickups not counted).
  const limitMinutes = travelLimit(responses);
  const PICK_SLACK = 10;
  const OPTION_SLACK = 15;
  const toMiles = (min: number) => Math.max(3, min / 2); // ≈30 mph average in town
  const pickMiles = toMiles(limitMinutes + PICK_SLACK);
  const optionMiles = toMiles(limitMinutes + OPTION_SLACK);

  const [rawPlaces, localEvents] = await Promise.all([
    placesFor(vibe, searchFrom, invite.location_hint),
    eventsFor(vibe, invite.location_hint),
  ]);
  // "Rethink": remember the plan(s) the group turned down, so the AI suggests something different.
  let previous: { title: string; location: string | null; when: string }[] = [];
  if (opts.rethink) {
    const { data: old } = await admin.from('events').select('title, location, starts_at, details')
      .eq('invite_id', inviteId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (old) previous = [...((old.details as any)?.previous ?? []), { title: old.title, location: old.location, when: old.starts_at }];
  }
  const turnedDown = previous.map((p) => (p.location ?? '').toLowerCase()).filter(Boolean);
  const isTurnedDown = (name?: string) => !!name && turnedDown.some((l) => l.includes(name.toLowerCase()));

  // Drop anything farther than the travel limit (SerpAPI can return far-away matches).
  const measured = rawPlaces.filter((p) => !isTurnedDown(p.name)).map((p) => withDistance(p, distanceFrom));
  const within = (miles: number) => (p: Place) => p.max_miles == null || p.max_miles <= miles;
  const optionPool = measured.filter(within(optionMiles));   // for "other spots"
  const closeEnough = measured.filter(within(pickMiles));
  const places = closeEnough.length ? closeEnough : optionPool; // what the AI picks from
  if (!places.length) {
    console.warn('[planner] No places to suggest. Ask members to pin + share their homes, or set an Area on the invite.');
  }
  const hosts = center
    ? [...homes].sort((a, b) => miles(a, center) - miles(b, center))
        .map((h) => ({ name: nameOf(h.user_id), miles_from_group_center: round(miles(h, center)) }))
    : [];

  // ---- Ask Gemini (fallback if unavailable) ----
  const context = {
    invite_title: invite.title,
    group_size: mems.length,
    responded: responses.length,
    priority_attendees: [...priorityIds].map(nameOf),
    candidate_slots: slots.map((s, i) => ({
      slot_index: i, date: s.date, weekday: weekday(s.date),
      window: `${hourLabel(s.start)}–${hourLabel(s.end)}`, window_hours_24h: [s.start, s.end],
      free_people: s.people.map(nameOf), free_count: s.people.length, priority_free: s.priority,
    })),
    majority_vibe: vibe, majority_budget: budget, drivers,
    answers,
    places: places.map((p) => ({
      name: p.name, address: p.address, rating: p.rating, reviews: p.reviews, price: p.price, type: p.type,
      open_state: p.open_state, avg_miles: p.avg_miles, max_miles: p.max_miles,
    })),
    local_events: localEvents.map((e) => ({ title: e.title, when: e.when, venue: e.venue, address: e.address })),
    possible_hosts: hosts, area_hint: invite.location_hint,
    travel_limit_minutes: limitMinutes,
    travel_flexibility_minutes: PICK_SLACK,
    rejected_plans: previous.length ? previous : undefined,
    change_request: opts.feedback?.trim().slice(0, 300) || undefined,
  };
  const plan = sanitize((await askGemini(context)) ?? fallbackPlan(slots, places, hosts, vibe), slots);

  // ---- Guardrail: the AI may only choose a place we actually found (or a member's home) ----
  const hostNames = homes.map((h) => `${nameOf(h.user_id).split(' ')[0].toLowerCase()}'s`);
  let loc = (plan.location || '').toLowerCase();
  let chosen = places.find((p) => p.name && loc.includes(p.name.toLowerCase())) ?? null;
  const isHost = hostNames.some((n) => loc.includes(n));
  if (!chosen && !isHost) {
    if (loc) console.warn(`[planner] AI suggested "${plan.location}", which isn't one of the nearby places. Replacing it.`);
    const best = [...places].sort((a, b) =>
      (a.avg_miles ?? 0) - (b.avg_miles ?? 0) || (b.rating ?? 0) - (a.rating ?? 0))[0];
    if (best) {
      chosen = best;
      plan.location = `${best.name}${best.address ? `, ${best.address}` : ''}`;
      plan.itinerary = [];
      plan.description = `Meet at ${best.name}${best.rating ? ` (★ ${best.rating})` : ''}${best.avg_miles != null ? `, about ${best.avg_miles} miles from everyone on average` : ''}.`;
      plan.reasoning = `It's the closest well-rated spot that's about a ${limitMinutes}-minute drive (give or take) for everyone.`;
    } else {
      plan.location = '';
      plan.itinerary = [];
      plan.description = 'Pick a spot together! Pin and share your homes (or add an Area to the invite) so Rendezvoo can suggest places nearby.';
    }
    loc = plan.location.toLowerCase();
  }
  let dest: LatLng | null = chosen?.lat != null && chosen.lng != null ? { lat: chosen.lat, lng: chosen.lng } : null;
  let hostId: string | null = null;
  if (!dest && loc) {
    const host = homes.find((h) => loc.includes(`${nameOf(h.user_id).split(' ')[0].toLowerCase()}'s`));
    if (host) { dest = { lat: host.lat, lng: host.lng }; hostId = host.user_id; }
  }
  const travel: TravelTime[] = dest
    ? (await Promise.all(homes.slice(0, 8).map(async (h): Promise<TravelTime | null> => {
        const base = { name: nameOf(h.user_id), lat: h.lat, lng: h.lng };
        if (h.user_id === hostId || miles(h, dest!) < 0.05) return { ...base, minutes: 0, text: 'Hosting' };
        const t = await driveTime(h, dest!);
        return t ? { ...base, ...t } : null;
      }))).filter((t): t is TravelTime => t !== null).sort((a, b) => a.minutes - b.minutes)
    : [];
  const place: PlaceResult | undefined = chosen ?? (dest ? { id: 'host', name: plan.location, lat: dest.lat, lng: dest.lng } : undefined);

  // ---- Save ----
  const slot = slots[plan.slot_index];
  const tz = invite.tz_offset ?? 0;
  await admin.from('events').delete().eq('invite_id', inviteId); // re-planning replaces the old plan
  const { data: event, error } = await admin.from('events').insert({
    group_id: invite.group_id,
    invite_id: inviteId,
    title: plan.title,
    starts_at: localToUtc(slot.date, plan.start_hour, tz).toISOString(),
    ends_at: localToUtc(slot.date, plan.end_hour, tz).toISOString(),
    location: plan.location || null,
    album: invite.album ?? true,
    details: {
      description: plan.description,
      reasoning: plan.reasoning,
      itinerary: plan.itinerary,
      free_people: slot.people.map(nameOf),
      drivers,
      place,
      options: optionPool.filter((p) => p.name !== chosen?.name).slice(0, 4),
      travel_limit: limitMinutes,
      travel,
      nearby_events: localEvents.slice(0, 3),
      previous,
    },
    created_by: invite.creator_id,
  }).select('id').single();
  if (error) {
    console.error('[planner] Could not save the event:', error.message);
    throw new PlanError(PLAN_UNAVAILABLE, 500);
  }

  await admin.from('event_rsvps').upsert(mems.map((m) => ({ event_id: event.id, user_id: m.user_id, status: 'pending' })));
  await admin.from('invites').update({ status: 'planned' }).eq('id', inviteId);
  return event.id as string;
}

// ---------------- helpers ----------------

function rankSlots(invite: any, responses: any[], priorityIds: Set<string>): Slot[] {
  const valid = new Set<string>(invite.dates ?? []);
  const today = new Date(Date.now() - (invite.tz_offset ?? 0) * 60000).toISOString().slice(0, 10); // creator's "today"
  const lo = invite.start_hour ?? DEFAULT_START_HOUR;
  const hi = invite.end_hour ?? DEFAULT_END_HOUR;

  // date → hour → people free
  const free = new Map<string, Map<number, Set<string>>>();
  for (const r of responses) {
    for (const [date, hours] of Object.entries(r.availability ?? {})) {
      if (!valid.has(date) || date < today) continue;
      for (const h of hours as unknown[]) {
        if (typeof h !== 'number' || h < lo || h >= hi) continue;
        if (!free.has(date)) free.set(date, new Map());
        const byHour = free.get(date)!;
        if (!byHour.has(h)) byHour.set(h, new Set());
        byHour.get(h)!.add(r.user_id);
      }
    }
  }

  // Every window of 1–4 consecutive hours, with the people free for ALL of it.
  const candidates: Slot[] = [];
  for (const [date, byHour] of free) {
    for (let start = lo; start < hi; start++) {
      let people = byHour.get(start);
      if (!people?.size) continue;
      for (let len = 1; len <= 4 && start + len <= hi; len++) {
        if (len > 1) {
          const next = byHour.get(start + len - 1);
          people = new Set([...people].filter((p) => next?.has(p)));
        }
        if (!people.size) break;
        const list = [...people];
        candidates.push({ date, start, end: start + len, people: list, priority: list.filter((p) => priorityIds.has(p)).length });
      }
    }
  }

  candidates.sort((a, b) =>
    b.priority - a.priority ||
    b.people.length - a.people.length ||
    (b.end - b.start) - (a.end - a.start) ||
    a.date.localeCompare(b.date) ||
    a.start - b.start);

  // Keep the top 5 that don't overlap each other.
  const picked: Slot[] = [];
  for (const c of candidates) {
    if (picked.some((p) => p.date === c.date && c.start < p.end && p.start < c.end)) continue;
    picked.push(c);
    if (picked.length === 5) break;
  }
  return picked;
}

function majority(responses: any[], key: string): string | null {
  const counts: Record<string, number> = {};
  for (const r of responses) {
    const v = r.answers?.[key];
    if (typeof v === 'string' && v) counts[v] = (counts[v] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function centroid(points: LatLng[]): LatLng | null {
  if (!points.length) return null;
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
  };
}

function miles(a: LatLng, b: LatLng) {
  const R = 3958.8, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const round = (n: number) => Math.round(n * 10) / 10;

function withDistance(p: Place, homes: LatLng[]): Place {
  if (p.lat == null || p.lng == null || !homes.length) return p;
  const d = homes.map((h) => miles(h, { lat: p.lat!, lng: p.lng! }));
  return { ...p, avg_miles: round(d.reduce((s, x) => s + x, 0) / d.length), max_miles: round(Math.max(...d)) };
}

/** Strictest travel limit (minutes) found in anyone's answers, e.g. "15 min" or "no more than 20 minutes". */
function travelLimit(responses: any[]): number {
  let limit = Infinity;
  for (const r of responses) {
    for (const v of Object.values(r.answers ?? {})) {
      if (typeof v !== 'string') continue;
      const m = v.match(/(\d+)\s*\+?\s*(?:min|mins|minute|minutes)\b/i);
      if (m && !/\+/.test(v)) limit = Math.min(limit, Number(m[1]));
    }
  }
  return Number.isFinite(limit) ? Math.max(5, limit) : 30;
}

async function placesFor(vibe: string | null, center: LatLng | null, hint: string | null): Promise<Place[]> {
  const q = VIBE_QUERY[vibe ?? ''] ?? 'fun things to do with friends';
  if (center) return serpPlaces(q, center, 8);
  if (hint) return serpPlaces(`${q} in ${hint}`, null, 8);
  return [];
}

async function eventsFor(vibe: string | null, hint: string | null) {
  if (!hint || vibe === 'Meeting') return [];
  return serpEvents(`events in ${hint}`, 6);
}

const SYSTEM = `You plan hangouts for a group of adults (friends, a school club, or coworkers).
You get candidate time windows (ranked best-first; priority attendees matter most), everyone's answers,
nearby places (with average/max miles from members' homes when known), local events, and possible hosts.
Pick ONE plan that the most people (and all priority attendees, if possible) can attend and that fits
the majority vibe and budget. Prefer shorter trips, respect free-text requests and dietary needs,
and mention who can drive if people need rides.
For "Night in" or "Day in", host at one of possible_hosts (closest to the group first); you may suggest takeout from places.
For "Meeting", pick a quiet, practical spot.
Only use places/events from the lists given (or a host's place). Never invent places or addresses, and never suggest anywhere outside the members' area.
Treat travel_limit_minutes as a guide, not a hard rule: these are flexible adults, so going up to travel_flexibility_minutes over is fine.
Drive times are each person's direct drive; don't add time for carpool pickups. If places and possible_hosts are both empty, set "location" to "".
If rejected_plans is given, the group turned those down: suggest a clearly different place and title (a different time is fine too).
If change_request is given, follow it (e.g. "cheaper", "somewhere quieter", "earlier").
In "location", start with the place's exact name from the list (or "<FirstName>'s place" for a host).
Reply with ONLY a JSON object, no markdown:
{"title": string (short and fun),
 "slot_index": number (from candidate_slots),
 "start_hour": number (24h local, may be fractional like 18.5, inside that slot's window_hours_24h),
 "end_hour": number (after start_hour, no later than the window's end),
 "location": string (place name and address, or "<Name>'s place"),
 "description": string (2-3 friendly sentences),
 "reasoning": string (1-2 sentences: why this time and place),
 "itinerary": [{"time": "6:30 PM", "activity": string, "place": string}] (1-4 steps)}`;

async function askGemini(context: unknown): Promise<Plan | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key.startsWith('your')) {
    console.warn('[planner] GEMINI_API_KEY not set in .env.local, so using the simple built-in plan instead.');
    return null;
  }
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(context) }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
      }),
    });
    if (!res.ok) { console.error('[planner] Gemini', res.status, await res.text()); return null; }
    const data = await res.json();
    const text: string = (data.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('');
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch (e) {
    console.error('[planner] Gemini', e);
    return null;
  }
}

function fallbackPlan(slots: Slot[], places: Place[], hosts: { name: string }[], vibe: string | null): Plan {
  const slot = slots[0];
  const atHome = AT_HOME_VIBES.has(vibe ?? '') && hosts.length > 0;
  const place = places[0];
  const location = atHome ? `${hosts[0].name}'s place` : place ? `${place.name}${place.address ? `, ${place.address}` : ''}` : '';
  return {
    title: vibe ? `${vibe} hangout` : 'Group hangout',
    slot_index: 0,
    start_hour: slot.start,
    end_hour: slot.end,
    location,
    description: `The most people are free ${weekday(slot.date)} from ${hourLabel(slot.start)} to ${hourLabel(slot.end)}, so let's meet then${location ? ` at ${location}` : ''}.`,
    reasoning: `${slot.people.length} people are free for that whole stretch, more than any other time.`,
    itinerary: [],
  };
}

function sanitize(plan: Plan, slots: Slot[]): Plan {
  const i = Number.isInteger(plan.slot_index) && slots[plan.slot_index] ? plan.slot_index : 0;
  const { start: lo, end: hi } = slots[i];
  let start = typeof plan.start_hour === 'number' ? plan.start_hour : lo;
  start = Math.min(Math.max(start, lo), hi - 0.5);
  let end = typeof plan.end_hour === 'number' && plan.end_hour > start ? plan.end_hour : hi;
  end = Math.min(end, hi);
  return {
    title: plan.title || 'Group hangout',
    slot_index: i,
    start_hour: start,
    end_hour: end,
    location: plan.location ?? '',
    description: plan.description ?? '',
    reasoning: plan.reasoning ?? '',
    itinerary: Array.isArray(plan.itinerary) ? plan.itinerary.slice(0, 6) : [],
  };
}

/** Local wall-clock (date + fractional hour) → UTC, using the creator's getTimezoneOffset(). */
function localToUtc(date: string, hour: number, tzOffsetMinutes: number): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + hour * 3600000 + tzOffsetMinutes * 60000);
}

function weekday(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
}
