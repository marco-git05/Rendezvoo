'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EventCalendar } from '@/components/Calendars';
import { EventRow } from '@/components/EventRow';
import { Empty, ErrorText, PageHeader, SectionTitle, Spinner } from '@/components/ui';
import { getMyEvents, getMyGroups } from '@/lib/api';
import type { HangoutEvent } from '@/lib/types';

// Personal calendar: every hangout from every group, in the color you picked for each group.
export default function MyCalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<HangoutEvent[] | null>(null);
  const [colors, setColors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getMyEvents(), getMyGroups()])
      .then(([evs, groups]) => {
        setEvents(evs);
        setColors(Object.fromEntries(groups.map((g) => [g.group_id, g.color])));
      })
      .catch((e) => setError(e.message));
  }, []);

  const colorFor = (e: HangoutEvent) => colors[e.group_id] ?? '#E2603B';
  const upcoming = (events ?? []).filter((e) => new Date(e.starts_at).getTime() >= Date.now()).slice(0, 6);

  return (
    <>
      <PageHeader title="My calendar" subtitle="Everything from all your groups." />
      <ErrorText error={error} />
      {events === null ? <Spinner /> : (
        <>
          <EventCalendar events={events} colorFor={colorFor} onEventClick={(id) => router.push(`/events/${id}`)} />
          <SectionTitle>Coming up</SectionTitle>
          {upcoming.length
            ? upcoming.map((e) => <EventRow key={e.id} event={e} color={colorFor(e)} showGroup />)
            : <Empty title="No upcoming hangouts" subtitle="Plan one from any group." />}
        </>
      )}
    </>
  );
}
