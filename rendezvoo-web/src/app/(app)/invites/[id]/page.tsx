'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserId } from '@/components/AuthProvider';
import { AvailabilityGrid, type Person } from '@/components/AvailabilityGrid';
import { QuestionField } from '@/components/QuestionField';
import { Avatar, Button, Card, ErrorText, PageHeader, SectionTitle, Spinner } from '@/components/ui';
import { generatePlan, getInvite, getInviteEvent, getMembers, getResponses, reopenInvite, saveResponse } from '@/lib/api';
import { fmtDay, fmtTime } from '@/lib/dates';
import { DEFAULT_END_HOUR, DEFAULT_START_HOUR, hourLabel } from '@/lib/invite';
import type { Availability, HangoutEvent, Invite, InviteResponse, Membership } from '@/lib/types';

// Respond to an invite (availability + questions), see who's answered, and run the AI planner.
export default function InvitePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const uid = useUserId();

  const [invite, setInvite] = useState<Invite | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [responses, setResponses] = useState<InviteResponse[]>([]);
  const [plan, setPlan] = useState<HangoutEvent | null>(null);

  const [availability, setAvailability] = useState<Availability>({});
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState('');
  const [planError, setPlanError] = useState('');

  const load = useCallback(async () => {
    try {
      const inv = await getInvite(id);
      const [m, r, ev] = await Promise.all([getMembers(inv.group_id), getResponses(id), getInviteEvent(id)]);
      setInvite(inv); setMembers(m); setResponses(r); setPlan(ev);
      const mine = r.find((x) => x.user_id === uid);
      if (mine) { setAvailability(mine.availability ?? {}); setAnswers(mine.answers ?? {}); }
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id, uid]);
  useEffect(() => { load(); }, [load]);

  // Everyone else's saved availability, for the group heat map.
  const others = useMemo<Person[]>(
    () => responses
      .filter((r) => r.user_id !== uid)
      .map((r) => ({ id: r.user_id, name: r.profiles?.name?.split(' ')[0] ?? 'Someone', availability: r.availability ?? {} })),
    [responses, uid],
  );

  if (!invite) return error ? <ErrorText error={error} /> : <Spinner />;

  const pastDeadline = !!invite.deadline && new Date(invite.deadline).getTime() < Date.now();
  const locked = pastDeadline || invite.status === 'closed';
  const answered = new Set(responses.map((r) => r.user_id));
  const waitingOn = members.filter((m) => !answered.has(m.user_id));
  const iAnswered = answered.has(uid);

  const startHour = invite.start_hour ?? DEFAULT_START_HOUR;
  const endHour = invite.end_hour ?? DEFAULT_END_HOUR;

  function changeAvailability(fn: (prev: Availability) => Availability) {
    setAvailability(fn);
    setDirty(true);
  }

  async function submit() {
    setSaving(true);
    setError('');
    try {
      const clean = Object.fromEntries(Object.entries(answers).filter(([, v]) => v !== undefined && v !== ''));
      await saveResponse(id, availability, clean);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function runPlanner() {
    setPlanning(true);
    setPlanError('');
    try {
      if (dirty) await submit();
      const eventId = await generatePlan(id);
      router.push(`/events/${eventId}`);
    } catch (e) {
      setPlanError((e as Error).message);
      setPlanning(false);
    }
  }

  return (
    <>
      <PageHeader
        title={invite.title ?? 'Hangout invite'}
        back={`/groups/${invite.group_id}`}
        subtitle={`From ${invite.profiles?.name ?? 'someone'}${invite.deadline ? ` · ${pastDeadline ? 'Closed' : 'Answer by'} ${fmtDay(invite.deadline)}` : ''}`}
      />

      {plan && (
        <Link href={`/events/${plan.id}`}>
          <Card className="flex flex-col gap-1 border-brand bg-brand-soft">
            <span className="text-xs font-bold uppercase tracking-wider text-brand">✨ The plan</span>
            <span className="text-lg font-bold">{plan.title}</span>
            <span>{fmtDay(plan.starts_at)} · {fmtTime(plan.starts_at)}{plan.location ? ` · ${plan.location}` : ''}</span>
            <span className="font-semibold text-brand">See details & RSVP →</span>
          </Card>
        </Link>
      )}

      {locked && (
        <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm">
          🔒 This invite is closed, so the grid and questions are locked. Reopen it at the bottom of the page.
        </p>
      )}
      <SectionTitle>When are you free?</SectionTitle>
      <p className="text-sm text-muted">
        Times shown: {hourLabel(startHour)} to {hourLabel(endHour)}. Your answers save when you press the button below.
      </p>
      <AvailabilityGrid dates={invite.dates} startHour={startHour} endHour={endHour}
        mine={availability} others={others} onChange={changeAvailability} disabled={locked} />

      {invite.questions.length > 0 && <SectionTitle>A few questions</SectionTitle>}
      {invite.questions.map((q) => (
        <QuestionField key={q.id} question={q} value={answers[q.id]} disabled={locked}
          onChange={(v) => { setAnswers((a) => ({ ...a, [q.id]: v })); setDirty(true); }} />
      ))}

      <ErrorText error={error} />
      {locked ? (
        <Card className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm">
            Answers are closed{pastDeadline && invite.deadline
              ? ` — the deadline was ${fmtDay(invite.deadline)} at ${fmtTime(invite.deadline)}`
              : ''}.
          </p>
          <Button variant="secondary" onClick={async () => {
            try { await reopenInvite(id); await load(); } catch (e) { setError((e as Error).message); }
          }}>
            Reopen answers (remove deadline)
          </Button>
        </Card>
      ) : (
        <Button onClick={submit} loading={saving} disabled={iAnswered && !dirty}>
          {iAnswered ? (dirty ? 'Update my answers' : 'Answers saved ✓') : 'Send my answers'}
        </Button>
      )}

      <SectionTitle>{responses.length} of {members.length} answered</SectionTitle>
      <div className="flex flex-wrap gap-3">
        {responses.map((r) => (
          <div key={r.user_id} className="flex w-14 flex-col items-center gap-1">
            <Avatar src={r.profiles?.avatar_url} name={r.profiles?.name} size={40} />
            <span className="w-full truncate text-center text-xs text-muted">{r.user_id === uid ? 'You' : r.profiles?.name?.split(' ')[0]}</span>
          </div>
        ))}
      </div>
      {waitingOn.length > 0 && (
        <p className="text-sm text-muted">
          Waiting on {waitingOn.map((m) => (m.user_id === uid ? 'you' : m.profiles?.name?.split(' ')[0])).join(', ')}
        </p>
      )}

      <Button variant={plan ? 'secondary' : 'primary'} onClick={runPlanner} loading={planning}
        disabled={!responses.length && !dirty}>
        {plan ? '↻ Re-plan with the latest answers' : '✨ Plan it with AI'}
      </Button>
      <ErrorText error={planError} />
      {planning && (
        <p className="text-center text-sm text-muted">
          Finding the best time, searching places &amp; events, and checking everyone’s drive time… (about 15–30 seconds)
        </p>
      )}
    </>
  );
}
