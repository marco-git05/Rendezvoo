import { useState } from 'react';

import { WEEKDAY_LETTERS, isoFor, monthGrid, monthTitle, todayISO } from '../utils/dates';

/**
 * Month grid with colored busy marks (one bar per person, max 3 shown).
 * `marks` maps an ISO date to the colors of whoever is busy that day.
 */
export function MonthCalendar({
  marks,
  selected,
  onSelect,
}: {
  marks: Record<string, string[]>;
  selected?: string;
  onSelect?: (iso: string) => void;
}) {
  const now = new Date();
  const [offset, setOffset] = useState(0);

  const shown = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = shown.getFullYear();
  const month = shown.getMonth();
  const weeks = monthGrid(year, month);
  const today = todayISO();

  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="cal-head">
        <button className="cal-nav" aria-label="Previous month" onClick={() => setOffset((o) => o - 1)}>
          ‹
        </button>
        <h2 className="heading">{monthTitle(year, month)}</h2>
        <button className="cal-nav" aria-label="Next month" onClick={() => setOffset((o) => o + 1)}>
          ›
        </button>
      </div>

      <div className="cal-grid">
        {WEEKDAY_LETTERS.map((l, i) => (
          <div key={i} className="cal-dow" aria-hidden="true">
            {l}
          </div>
        ))}
        {weeks.flat().map((d, i) => {
          if (d === null) return <div key={i} className="cal-cell empty" />;
          const iso = isoFor(year, month, d);
          const dots = (marks[iso] ?? []).slice(0, 3);
          const cls = ['cal-cell', iso === today ? 'today' : '', iso === selected ? 'selected' : '']
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={i}
              className={cls}
              aria-label={`${iso}${dots.length ? `, ${dots.length} busy` : ''}`}
              aria-pressed={iso === selected}
              onClick={() => onSelect?.(iso)}>
              <span className="cal-num">{d}</span>
              <span className="cal-marks">
                {dots.map((c, j) => (
                  <i key={j} style={{ background: c }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
