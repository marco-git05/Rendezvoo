'use client';

import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { todayKey } from '@/lib/dates';
import type { HangoutEvent } from '@/lib/types';

/** Month/week calendar of hangouts. `colorFor` picks each event's color (the viewer's group color). */
export function EventCalendar({ events, colorFor, onEventClick }: {
  events: HangoutEvent[];
  colorFor: (e: HangoutEvent) => string;
  onEventClick: (id: string) => void;
}) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
      height="auto"
      dayMaxEvents={3}
      events={events.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.starts_at,
        end: e.ends_at ?? undefined,
        backgroundColor: colorFor(e),
        borderColor: colorFor(e),
      }))}
      eventClick={(info) => {
        info.jsEvent.preventDefault();
        onEventClick(info.event.id);
      }}
    />
  );
}

/** Tap days to select them (for the invite maker). Past days are disabled. */
export function DayPicker({ value, onToggle }: { value: string[]; onToggle: (day: string) => void }) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{ left: 'prev', center: 'title', right: 'next' }}
      height="auto"
      fixedWeekCount={false}
      validRange={{ start: todayKey() }}
      events={value.map((d) => ({ start: d, allDay: true, display: 'background', backgroundColor: '#E2603B' }))}
      dateClick={(info) => onToggle(info.dateStr)}
    />
  );
}
