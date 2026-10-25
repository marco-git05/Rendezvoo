// Every database read/write the pages use. Pages stay simple; teammates reuse these.
import { supabase } from './supabase';
import type {
  Availability, EventResult, Group, GroupKind, HangoutEvent, Home, Invite, InviteResponse, Membership,
  Photo, PlaceResult, Profile, Question, Rsvp, RsvpStatus,
} from './types';

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function myId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

// ---------- Groups ----------

export async function getMyGroups(): Promise<Membership[]> {
  const uid = await myId();
  const rows = check<Membership[]>(await supabase.from('group_members').select('*, groups(*)').eq('user_id', uid));
  return rows.sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || (a.groups?.name ?? '').localeCompare(b.groups?.name ?? ''),
  );
}

export const createGroup = async (name: string, kind: GroupKind) =>
  check<string>(await supabase.rpc('create_group', { group_name: name, group_kind: kind }));

export const joinGroup = async (code: string) => check<string>(await supabase.rpc('join_group', { code }));

export const getGroup = async (id: string) =>
  check<Group>(await supabase.from('groups').select('*').eq('id', id).single());

export async function updateGroup(id: string, patch: Partial<Pick<Group, 'name' | 'avatar_url' | 'kind'>>) {
  check(await supabase.from('groups').update(patch).eq('id', id));
}

export const getMembers = async (groupId: string) =>
  check<Membership[]>(await supabase.from('group_members').select('*, profiles(*)').eq('group_id', groupId));

export async function updateMyMembership(
  groupId: string,
  patch: Partial<Pick<Membership, 'color' | 'pinned' | 'share_location'>>,
) {
  const uid = await myId();
  check(await supabase.from('group_members').update(patch).eq('group_id', groupId).eq('user_id', uid));
}

/** Admin only (enforced by the database). */
export async function setPriority(groupId: string, userId: string, isPriority: boolean) {
  check(await supabase.from('group_members').update({ is_priority: isPriority }).eq('group_id', groupId).eq('user_id', userId));
}

export async function leaveGroup(groupId: string) {
  const uid = await myId();
  check(await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', uid));
}

/** Homes of members who share their location with this group. */
export async function getGroupHomes(members: Membership[]): Promise<(Home & { name: string })[]> {
  const sharing = members.filter((m) => m.share_location).map((m) => m.user_id);
  if (!sharing.length) return [];
  const homes = check<Home[]>(await supabase.from('homes').select('*').in('user_id', sharing));
  return homes.map((h) => ({ ...h, name: members.find((m) => m.user_id === h.user_id)?.profiles?.name ?? 'Someone' }));
}

// ---------- Events / calendars ----------

export const getGroupEvents = async (groupId: string) =>
  check<HangoutEvent[]>(
    await supabase.from('events').select('*, groups(id, name)').eq('group_id', groupId).order('starts_at'),
  );

/** Every event across my groups (RLS limits it), minus ones I declined. */
export async function getMyEvents(): Promise<HangoutEvent[]> {
  const uid = await myId();
  const [events, declined] = await Promise.all([
    supabase.from('events').select('*, groups(id, name)').order('starts_at'),
    supabase.from('event_rsvps').select('event_id').eq('user_id', uid).eq('status', 'declined'),
  ]);
  const out = new Set(check<{ event_id: string }[]>(declined).map((r) => r.event_id));
  return check<HangoutEvent[]>(events).filter((e) => !out.has(e.id));
}

export async function getEvent(id: string): Promise<{ event: HangoutEvent; rsvps: Rsvp[] }> {
  const [event, rsvps] = await Promise.all([
    supabase.from('events').select('*, groups(id, name, admin_id)').eq('id', id).single(),
    supabase.from('event_rsvps').select('*, profiles(*)').eq('event_id', id),
  ]);
  return { event: check<HangoutEvent>(event), rsvps: check<Rsvp[]>(rsvps) };
}

export async function setRsvp(eventId: string, status: RsvpStatus) {
  const uid = await myId();
  check(await supabase.from('event_rsvps').upsert({ event_id: eventId, user_id: uid, status }));
}

/** Delete a hangout (its creator or the group admin only — enforced by the database). */
export async function deleteEvent(event: Pick<HangoutEvent, 'id' | 'invite_id'>) {
  const deleted = check<{ id: string }[]>(await supabase.from('events').delete().eq('id', event.id).select('id'));
  if (!deleted.length) throw new Error('Only the person who made this hangout or the group admin can delete it.');
  // The invite it came from is done too, so it stops showing as "waiting on answers".
  if (event.invite_id) await supabase.from('invites').update({ status: 'closed' }).eq('id', event.invite_id);
}

/** Manually add a hangout that was planned in person. */
export async function createEvent(input: {
  groupId: string; title: string; startsAt: Date; endsAt: Date | null; location: string;
}): Promise<string> {
  const uid = await myId();
  const row = check<{ id: string }>(
    await supabase.from('events').insert({
      group_id: input.groupId,
      title: input.title,
      starts_at: input.startsAt.toISOString(),
      ends_at: input.endsAt?.toISOString() ?? null,
      location: input.location || null,
      created_by: uid,
    }).select('id').single(),
  );
  await setRsvp(row.id, 'going');
  return row.id;
}

// ---------- Invites ----------

export async function getOpenInvites(groupId: string) {
  return check<Invite[]>(
    await supabase.from('invites').select('*').eq('group_id', groupId).eq('status', 'open')
      .order('created_at', { ascending: false }),
  );
}

export async function createInvite(input: {
  groupId: string; title: string; dates: string[]; questions: Question[];
  deadline: Date | null; locationHint: string; album: boolean; startHour: number; endHour: number;
}): Promise<string> {
  const uid = await myId();
  const row = check<{ id: string }>(
    await supabase.from('invites').insert({
      group_id: input.groupId,
      creator_id: uid,
      title: input.title || null,
      dates: [...input.dates].sort(),
      questions: input.questions,
      deadline: input.deadline?.toISOString() ?? null,
      tz_offset: new Date().getTimezoneOffset(),
      location_hint: input.locationHint || null,
      album: input.album,
      start_hour: input.startHour,
      end_hour: input.endHour,
    }).select('id').single(),
  );
  return row.id;
}

/** Clear the deadline so people can answer again. */
export async function reopenInvite(id: string) {
  check(await supabase.from('invites').update({ deadline: null, status: 'open' }).eq('id', id));
}

export const getInvite = async (id: string) =>
  check<Invite>(await supabase.from('invites').select('*, profiles(name)').eq('id', id).single());

export const getResponses = async (inviteId: string) =>
  check<InviteResponse[]>(await supabase.from('responses').select('*, profiles(name, avatar_url)').eq('invite_id', inviteId));

export async function saveResponse(inviteId: string, availability: Availability, answers: Record<string, unknown>) {
  const uid = await myId();
  check(await supabase.from('responses').upsert(
    { invite_id: inviteId, user_id: uid, availability, answers },
    { onConflict: 'invite_id,user_id' },
  ));
}

export async function getInviteEvent(inviteId: string): Promise<HangoutEvent | null> {
  const rows = check<HangoutEvent[]>(
    await supabase.from('events').select('*').eq('invite_id', inviteId).order('created_at', { ascending: false }).limit(1),
  );
  return rows[0] ?? null;
}

/** Runs the AI planner (src/app/api/plan/route.ts). Returns the new event's id. */
export async function generatePlan(inviteId: string, opts: { rethink?: boolean; feedback?: string } = {}): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch('/api/plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: JSON.stringify({ inviteId, ...opts }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'We couldn’t make a plan right now. Please try again in a moment.');
  return body.eventId as string;
}

// ---------- Profile ----------

export async function getMyProfile(): Promise<Profile> {
  const uid = await myId();
  return check<Profile>(await supabase.from('profiles').select('*').eq('id', uid).single());
}

export async function updateMyProfile(patch: Partial<Pick<Profile, 'name' | 'avatar_url'>>) {
  const uid = await myId();
  check(await supabase.from('profiles').update(patch).eq('id', uid));
}

export async function getMyHome(): Promise<Home | null> {
  const uid = await myId();
  return check<Home | null>(await supabase.from('homes').select('*').eq('user_id', uid).maybeSingle());
}

export async function setMyHome(lat: number, lng: number) {
  const uid = await myId();
  check(await supabase.from('homes').upsert({ user_id: uid, lat, lng }));
}

export async function clearMyHome() {
  const uid = await myId();
  check(await supabase.from('homes').delete().eq('user_id', uid));
}

// ---------- Images & photo albums ----------

/** Upload a file and return its public URL. */
export async function uploadImage(bucket: 'avatars' | 'photos', path: string, file: File): Promise<string> {
  check(await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: true }));
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`; // cache-bust so a replaced photo shows right away
}

export const getPhotos = async (eventId: string) =>
  check<Photo[]>(await supabase.from('photos').select('*').eq('event_id', eventId).order('created_at', { ascending: false }));

export async function addPhotos(eventId: string, files: File[]) {
  const uid = await myId();
  for (const file of files) {
    const ext = file.name.split('.').pop() || 'jpg';
    const url = await uploadImage('photos', `${eventId}/${crypto.randomUUID()}.${ext}`, file);
    check(await supabase.from('photos').insert({ event_id: eventId, user_id: uid, url }));
  }
}

// ---------- SerpAPI search (runs on our server so the key stays secret) ----------

async function serpCall<T>(body: Record<string, unknown>): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch('/api/serp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'Search isn’t available right now. Please try again later.');
  return json as T;
}

/** Google Maps search near a point (or anywhere, if no point). */
export async function findPlaces(q: string, near?: { lat: number; lng: number } | null): Promise<PlaceResult[]> {
  return (await serpCall<{ places: PlaceResult[] }>({ action: 'places', q, lat: near?.lat, lng: near?.lng })).places;
}

/** Google Events search, e.g. "concerts in <city> this weekend". */
export async function findEvents(q: string): Promise<EventResult[]> {
  return (await serpCall<{ events: EventResult[] }>({ action: 'events', q })).events;
}
