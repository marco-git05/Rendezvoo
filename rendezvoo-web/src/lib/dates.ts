const pad = (n: number) => String(n).padStart(2, '0');

/** Local 'YYYY-MM-DD'. */
export function dateKey(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export const todayKey = () => dateKey(new Date());

/** Parse 'YYYY-MM-DD' as a local date (not UTC). */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const fmtDay = (iso: string | Date) =>
  new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

export const fmtKey = (key: string) => fmtDay(fromKey(key));

/** 'YYYY-MM-DD' + 'HH:MM' (from <input type="time">) → local Date. */
export function combine(day: string, time: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!day || !m) return null;
  const [y, mo, d] = day.split('-').map(Number);
  return new Date(y, mo - 1, d, Number(m[1]), Number(m[2]));
}
