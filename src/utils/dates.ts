const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Date -> "YYYY-MM-DD" in local time. */
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "YYYY-MM-DD" -> local Date at midnight. */
export const fromISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const todayISO = () => toISO(new Date());

/** Next `count` days starting today, as ISO strings. */
export const upcomingDays = (count: number) =>
  Array.from({ length: count }, (_, i) => toISO(addDays(new Date(), i)));

export const dayParts = (iso: string) => {
  const d = fromISO(iso);
  return { dow: DOW[d.getDay()], day: d.getDate(), month: MONTHS[d.getMonth()].slice(0, 3) };
};

/** "Sat, Oct 24" */
export const prettyDate = (iso: string) => {
  const { dow, day, month } = dayParts(iso);
  return `${dow}, ${month} ${day}`;
};

export const monthTitle = (year: number, month: number) => `${MONTHS[month]} ${year}`;

/** Weeks (Sun-first) of day numbers; null pads the first/last week. */
export const monthGrid = (year: number, month: number): (number | null)[][] => {
  const first = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

export const isoFor = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

export const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
