'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { findEvents, findPlaces } from '@/lib/api';
import type { EventResult, PlaceResult } from '@/lib/types';
import { HomesMap, type Pin } from './HomesMap';
import { Button, Chip, ErrorText } from './ui';

type Home = { id: string; lat: number; lng: number; label: string };

const QUICK = ['Coffee', 'Restaurants', 'Bowling', 'Parks', 'Arcades', 'Escape rooms', 'Live music', 'Dessert'];

const mapsLink = (p: PlaceResult) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address ?? ''}`)}`;

/**
 * "Explore nearby": search real places (SerpAPI Google Maps) and local events (SerpAPI Google Events),
 * shown on a map next to the group's shared homes. Each result can be turned into a hangout.
 */
export function Explorer({ groupId, homes, center }: {
  groupId: string;
  homes: Home[];
  center: { lat: number; lng: number } | null; // middle of the group's shared homes
}) {
  const [mode, setMode] = useState<'places' | 'events'>('places');
  const [q, setQ] = useState('');
  const [places, setPlaces] = useState<PlaceResult[] | null>(null);
  const [events, setEvents] = useState<EventResult[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(query: string, m = mode) {
    if (!query.trim()) return;
    setQ(query);
    setBusy(true);
    setError('');
    setSelected(null);
    try {
      if (m === 'places') setPlaces(await findPlaces(query, center));
      else setEvents(await findEvents(query));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const onSubmit = (e: FormEvent) => { e.preventDefault(); run(q); };

  const pins: Pin[] = [
    ...homes.map((h) => ({ ...h, kind: 'home' as const })),
    ...(mode === 'places' ? places ?? [] : [])
      .filter((p) => p.lat != null && p.lng != null)
      .map((p, i) => ({
        id: p.id, lat: p.lat!, lng: p.lng!, label: p.name, kind: 'place' as const, number: i + 1, selected: selected === p.id,
      })),
  ];

  const addLink = (title: string, location: string) =>
    `/groups/${groupId}/add?${new URLSearchParams({ title, location }).toString()}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex rounded-xl bg-line p-1">
        {(['places', 'events'] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold ${mode === m ? 'bg-card shadow-sm' : 'text-muted'}`}>
            {m === 'places' ? '📍 Places' : '🎟️ Events'}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={mode === 'places' ? (center ? 'Search near your group, e.g. “tacos”' : 'e.g. “tacos in <your city>”') : 'e.g. “concerts in <your city> this weekend”'}
          className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3.5 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
        />
        <Button type="submit" loading={busy} disabled={!q.trim()}>Search</Button>
      </form>

      {mode === 'places' && (
        <div className="flex flex-wrap gap-2">
          {QUICK.map((c) => <Chip key={c} label={c} onClick={() => run(c, 'places')} />)}
        </div>
      )}
      {!center && mode === 'places' && (
        <p className="text-xs text-muted">Tip: nobody in this group shares their house location yet, so add a city to your search.</p>
      )}
      <ErrorText error={error} />

      {mode === 'places' && (pins.length > 0 || places) && (
        <HomesMap pins={pins} focus={selected} onPinClick={(id) => setSelected(id)} height={300} />
      )}

      {mode === 'places' && places && (
        places.length === 0 ? <p className="text-sm text-muted">No places found. Try different words.</p> : (
          <ol className="flex flex-col gap-2">
            {places.map((p, i) => (
              <li key={p.id}
                onClick={() => setSelected(p.id)}
                className={`flex cursor-pointer gap-3 rounded-2xl border bg-card p-3 transition ${selected === p.id ? 'border-brand ring-2 ring-brand-soft' : 'border-line hover:border-brand'}`}>
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>
                {p.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumbnail} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-muted">
                    {p.rating ? `★ ${p.rating}${p.reviews ? ` (${p.reviews.toLocaleString()})` : ''}` : ''}
                    {p.price ? ` · ${p.price}` : ''}{p.type ? ` · ${p.type}` : ''}
                  </p>
                  {p.address && <p className="truncate text-sm text-muted">{p.address}</p>}
                  {p.open_state && <p className="text-xs text-muted">{p.open_state}</p>}
                  {selected === p.id && (
                    <div className="mt-2 flex flex-wrap gap-2 text-sm font-semibold">
                      <Link href={addLink(p.name, `${p.name}${p.address ? `, ${p.address}` : ''}`)} className="text-brand">+ Plan a hangout here</Link>
                      <a href={mapsLink(p)} target="_blank" rel="noreferrer" className="text-muted hover:text-ink">Open in Google Maps ↗</a>
                      {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="text-muted hover:text-ink">Website ↗</a>}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )
      )}

      {mode === 'events' && events && (
        events.length === 0 ? <p className="text-sm text-muted">No events found. Try adding your city to the search.</p> : (
          <ul className="flex flex-col gap-2">
            {events.map((ev, i) => (
              <li key={`${ev.title}-${i}`} className="flex gap-3 rounded-2xl border border-line bg-card p-3">
                {ev.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ev.thumbnail} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{ev.title}</p>
                  {ev.when && <p className="text-sm text-muted">{ev.when}</p>}
                  {(ev.venue || ev.address) && <p className="truncate text-sm text-muted">{ev.venue ?? ev.address}</p>}
                  <div className="mt-1 flex flex-wrap gap-3 text-sm font-semibold">
                    <Link href={addLink(ev.title, ev.venue ?? ev.address ?? '')} className="text-brand">+ Add as a hangout</Link>
                    {ev.link && <a href={ev.link} target="_blank" rel="noreferrer" className="text-muted hover:text-ink">Details / tickets ↗</a>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
