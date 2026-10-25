// SerpAPI helpers. SERVER ONLY — the API key must never reach the browser.
// Used by /api/serp (map search) and the AI planner.
//   Google Maps:            https://serpapi.com/google-maps-api
//   Google Maps Directions: https://serpapi.com/google-maps-directions-api
//   Google Events:          https://serpapi.com/google-events-api
import type { EventResult, PlaceResult } from './types';

type LatLng = { lat: number; lng: number };

function apiKey(): string | null {
  const k = process.env.SERPAPI_KEY?.trim();
  return k && !k.startsWith('your') ? k : null; // ignore the .env.example placeholder
}
export const hasSerpKey = () => apiKey() !== null;

async function serp(params: Record<string, string>): Promise<any | null> {
  const key = apiKey();
  if (!key) return null;
  const u = new URL('https://serpapi.com/search.json');
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('api_key', key);
  try {
    const r = await fetch(u, { cache: 'no-store' });
    const data = await r.json().catch(() => null);
    if (!r.ok || data?.error) {
      console.error('SerpAPI', params.engine, r.status, data?.error);
      return null;
    }
    return data;
  } catch (e) {
    console.error('SerpAPI', params.engine, e);
    return null;
  }
}

function toPlace(p: any): PlaceResult {
  return {
    id: String(p.place_id ?? p.data_id ?? p.title),
    name: p.title,
    address: p.address,
    lat: p.gps_coordinates?.latitude,
    lng: p.gps_coordinates?.longitude,
    rating: p.rating,
    reviews: p.reviews,
    price: p.price,
    type: p.type,
    open_state: p.open_state,
    phone: p.phone,
    website: p.website,
    thumbnail: p.thumbnail,
  };
}

/** Google Maps search, near `center` when given. Also works for addresses (returns the single match). */
export async function searchPlaces(q: string, center?: LatLng | null, limit = 10): Promise<PlaceResult[]> {
  const params: Record<string, string> = { engine: 'google_maps', type: 'search', q, hl: 'en' };
  if (center) params.ll = `@${center.lat},${center.lng},13z`;
  const data = await serp(params);
  if (!data) return [];
  const list = data.local_results ?? (data.place_results ? [data.place_results] : []);
  return (list as any[]).slice(0, limit).map(toPlace).filter((p) => p.name);
}

/** Google Events, e.g. "events in <city>". */
export async function searchEvents(q: string, limit = 8): Promise<EventResult[]> {
  const data = await serp({ engine: 'google_events', q, hl: 'en', gl: 'us' });
  return ((data?.events_results ?? []) as any[]).slice(0, limit).map((e) => ({
    title: e.title,
    when: e.date?.when ?? e.date?.start_date,
    venue: e.venue?.name,
    address: Array.isArray(e.address) ? e.address.join(', ') : e.address,
    link: e.ticket_info?.[0]?.link ?? e.link ?? e.event_location_map?.link,
    thumbnail: e.thumbnail,
    price: e.price,
  }));
}

/** Driving time between two points (Google Maps Directions, travel_mode 0 = driving, miles). */
export async function driveTime(from: LatLng, to: LatLng): Promise<{ minutes: number; text: string; distance?: string } | null> {
  const data = await serp({
    engine: 'google_maps_directions',
    start_coords: `${from.lat},${from.lng}`,
    end_coords: `${to.lat},${to.lng}`,
    travel_mode: '0',
    distance_unit: '1',
  });
  const d = data?.directions?.[0];
  if (!d || typeof d.duration !== 'number') return null;
  return { minutes: Math.round(d.duration / 60), text: d.formatted_duration ?? `${Math.round(d.duration / 60)} min`, distance: d.formatted_distance };
}
