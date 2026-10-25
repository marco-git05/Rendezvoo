export type Category = 'school' | 'personal' | 'family' | 'work';
export type Role = 'admin' | 'member';

export const HANGOUT_TYPES = [
  'Casual',
  'Meeting',
  'Night out',
  'Night in',
  'Day out',
  'Day in',
  'At home',
] as const;
export type HangoutType = (typeof HANGOUT_TYPES)[number];

/** Types where someone has to host, so the invite asks "willing to host?" */
export const HOSTED_TYPES: HangoutType[] = ['At home', 'Night in', 'Day in'];

export const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Dairy-free',
  'Halal',
  'Kosher',
  'Nut-free',
] as const;

export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface BusyBlock {
  id: string;
  date: string; // YYYY-MM-DD
  memberId: string;
  label: string;
}

export interface FeedItem {
  id: string;
  text: string;
  when: string;
  inviteId?: string;
}

export interface Group {
  id: string;
  name: string;
  category: Category;
  color: string;
  pinned: boolean;
  role: Role;
  showLocation: boolean;
  members: Member[];
  busy: BusyBlock[];
  feed: FeedItem[];
}

export interface Invite {
  id: string;
  groupId: string;
  creator: string;
  /** Candidate days the creator is offering. */
  days: string[];
  deadline?: string;
  askBudget: boolean;
  type?: HangoutType;
  askCars: boolean;
}

export interface InviteResponse {
  inviteId: string;
  /** Keys look like "2026-10-30|6 PM". */
  availability: string[];
  canDrive?: boolean;
  budget?: string;
  willingToHost?: boolean;
}

export interface Profile {
  name: string;
  pronouns: string;
  dietary: string[];
  dietaryNote: string;
}

export interface NewInviteInput {
  groupId: string;
  days: string[];
  deadline?: string;
  askBudget: boolean;
  type?: HangoutType;
  askCars: boolean;
}
