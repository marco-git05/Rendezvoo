'use client';

import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { DayPicker } from '@/components/Calendars';
import { Avatar, Button, Card, Chip, ErrorText, Field, PageHeader, SectionTitle, Switch } from '@/components/ui';
import { createInvite, getGroup } from '@/lib/api';
import { fmtKey } from '@/lib/dates';
import { DEFAULT_END_HOUR, DEFAULT_START_HOUR, hourLabel, PREMADE } from '@/lib/invite';
import type { Group, Question, QuestionType } from '@/lib/types';

const TYPE_LABELS: Record<QuestionType, string> = { frq: 'Free response', yn: 'Yes / No', mcq: 'Multiple choice' };

// The invite maker: pick days, choose questions, set a deadline, send.
export default function PlanHangoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);

  const [title, setTitle] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  const [startHour, setStartHour] = useState(DEFAULT_START_HOUR);
  const [endHour, setEndHour] = useState(DEFAULT_END_HOUR);
  const [premadeOn, setPremadeOn] = useState<Record<string, boolean>>({ vibe: true, budget: true, driver: false, travel: true, ideas: true });
  const [custom, setCustom] = useState<Question[]>([]);
  const [deadline, setDeadline] = useState('');
  const [area, setArea] = useState('');
  const [album, setAlbum] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // custom question draft
  const [qPrompt, setQPrompt] = useState('');
  const [qType, setQType] = useState<QuestionType>('frq');
  const [qOptions, setQOptions] = useState('');

  useEffect(() => { getGroup(id).then(setGroup).catch((e) => setError(e.message)); }, [id]);

  const toggleDate = (d: string) => setDates((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d].sort()));

  function addCustom() {
    const options = qOptions.split(',').map((o) => o.trim()).filter(Boolean);
    if (!qPrompt.trim()) return;
    if (qType === 'mcq' && options.length < 2) return setError('Multiple choice needs at least 2 options, separated by commas.');
    setError('');
    setCustom((c) => [...c, { id: `c${Date.now()}`, type: qType, prompt: qPrompt.trim(), ...(qType === 'mcq' ? { options } : {}) }]);
    setQPrompt('');
    setQOptions('');
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!dates.length) return setError('Pick at least one day on the calendar.');
    if (endHour <= startHour) return setError('The end time has to be after the start time.');
    if (deadline && new Date(deadline).getTime() <= Date.now()) return setError('The answer deadline has to be in the future.');
    setSaving(true);
    setError('');
    try {
      const inviteId = await createInvite({
        groupId: id,
        title: title.trim(),
        dates,
        questions: [...PREMADE.filter((q) => premadeOn[q.id]), ...custom],
        deadline: deadline ? new Date(deadline) : null,
        locationHint: area.trim(),
        album: group?.kind === 'friends' ? true : album,
        startHour,
        endHour,
      });
      router.push(`/invites/${inviteId}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-4">
      <PageHeader
        title="Plan a hangout"
        back={`/groups/${id}`}
        subtitle={group && (
          <span className="inline-flex items-center gap-2">
            <Avatar src={group.avatar_url} name={group.name} size={22} /> Planning for <b className="text-ink">{group.name}</b>
          </span>
        )}
      />

      <Field label="Name it (optional)" placeholder="Weekend hang" value={title} onChange={(e) => setTitle(e.target.value)} />

      <SectionTitle>Which days could work?</SectionTitle>
      <DayPicker value={dates} onToggle={toggleDate} />
      <p className="text-sm text-muted">
        {dates.length
          ? dates.map(fmtKey).join(' · ')
          : 'Tap days to select them. Everyone then marks the hours they’re free on each day.'}
      </p>

      <SectionTitle>Between what times?</SectionTitle>
      <div className="flex flex-wrap items-end gap-3">
        <HourSelect label="From" value={startHour} hours={range(0, 23)} onChange={setStartHour} />
        <span className="pb-3 text-muted">to</span>
        <HourSelect label="Until" value={endHour} hours={range(1, 24)} onChange={setEndHour} />
      </div>
      <p className="text-sm text-muted">
        {endHour > startHour
          ? `People will pick from ${endHour - startHour} one-hour slots, ${hourLabel(startHour)} to ${hourLabel(endHour)}${endHour === 24 ? ' (midnight)' : ''}.`
          : 'The end time has to be after the start time.'}
      </p>

      <SectionTitle>Questions (all optional for people to answer)</SectionTitle>
      <Card className="flex flex-col gap-4">
        {PREMADE.map((q) => (
          <Switch key={q.id} label={q.prompt} checked={!!premadeOn[q.id]}
            onChange={(v) => setPremadeOn((p) => ({ ...p, [q.id]: v }))} />
        ))}
      </Card>

      {custom.map((q) => (
        <Card key={q.id} className="flex items-center gap-3">
          <span className="flex-1">
            <span className="block">{q.prompt}</span>
            <span className="text-sm text-muted">{TYPE_LABELS[q.type]}{q.options ? `: ${q.options.join(', ')}` : ''}</span>
          </span>
          <button type="button" onClick={() => setCustom((c) => c.filter((x) => x.id !== q.id))}
            className="text-muted hover:text-danger" aria-label="Remove question">✕</button>
        </Card>
      ))}

      <Card className="flex flex-col gap-3">
        <p className="font-semibold">Add your own question</p>
        <Field label="Question" placeholder="Anyone need a vegetarian spot?" value={qPrompt} onChange={(e) => setQPrompt(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
            <Chip key={t} label={TYPE_LABELS[t]} selected={qType === t} onClick={() => setQType(t)} />
          ))}
        </div>
        {qType === 'mcq' && (
          <Field label="Options (separate with commas)" placeholder="Pizza, Tacos, Sushi" value={qOptions} onChange={(e) => setQOptions(e.target.value)} />
        )}
        <Button type="button" variant="secondary" onClick={addCustom} disabled={!qPrompt.trim()}>+ Add question</Button>
      </Card>

      <SectionTitle>Details</SectionTitle>
      <Field label="Answer deadline (optional)" type="datetime-local" min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} value={deadline} onChange={(e) => setDeadline(e.target.value)}
        hint="After this, answers close and the AI plans with whoever responded." />
      <Field label="Area (optional)" placeholder="e.g. Downtown" value={area} onChange={(e) => setArea(e.target.value)}
        hint="Helps the AI find places and local events. If people share their homes, it searches near them." />
      {group && group.kind !== 'friends' && (
        <Card><Switch label="Include a shared photo album" checked={album} onChange={setAlbum} /></Card>
      )}

      <ErrorText error={error} />
      <Button type="submit" loading={saving} disabled={!dates.length}>Send invite</Button>
    </form>
  );
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

function HourSelect({ label, value, hours, onChange }: {
  label: string; value: number; hours: number[]; onChange: (h: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-xl border border-line bg-card px-3.5 py-2.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
      >
        {hours.map((h) => (
          <option key={h} value={h}>{hourLabel(h)}{h === 24 ? ' (midnight)' : ''}</option>
        ))}
      </select>
    </label>
  );
}
