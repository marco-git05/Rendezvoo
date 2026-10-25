import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { INITIAL_GROUPS, INITIAL_INVITES, INITIAL_PROFILE, ME } from './mock';
import type { Group, Invite, InviteResponse, NewInviteInput, Profile } from './types';

/**
 * App state, seeded with mock data and saved to localStorage so a demo
 * survives a refresh. Every function here is a seam where the real backend
 * (Supabase, Gemini, SerpAPI) plugs in later, so pages never need to change.
 */
interface AppDataValue {
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => void;

  groups: Group[];
  getGroup: (id: string | undefined) => Group | undefined;
  togglePin: (id: string) => void;
  setShowLocation: (id: string, value: boolean) => void;
  setGroupColor: (id: string, color: string) => void;
  addMember: (id: string, name: string) => void;
  removeMember: (id: string, memberId: string) => void;

  invites: Invite[];
  getInvite: (id: string | undefined) => Invite | undefined;
  createInvite: (input: NewInviteInput) => string;

  getResponse: (inviteId: string) => InviteResponse | undefined;
  submitResponse: (response: InviteResponse) => void;

  resetDemo: () => void;
}

interface Saved {
  profile: Profile;
  groups: Group[];
  invites: Invite[];
  responses: InviteResponse[];
}

const KEY = 'rendezvoo.data.v1';
const MEMBER_COLORS = ['#E491A6', '#92E4BA', '#90C67F', '#EBAEE6', '#FF857A', '#ADEBB3'];

const seed = (): Saved => ({
  profile: INITIAL_PROFILE,
  groups: INITIAL_GROUPS,
  invites: INITIAL_INVITES,
  responses: [],
});

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Saved;
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  return seed();
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Saved>(load);
  const { profile, groups, invites, responses } = state;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const patchGroup = (id: string, fn: (g: Group) => Group) =>
    setState((s) => ({ ...s, groups: s.groups.map((g) => (g.id === id ? fn(g) : g)) }));

  const value: AppDataValue = {
    profile,
    updateProfile: (patch) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } })),

    groups,
    getGroup: (id) => groups.find((g) => g.id === id),
    togglePin: (id) => patchGroup(id, (g) => ({ ...g, pinned: !g.pinned })),
    setShowLocation: (id, v) => patchGroup(id, (g) => ({ ...g, showLocation: v })),
    setGroupColor: (id, color) =>
      patchGroup(id, (g) => ({
        ...g,
        color,
        members: g.members.map((m) => (m.id === ME ? { ...m, color } : m)),
      })),
    addMember: (id, name) =>
      patchGroup(id, (g) => ({
        ...g,
        members: [
          ...g.members,
          {
            id: `m-${Date.now()}`,
            name,
            color: MEMBER_COLORS[g.members.length % MEMBER_COLORS.length],
          },
        ],
      })),
    removeMember: (id, memberId) =>
      patchGroup(id, (g) => ({
        ...g,
        members: g.members.filter((m) => m.id !== memberId),
        busy: g.busy.filter((b) => b.memberId !== memberId),
      })),

    invites,
    getInvite: (id) => invites.find((i) => i.id === id),
    createInvite: (input) => {
      const id = `inv-${Date.now()}`;
      setState((s) => ({
        ...s,
        invites: [...s.invites, { ...input, id, creator: 'You' }],
        groups: s.groups.map((g) =>
          g.id === input.groupId
            ? {
                ...g,
                feed: [
                  { id: `f-${id}`, text: 'You sent an invite', when: 'just now', inviteId: id },
                  ...g.feed,
                ],
              }
            : g,
        ),
      }));
      return id;
    },

    getResponse: (inviteId) => responses.find((r) => r.inviteId === inviteId),
    submitResponse: (response) =>
      setState((s) => ({
        ...s,
        responses: [...s.responses.filter((r) => r.inviteId !== response.inviteId), response],
      })),

    resetDemo: () => setState(seed()),
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}
