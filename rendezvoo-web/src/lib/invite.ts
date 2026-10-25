// Invite constants shared by the browser and the /api/plan route.
import type { Availability, Question } from './types';

// Default time range for a new invite (24h clock). End is exclusive: 22 means "until 10 PM".
export const DEFAULT_START_HOUR = 9;
export const DEFAULT_END_HOUR = 22;

/** 0 → "12 AM", 13 → "1 PM", 24 → "12 AM" (midnight). */
export function hourLabel(h: number): string {
  const hh = ((h % 24) + 24) % 24;
  if (hh === 0) return '12 AM';
  if (hh === 12) return '12 PM';
  return hh < 12 ? `${hh} AM` : `${hh - 12} PM`;
}

/** The hours a person marked free on a day (ignores anything that isn't an hour number). */
export function hoursOn(a: Availability | null | undefined, date: string): number[] {
  return (a?.[date] ?? []).filter((h): h is number => typeof h === 'number');
}

// Premade questions. The ids matter: the AI planner reads 'vibe', 'budget' and 'driver' specially.
export const VIBES = ['Casual', 'Night out', 'Night in', 'Day out', 'Day in', 'Meeting'] as const;

export const PREMADE: Question[] = [
  { id: 'vibe', type: 'mcq', prompt: 'What kind of hangout?', options: [...VIBES] },
  { id: 'budget', type: 'mcq', prompt: 'Budget per person?', options: ['Free', '$ (under $15)', '$$ ($15–40)', '$$$ ($40+)'] },
  { id: 'driver', type: 'yn', prompt: 'Can you drive others (carpool)?' },
  { id: 'travel', type: 'mcq', prompt: 'How far will you travel?', options: ['10 min', '15 min', '30 min', '45+ min'] },
  { id: 'ideas', type: 'frq', prompt: 'Any ideas or requests?' },
];

// What to search Google Maps for, per vibe.
export const VIBE_QUERY: Record<string, string> = {
  'Casual': 'casual restaurants',
  'Night out': 'bars with live music',
  'Night in': 'takeout restaurants',
  'Day out': 'fun things to do',
  'Day in': 'board game cafe',
  'Meeting': 'quiet cafe with seating',
};
export const AT_HOME_VIBES = new Set(['Night in', 'Day in']);
