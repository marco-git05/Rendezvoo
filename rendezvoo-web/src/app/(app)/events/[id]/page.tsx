'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useUserId } from '@/components/AuthProvider';
import { HomesMap, type Pin } from '@/components/HomesMap';
import { Avatar, Button, Card, Empty, ErrorText, PageHeader, SectionTitle, Spinner, TextArea } from '@/components/ui';
import { addPhotos, deleteEvent, generatePlan, getEvent, getPhotos, setRsvp } from '@/lib/api';
import { fmtDay, fmtTime } from '@/lib/dates';
import type { HangoutEvent, Photo, Rsvp, RsvpStatus } from '@/lib/types';

// The calendar event "pop-up": plan details, AI itinerary, RSVP, and the shared photo album.
export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const uid = useUserId();
  const router = useRouter();
  const [event, setEvent] = useState<HangoutEvent | null>(null);
  const [rethinking, setRethinking] = useState(false);
  const [showRethink, setShowRethink] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [manageError, setManageError] = useState('');
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [r, p] = await Promise.all([getEvent(id), getPhotos(id)]);
      setEvent(r.event); setRsvps(r.rsvps); setPhotos(p);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (!event) return error ? <ErrorText error={error} /> : <Spinner />;

  const d = event.details;
  const mine = rsvps.find((r) => r.user_id === uid)?.status ?? 'pending';
  const going = rsvps.filter((r) => r.status === 'going');
  const declined = rsvps.filter((r) => r.status === 'declined');
  const waiting = rsvps.filter((r) => r.status === 'pending');
  const canDelete = event.created_by === uid || event.groups?.admin_id === uid;

  async function rethink() {
    setRethinking(true);
    setManageError('');
    try {
      const newId = await generatePlan(event!.invite_id!, { rethink: true, feedback });
      setShowRethink(false);
      setFeedback('');
      router.replace(`/events/${newId}`);
    } catch (e) {
      setManageError((e as Error).message);
      setRethinking(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete “${event!.title}”? This removes it from everyone’s calendar, along with its photos.`)) return;
    setDeleting(true);
    setManageError('');
    try {
      await deleteEvent(event!);
      router.replace(`/groups/${event!.group_id}`);
    } catch (e) {
      setManageError((e as Error).message);
      setDeleting(false);
    }
  }

  async function answer(status: RsvpStatus) {
    await setRsvp(id, status).catch((e) => setError(e.message));
    load();
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try { await addPhotos(id, Array.from(files)); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setUploading(false); }
  }

  const downloadUrl = (url: string) => `${url}${url.includes('?') ? '&' : '?'}download=`;

  return (
    <>
      <PageHeader title={event.title} back={`/groups/${event.group_id}`} subtitle={event.groups?.name} />

      <Card className="flex flex-col gap-2">
        <p>{fmtDay(event.starts_at)} · {fmtTime(event.starts_at)}{event.ends_at ? ` – ${fmtTime(event.ends_at)}` : ''}</p>
        {event.location && (
          <p>
            <a className="underline decoration-line underline-offset-4 hover:text-brand" target="_blank" rel="noreferrer"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}>{event.location}</a>
          </p>
        )}
        {d?.drivers?.length ? <p>Can drive: {d.drivers.join(', ')}</p> : null}
        {d?.description && <p className="mt-1">{d.description}</p>}
      </Card>

      {d?.itinerary?.length ? (
        <>
          <SectionTitle>Itinerary</SectionTitle>
          <Card className="flex flex-col gap-3">
            {d.itinerary.map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="w-20 shrink-0 font-semibold text-brand">{step.time ?? ''}</span>
                <span>
                  <span className="block">{step.activity}</span>
                  {step.place && <span className="text-sm text-muted">{step.place}</span>}
                </span>
              </div>
            ))}
          </Card>
        </>
      ) : null}

      {d?.reasoning && (
        <Card className="border-brand-soft bg-brand-soft text-sm">✨ <b>Why this plan:</b> {d.reasoning}</Card>
      )}

      {(d?.place?.lat != null || (d?.travel?.length ?? 0) > 0) && (
        <>
          <SectionTitle>Getting there</SectionTitle>
          <HomesMap height={260} pins={[
            ...(d?.travel ?? []).filter((t) => t.text !== 'Hosting').map((t): Pin => ({
              id: `home-${t.name}`, lat: t.lat, lng: t.lng, label: t.name.split(' ')[0], kind: 'home',
            })),
            ...(d?.place?.lat != null && d.place.lng != null
              ? [{ id: 'chosen', lat: d.place.lat, lng: d.place.lng, label: d.place.name, kind: 'chosen' } as Pin]
              : []),
          ]} />
          {d?.travel?.length ? (
            <Card className="flex flex-col gap-2">
              <p className="text-sm font-semibold">🚗 Drive times (from SerpAPI Google Maps Directions)</p>
              {d.travel.map((t) => (
                <div key={t.name} className="flex items-center gap-3">
                  <span className="flex-1">{t.name}</span>
                  <span className="text-sm text-muted">{t.distance ?? ''}</span>
                  <span className={`w-20 text-right font-semibold ${
                    t.minutes > (d.travel_limit ?? 30) + 10 ? 'text-danger' : t.minutes > (d.travel_limit ?? 30) ? 'text-[#C98A1B]' : ''
                  }`}>{t.text}</span>
                </div>
              ))}
              {d.drivers?.length ? (
                <p className="text-sm text-muted">Need a ride? {d.drivers.join(', ')} said they can drive.</p>
              ) : null}
              <p className="text-xs text-muted">
                Direct drive from each person’s house (carpool pickups not included)
                {d.travel_limit ? `. Goal: about ${d.travel_limit} min, give or take 10.` : '.'}
              </p>
            </Card>
          ) : null}
          {d?.place && (d.place.rating || d.place.website) && (
            <p className="text-sm text-muted">
              {d.place.rating ? `★ ${d.place.rating}${d.place.reviews ? ` (${d.place.reviews.toLocaleString()} reviews)` : ''}` : ''}
              {d.place.price ? ` · ${d.place.price}` : ''}
              {d.place.website ? <> · <a href={d.place.website} target="_blank" rel="noreferrer" className="text-brand">Website ↗</a></> : null}
            </p>
          )}
        </>
      )}

      {d?.options?.length ? (
        <>
          <SectionTitle>Other spots the AI considered</SectionTitle>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {d.options.map((o) => (
              <a key={o.id} target="_blank" rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.name} ${o.address ?? ''}`)}`}
                className="w-44 shrink-0 rounded-2xl border border-line bg-card p-3 hover:border-brand">
                {o.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.thumbnail} alt="" className="mb-2 h-20 w-full rounded-lg object-cover" />
                )}
                <p className="truncate font-semibold">{o.name}</p>
                <p className="text-xs text-muted">
                  {o.rating ? `★ ${o.rating}` : ''}{o.price ? ` · ${o.price}` : ''}{o.avg_miles != null ? ` · ~${o.avg_miles} mi` : ''}
                </p>
              </a>
            ))}
          </div>
        </>
      ) : null}

      {d?.nearby_events?.length ? (
        <>
          <SectionTitle>Also happening nearby</SectionTitle>
          {d.nearby_events.map((ev, i) => (
            <Card key={i} className="flex flex-col gap-0.5">
              <p className="font-semibold">{ev.title}</p>
              <p className="text-sm text-muted">{[ev.when, ev.venue].filter(Boolean).join(' · ')}</p>
              {ev.link && <a href={ev.link} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand">Details ↗</a>}
            </Card>
          ))}
        </>
      ) : null}

      <SectionTitle>Are you in?</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Button variant={mine === 'going' ? 'primary' : 'secondary'} onClick={() => answer('going')}>
          {mine === 'going' ? '✓ Going' : 'Going'}
        </Button>
        <Button variant={mine === 'declined' ? 'danger' : 'secondary'} onClick={() => answer('declined')}>
          {mine === 'declined' ? '✓ Can’t go' : 'Can’t go'}
        </Button>
      </div>

      <SectionTitle>Going ({going.length})</SectionTitle>
      {going.length ? (
        <div className="flex flex-wrap gap-3">
          {going.map((r) => (
            <span key={r.user_id} className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3">
              <Avatar src={r.profiles?.avatar_url} name={r.profiles?.name} size={28} />
              {r.user_id === uid ? 'You' : r.profiles?.name}
            </span>
          ))}
        </div>
      ) : <p className="text-sm text-muted">No one yet.</p>}
      {declined.length > 0 && (
        <p className="text-sm text-muted">Can’t make it: {declined.map((r) => r.profiles?.name).join(', ')}</p>
      )}
      {waiting.length > 0 && (
        <p className="text-sm text-muted">
          Waiting for approval from: {waiting.map((r) => (r.user_id === uid ? 'you' : r.profiles?.name?.split(' ')[0])).join(', ')}
        </p>
      )}
      {d?.previous?.length ? (
        <p className="text-xs text-muted">
          🔄 New plan after the group passed on {d.previous.map((p) => p.location || p.title).join(', ')}.
        </p>
      ) : null}

      {event.album && (
        <>
          <div className="mt-3 flex items-center justify-between">
            <SectionTitle>Photo album</SectionTitle>
            <label className="cursor-pointer text-sm font-semibold text-brand">
              {uploading ? 'Uploading…' : '+ Add photos'}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
            </label>
          </div>
          {photos.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((p) => (
                <a key={p.id} href={downloadUrl(p.url)} title="Download" className="group relative block aspect-square overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 text-xs text-white opacity-0 group-hover:opacity-100">⬇</span>
                </a>
              ))}
            </div>
          ) : (
            <Empty title="No photos yet" subtitle="Anyone in the group can add photos from the hangout." />
          )}
        </>
      )}

      {(event.invite_id || canDelete) && (
        <>
          <SectionTitle>Not feeling it?</SectionTitle>
          <Card className="flex flex-col gap-3">
            {event.invite_id && (
              showRethink ? (
                <>
                  <TextArea
                    label="What should change? (optional)"
                    placeholder="e.g. somewhere cheaper, quieter, closer to downtown, earlier in the day…"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    maxLength={300}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" onClick={() => setShowRethink(false)} disabled={rethinking}>Cancel</Button>
                    <Button onClick={rethink} loading={rethinking}> Get a new plan</Button>
                  </div>
                  <p className="text-xs text-muted">
                    {rethinking
                      ? 'Rethinking: searching new spots and checking drive times…'
                      : 'The new plan replaces this one, and everyone will be asked to approve it again.'}
                  </p>
                </>
              ) : (
                <Button variant="secondary" onClick={() => setShowRethink(true)}> Ask AI to rethink this plan</Button>
              )
            )}
            {canDelete && (
              <Button variant="danger" onClick={remove} loading={deleting}>🗑️ Delete hangout</Button>
            )}
            <ErrorText error={manageError} />
          </Card>
        </>
      )}
    </>
  );
}
