'use client';

import Link from 'next/link';
import { fmtDay, fmtTime } from '@/lib/dates';
import type { HangoutEvent } from '@/lib/types';

export function EventRow({ event, color, showGroup }: { event: HangoutEvent; color: string; showGroup?: boolean }) {
  return (
    <Link href={`/events/${event.id}`} className="flex gap-3 rounded-2xl border border-line bg-card p-3.5 transition hover:border-brand">
      <span className="w-1.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="flex flex-col">
        <span className="font-semibold">{event.title}</span>
        <span className="text-sm text-muted">
          {fmtDay(event.starts_at)} · {fmtTime(event.starts_at)}
          {event.location ? ` · ${event.location}` : ''}
        </span>
        {showGroup && event.groups && <span className="text-sm font-semibold" style={{ color }}>{event.groups.name}</span>}
      </span>
    </Link>
  );
}
