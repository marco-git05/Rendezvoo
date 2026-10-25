import { addDays, toISO } from '../utils/dates';
import type { Group, Invite, Profile } from './types';

const day = (offset: number) => toISO(addDays(new Date(), offset));

export const ME = 'me';

export const INITIAL_PROFILE: Profile = {
  name: 'Alex',
  pronouns: '',
  dietary: [],
  dietaryNote: '',
};

export const INITIAL_INVITES: Invite[] = [
  {
    id: 'inv-1',
    groupId: 'g1',
    creator: 'Sam',
    days: [day(3), day(4), day(5), day(6)],
    deadline: day(2),
    askBudget: true,
    type: 'Night out',
    askCars: true,
  },
];

export const INITIAL_GROUPS: Group[] = [
  {
    id: 'g1',
    name: 'ACM Study Crew',
    category: 'school',
    color: '#E491A6',
    pinned: true,
    role: 'admin',
    showLocation: true,
    members: [
      { id: ME, name: 'You', color: '#E491A6' },
      { id: 'sam', name: 'Sam', color: '#92E4BA' },
      { id: 'priya', name: 'Priya', color: '#90C67F' },
      { id: 'jo', name: 'Jo', color: '#EBAEE6' },
    ],
    busy: [
      { id: 'b1', date: day(1), memberId: 'sam', label: 'Lab section' },
      { id: 'b2', date: day(2), memberId: ME, label: 'Midterm' },
      { id: 'b3', date: day(2), memberId: 'priya', label: 'Work shift' },
      { id: 'b4', date: day(5), memberId: 'jo', label: 'Club meeting' },
      { id: 'b5', date: day(8), memberId: ME, label: 'Project due' },
      { id: 'b6', date: day(9), memberId: 'sam', label: 'Family visit' },
      { id: 'b7', date: day(12), memberId: 'priya', label: 'Away' },
    ],
    feed: [
      { id: 'f1', text: 'Sam sent an invite', when: '2h ago', inviteId: 'inv-1' },
      { id: 'f2', text: 'You hung out', when: '1w ago' },
    ],
  },
  {
    id: 'g2',
    name: 'Weekend Crew',
    category: 'personal',
    color: '#92E4BA',
    pinned: false,
    role: 'member',
    showLocation: false,
    members: [
      { id: ME, name: 'You', color: '#92E4BA' },
      { id: 'dani', name: 'Dani', color: '#E491A6' },
      { id: 'luis', name: 'Luis', color: '#90C67F' },
    ],
    busy: [
      { id: 'b8', date: day(3), memberId: 'dani', label: 'Shift' },
      { id: 'b9', date: day(6), memberId: 'luis', label: 'Out of town' },
      { id: 'b10', date: day(7), memberId: ME, label: 'Dentist' },
    ],
    feed: [{ id: 'f3', text: 'You hung out', when: '3w ago' }],
  },
  {
    id: 'g3',
    name: 'Familia',
    category: 'family',
    color: '#90C67F',
    pinned: false,
    role: 'member',
    showLocation: true,
    members: [
      { id: ME, name: 'You', color: '#90C67F' },
      { id: 'mom', name: 'Mom', color: '#E491A6' },
      { id: 'abuela', name: 'Abuela', color: '#92E4BA' },
    ],
    busy: [{ id: 'b11', date: day(4), memberId: 'mom', label: 'Appointment' }],
    feed: [],
  },
];
