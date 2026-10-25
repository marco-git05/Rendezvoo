'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUserId } from '@/components/AuthProvider';
import { EventCalendar } from '@/components/Calendars';
import { EventRow } from '@/components/EventRow';
import { Explorer } from '@/components/Explorer';
import { Avatar, ButtonLink, Card, Empty, ErrorText, SectionTitle, Spinner } from '@/components/ui';
import { getGroup, getGroupEvents, getGroupHomes, getMembers, getOpenInvites } from '@/lib/api';
import { fmtDay } from '@/lib/dates';
import type { Group, HangoutEvent, Home, Invite, Membership } from '@/lib/types';

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const uid = useUserId();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [events, setEvents] = useState<HangoutEvent[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [homes, setHomes] = useState<(Home & { name: string })[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [g, m, e, i] = await Promise.all([getGroup(id), getMembers(id), getGroupEvents(id), getOpenInvites(id)]);
        setGroup(g); setMembers(m); setEvents(e); setInvites(i);
        setHomes(await getGroupHomes(m));
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [id]);

  if (error) return <ErrorText error={error} />;
  if (!group) return <Spinner />;

  const myColor = members.find((m) => m.user_id === uid)?.color ?? '#E2603B';
  const center = homes.length
    ? { lat: homes.reduce((s, h) => s + h.lat, 0) / homes.length, lng: homes.reduce((s, h) => s + h.lng, 0) / homes.length }
    : null;
  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.starts_at).getTime() >= now);
  const past = events.filter((e) => new Date(e.starts_at).getTime() < now).reverse();

  async function copyCode() {
    const text = `Join "${group!.name}" on Rendezvoo with code ${group!.invite_code}: ${window.location.origin}/groups/new`;
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Link href="/" className="w-fit text-sm font-semibold text-brand">← Groups</Link>

      <div className="flex items-center gap-4">
        <Avatar src={group.avatar_url} name={group.name} size={64} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <button onClick={copyCode} className="text-sm text-muted hover:text-brand">
            Code <span className="font-mono font-bold text-ink">{group.invite_code}</span> · {copied ? 'Copied!' : 'Copy invite'}
          </button>
        </div>
        <ButtonLink href={`/groups/${id}/settings`} variant="secondary">⚙️ Settings</ButtonLink>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {members.map((m) => (
          <div key={m.user_id} className="flex w-16 shrink-0 flex-col items-center gap-1">
            <Avatar src={m.profiles?.avatar_url} name={m.profiles?.name} size={44} />
            <span className="w-full truncate text-center text-xs text-muted">
              {m.user_id === uid ? 'You' : m.profiles?.name?.split(' ')[0]}
              {m.is_priority ? ' ★' : ''}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ButtonLink href={`/groups/${id}/plan`}>✨ Plan a hangout</ButtonLink>
        <ButtonLink href={`/groups/${id}/add`} variant="secondary">+ Add one we already planned</ButtonLink>
      </div>

      {invites.length > 0 && (
        <>
          <SectionTitle>Waiting on answers</SectionTitle>
          {invites.map((inv) => (
            <Link key={inv.id} href={`/invites/${inv.id}`}>
              <Card className="flex items-center gap-3 border-brand transition hover:bg-brand-soft">
                <span className="text-2xl">📨</span>
                <span className="flex-1">
                  <span className="block font-semibold">{inv.title ?? 'Hangout invite'}</span>
                  {inv.deadline && <span className="text-sm text-muted">Answer by {fmtDay(inv.deadline)}</span>}
                </span>
                <span className="text-brand">→</span>
              </Card>
            </Link>
          ))}
        </>
      )}

      <SectionTitle>Group calendar</SectionTitle>
      <EventCalendar events={events} colorFor={() => myColor} onEventClick={(eid) => router.push(`/events/${eid}`)} />

      <SectionTitle>Upcoming</SectionTitle>
      {upcoming.length
        ? upcoming.map((e) => <EventRow key={e.id} event={e} color={myColor} />)
        : <Empty title="No upcoming hangouts" subtitle="Tap “Plan a hangout” to get one going." />}

      {past.length > 0 && (
        <>
          <SectionTitle>Past</SectionTitle>
          {past.map((e) => <EventRow key={e.id} event={e} color="#B9AFA5" />)}
        </>
      )}

      <SectionTitle>Explore nearby</SectionTitle>
      <p className="-mt-2 text-sm text-muted">
        Search real places and events{center ? ' near where your group lives' : ''}. Gray pins are the house locations members chose to share with this group.
      </p>
      <Explorer
        groupId={id}
        center={center}
        homes={homes.map((h) => ({ id: `home-${h.user_id}`, lat: h.lat, lng: h.lng, label: h.user_id === uid ? 'You' : h.name.split(' ')[0] }))}
      />
    </>
  );
}
