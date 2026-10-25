import { useEffect, useRef } from 'react';

import { dayParts } from '../utils/dates';

export const TIME_SLOTS = ['10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'];

export const slotKey = (iso: string, slot: string) => `${iso}|${slot}`;

/**
 * LettuceMeet-style grid: days across, time slots down.
 * Click or tap a cell to toggle it, drag with a mouse to paint a range,
 * and click a day header to toggle that whole day.
 */
export function AvailabilityGrid({
  days,
  value,
  onChange,
}: {
  days: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  // Latest value, so drag handlers never act on a stale copy.
  const valueRef = useRef(value);
  valueRef.current = value;
  const paint = useRef<'on' | 'off' | null>(null);

  useEffect(() => {
    const stop = () => {
      paint.current = null;
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, []);

  const apply = (key: string, mode: 'on' | 'off') => {
    const has = valueRef.current.includes(key);
    if (mode === 'on' && !has) onChange([...valueRef.current, key]);
    if (mode === 'off' && has) onChange(valueRef.current.filter((k) => k !== key));
  };

  const toggleDay = (iso: string) => {
    const keys = TIME_SLOTS.map((s) => slotKey(iso, s));
    const allOn = keys.every((k) => value.includes(k));
    onChange(allOn ? value.filter((k) => !keys.includes(k)) : Array.from(new Set([...value, ...keys])));
  };

  return (
    <div className="card avail" style={{ padding: 12 }}>
      <div
        className="avail-table"
        style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(46px, 1fr))` }}>
        <div />
        {days.map((iso) => {
          const { dow, day } = dayParts(iso);
          return (
            <button
              key={iso}
              className="avail-day"
              aria-label={`Toggle all of ${dow} ${day}`}
              onClick={() => toggleDay(iso)}>
              <small>{dow}</small>
              <b>{day}</b>
            </button>
          );
        })}

        {TIME_SLOTS.map((slot) => (
          <Row key={slot} slot={slot} days={days} value={value} apply={apply} paint={paint} />
        ))}
      </div>
    </div>
  );
}

function Row({
  slot,
  days,
  value,
  apply,
  paint,
}: {
  slot: string;
  days: string[];
  value: string[];
  apply: (key: string, mode: 'on' | 'off') => void;
  paint: React.MutableRefObject<'on' | 'off' | null>;
}) {
  return (
    <>
      <div className="avail-time">{slot}</div>
      {days.map((iso) => {
        const key = slotKey(iso, slot);
        const on = value.includes(key);
        return (
          <button
            key={key}
            className="avail-cell"
            aria-pressed={on}
            aria-label={`${iso} at ${slot}`}
            onPointerDown={(e) => {
              if (e.pointerType !== 'mouse') return; // touch uses a plain tap (onClick)
              e.preventDefault();
              paint.current = on ? 'off' : 'on';
              apply(key, paint.current);
            }}
            onPointerEnter={() => {
              if (paint.current) apply(key, paint.current);
            }}
            onClick={(e) => {
              // Mouse already handled in pointerdown; detail===0 is keyboard.
              if (e.detail === 0 || (e.nativeEvent as PointerEvent).pointerType !== 'mouse') {
                apply(key, on ? 'off' : 'on');
              }
            }}
          />
        );
      })}
    </>
  );
}
