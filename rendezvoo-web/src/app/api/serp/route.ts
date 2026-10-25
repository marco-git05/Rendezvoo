import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { hasSerpKey, searchEvents, searchPlaces } from '@/lib/serp';

// POST /api/serp
//   { action: 'places', q, lat?, lng? }  → { places }   (SerpAPI Google Maps)
//   { action: 'events', q }              → { events }   (SerpAPI Google Events)
// Signed-in users only, so strangers can't spend the SerpAPI quota.
export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data: user } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
  if (!user?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  if (!hasSerpKey()) {
    console.error('[api/serp] SERPAPI_KEY is missing in .env.local. Add it and restart.');
    return NextResponse.json({ error: 'Search isn’t available right now. Please try again later.' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const q = String(body.q ?? '').trim().slice(0, 200);
  if (!q) return NextResponse.json({ error: 'Type something to search for' }, { status: 400 });

  if (body.action === 'events') {
    return NextResponse.json({ events: await searchEvents(q) });
  }
  const center = typeof body.lat === 'number' && typeof body.lng === 'number' ? { lat: body.lat, lng: body.lng } : null;
  return NextResponse.json({ places: await searchPlaces(q, center) });
}
