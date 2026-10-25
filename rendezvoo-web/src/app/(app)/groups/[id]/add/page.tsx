'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { Button, ErrorText, Field, PageHeader } from '@/components/ui';
import { createEvent } from '@/lib/api';
import { combine, todayKey } from '@/lib/dates';

// Manually add a hangout that was planned in person — or one picked from "Explore nearby"
// (which passes ?title=…&location=… in the link).
export default function AddEventPage() {
  return <Suspense><AddEventForm /></Suspense>;
}

function AddEventForm() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const [title, setTitle] = useState(params.get('title') ?? '');
  const [day, setDay] = useState(todayKey());
  const [start, setStart] = useState('18:00');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState(params.get('location') ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(e: FormEvent) {
    e.preventDefault();
    const startsAt = combine(day, start);
    const endsAt = end ? combine(day, end) : null;
    if (!startsAt) return setError('Pick a date and start time.');
    if (endsAt && endsAt <= startsAt) return setError('End time must be after the start time.');
    setSaving(true);
    try {
      const eventId = await createEvent({ groupId: id, title: title.trim(), startsAt, endsAt, location: location.trim() });
      router.push(`/events/${eventId}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <PageHeader title="Add a hangout" back={`/groups/${id}`} subtitle="For plans you already made in person." />
      <Field label="What's the plan?" placeholder="Taco night at Maya's" required value={title} onChange={(e) => setTitle(e.target.value)} />
      <Field label="Date" type="date" required value={day} onChange={(e) => setDay(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts" type="time" required value={start} onChange={(e) => setStart(e.target.value)} />
        <Field label="Ends (optional)" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <Field label="Where (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
      <ErrorText error={error} />
      <Button type="submit" loading={saving}>Add to calendar</Button>
    </form>
  );
}
