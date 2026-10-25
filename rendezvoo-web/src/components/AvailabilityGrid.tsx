'use client';

import { PointerEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { fromKey } from '@/lib/dates';
import { hourLabel, hoursOn } from '@/lib/invite';
import type { Availability } from '@/lib/types';

export type Person = { id: string; name: string; availability: Availability };
type Updater = (fn: (prev: Availability) => Availability) => void;

const cellKey = (date: string, hour: number) => `${date}|${hour}`;

/**
 * LettuceMeet-style availability.
 * - "Your availability": click (or tap) and drag across hours to paint them free; drag again to erase.
 * - "Everyone": heat map of how many people are free; hover/tap a cell to see who.
 * Side by side on wide screens, tabs on phones.
 */
export function AvailabilityGrid({ dates, startHour, endHour, mine, others, onChange, disabled }: {
  dates: string[];
  startHour: number;
  endHour: number;
  mine: Availability;
  others: Person[]; // everyone except you (their saved answers)
  onChange: Updater;
  disabled?: boolean;
}) {
  const [tab, setTab] = useState<'mine' | 'group'>('mine');
  const hours = useMemo(() => Array.from({ length: Math.max(endHour - startHour, 0) }, (_, i) => startHour + i), [startHour, endHour]);

  // Who is free in each cell (others + your live picks).
  const freeBy = useMemo(() => {
    const map: Record<string, string[]> = {};
    const all: Person[] = [...others, { id: 'me', name: 'You', availability: mine }];
    for (const p of all) for (const d of dates) for (const h of hoursOn(p.availability, d)) (map[cellKey(d, h)] ??= []).push(p.name);
    return map;
  }, [others, mine, dates]);
  const everyone = [...others.map((p) => p.name), 'You'];

  const tabBtn = (t: 'mine' | 'group', label: string) => (
    <button type="button" onClick={() => setTab(t)}
      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === t ? 'bg-card shadow-sm' : 'text-muted'}`}>
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex rounded-xl bg-line p-1 sm:hidden">
        {tabBtn('mine', '✏️ Your availability')}
        {tabBtn('group', '👥 Everyone')}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={tab === 'mine' ? '' : 'hidden sm:block'}>
          <h3 className="mb-1 hidden text-sm font-bold sm:block">✏️ Your availability</h3>
          <PaintGrid dates={dates} hours={hours} mine={mine} onChange={onChange} disabled={disabled} />
          <p className="mt-2 text-xs text-muted">
            {disabled ? 'Answers are closed.' : 'Click and drag to mark when you’re free. Drag over marked hours to erase.'}
          </p>
        </div>
        <div className={tab === 'group' ? '' : 'hidden sm:block'}>
          <h3 className="mb-1 hidden text-sm font-bold sm:block">👥 Everyone</h3>
          <HeatGrid dates={dates} hours={hours} freeBy={freeBy} everyone={everyone} />
        </div>
      </div>
    </div>
  );
}

// ---------- shared layout ----------

function GridFrame({ dates, hours, renderCell, onPointerDown, onPointerMove, paint }: {
  dates: string[];
  hours: number[];
  renderCell: (date: string, hour: number) => ReactNode;
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: PointerEvent<HTMLDivElement>) => void;
  paint?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card p-2">
      <div
        className="grid select-none"
        style={{
          gridTemplateColumns: `52px repeat(${dates.length}, minmax(44px, 1fr))`,
          touchAction: paint ? 'none' : undefined, // lets a finger drag paint instead of scrolling
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        <div />
        {dates.map((d) => {
          const day = fromKey(d);
          return (
            <div key={d} className="pb-1 text-center leading-tight">
              <div className="text-[11px] font-bold uppercase text-muted">{day.toLocaleDateString([], { weekday: 'short' })}</div>
              <div className="text-sm font-semibold">{day.toLocaleDateString([], { month: 'numeric', day: 'numeric' })}</div>
            </div>
          );
        })}
        {hours.map((h) => (
          <Row key={h} hour={h} dates={dates} renderCell={renderCell} />
        ))}
      </div>
    </div>
  );
}

function Row({ hour, dates, renderCell }: { hour: number; dates: string[]; renderCell: (date: string, hour: number) => ReactNode }) {
  return (
    <>
      <div className="-mt-2 pr-1.5 text-right text-[11px] text-muted">{hourLabel(hour)}</div>
      {dates.map((d) => <div key={d} className="border-l border-t border-line">{renderCell(d, hour)}</div>)}
    </>
  );
}

function keyFromPoint(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y)?.closest('[data-cell]') as HTMLElement | null;
  return el?.dataset.cell ?? null;
}

// ---------- your availability (paint) ----------

function PaintGrid({ dates, hours, mine, onChange, disabled }: {
  dates: string[]; hours: number[]; mine: Availability; onChange: Updater; disabled?: boolean;
}) {
  const drag = useRef<{ mode: 'add' | 'remove'; last: string } | null>(null);

  useEffect(() => {
    const stop = () => { drag.current = null; };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => { window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); };
  }, []);

  function apply(key: string, mode: 'add' | 'remove') {
    const [date, h] = key.split('|');
    const hour = Number(h);
    onChange((prev) => {
      const set = new Set(hoursOn(prev, date));
      if (mode === 'add') set.add(hour); else set.delete(hour);
      const next = { ...prev };
      if (set.size) next[date] = [...set].sort((a, b) => a - b); else delete next[date];
      return next;
    });
  }

  function down(e: PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    const key = keyFromPoint(e.clientX, e.clientY);
    if (!key) return;
    e.preventDefault();
    const [date, h] = key.split('|');
    const mode = hoursOn(mine, date).includes(Number(h)) ? 'remove' : 'add';
    drag.current = { mode, last: key };
    apply(key, mode);
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const key = keyFromPoint(e.clientX, e.clientY);
    if (!key || key === drag.current.last) return;
    drag.current.last = key;
    apply(key, drag.current.mode);
  }

  return (
    <GridFrame
      dates={dates}
      hours={hours}
      paint={!disabled}
      onPointerDown={down}
      onPointerMove={move}
      renderCell={(d, h) => {
        const on = hoursOn(mine, d).includes(h);
        return (
          <div
            data-cell={cellKey(d, h)}
            aria-label={`${d} ${hourLabel(h)} ${on ? 'free' : 'not free'}`}
            className={`h-7 transition-colors ${disabled ? 'opacity-60' : 'cursor-pointer'} ${on ? 'bg-brand' : 'hover:bg-brand-soft'}`}
          />
        );
      }}
    />
  );
}

// ---------- everyone (heat map) ----------

function HeatGrid({ dates, hours, freeBy, everyone }: {
  dates: string[]; hours: number[]; freeBy: Record<string, string[]>; everyone: string[];
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const total = Math.max(everyone.length, 1);

  // Best times: the cells with the most people free.
  const best = useMemo(() => {
    const max = Math.max(0, ...Object.values(freeBy).map((n) => n.length));
    return max;
  }, [freeBy]);

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const key = keyFromPoint(e.clientX, e.clientY);
    if (key) setFocus(key);
  };

  const focusDate = focus?.split('|')[0];
  const focusHour = focus ? Number(focus.split('|')[1]) : 0;
  const free = focus ? freeBy[focus] ?? [] : [];
  const notFree = everyone.filter((n) => !free.includes(n));

  return (
    <>
      <GridFrame
        dates={dates}
        hours={hours}
        onPointerDown={pick}
        onPointerMove={pick}
        renderCell={(d, h) => {
          const n = freeBy[cellKey(d, h)]?.length ?? 0;
          const heat = n / total;
          const isFocus = focus === cellKey(d, h);
          return (
            <div
              data-cell={cellKey(d, h)}
              className={`flex h-7 items-center justify-center text-[11px] font-bold ${isFocus ? 'outline outline-2 -outline-offset-2 outline-ink' : ''}`}
              style={{
                background: n ? `rgba(226, 96, 59, ${0.12 + 0.88 * heat})` : undefined,
                color: heat > 0.55 ? '#fff' : 'var(--color-ink)',
              }}
            >
              {n === best && n > 1 ? n : ''}
            </div>
          );
        }}
      />
      <div className="mt-2 min-h-[3.5rem] rounded-xl bg-bg p-2.5 text-sm">
        {focus ? (
          <>
            <p className="font-semibold">
              {fromKey(focusDate!).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })},{' '}
              {hourLabel(focusHour)}–{hourLabel(focusHour + 1)} · {free.length}/{everyone.length} free
            </p>
            {free.length > 0 && <p className="text-muted"> {free.join(', ')}</p>}
            {notFree.length > 0 && <p className="text-muted">— {notFree.join(', ')}</p>}
          </>
        ) : (
          <p className="text-muted">Darker = more people free. Numbers mark the best times. Hover or tap a time to see who’s free.</p>
        )}
      </div>
    </>
  );
}
