import { dayParts } from '../utils/dates';

/** Wrapping grid of day tiles (weekday + number). */
export function DayPicker({
  days,
  selected,
  onToggle,
}: {
  days: string[];
  selected: string[];
  onToggle: (iso: string) => void;
}) {
  return (
    <div className="wrap">
      {days.map((iso) => {
        const { dow, day, month } = dayParts(iso);
        return (
          <button
            key={iso}
            className="day-tile"
            aria-pressed={selected.includes(iso)}
            aria-label={`${dow} ${month} ${day}`}
            onClick={() => onToggle(iso)}>
            <small>{dow}</small>
            <b>{day}</b>
          </button>
        );
      })}
    </div>
  );
}
