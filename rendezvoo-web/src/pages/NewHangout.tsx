import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { DayPicker } from '../components/DayPicker';
import { Button, Card, Chip, Header, SectionTitle } from '../components/ui';
import { useAppData } from '../data/AppData';
import { HANGOUT_TYPES, HOSTED_TYPES, type HangoutType } from '../data/types';
import { prettyDate, upcomingDays } from '../utils/dates';

type OptionalSection = 'deadline' | 'budget' | 'type' | 'cars';

const SECTION_LABEL: Record<OptionalSection, string> = {
  deadline: 'Deadline',
  budget: 'Budget',
  type: 'Type',
  cars: 'Cars',
};

const DAY_OPTIONS = upcomingDays(14);

export default function NewHangout() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { getGroup, createInvite } = useAppData();

  const [days, setDays] = useState<string[]>([]);
  const [sections, setSections] = useState<OptionalSection[]>([]);
  const [deadline, setDeadline] = useState<string | undefined>();
  const [type, setType] = useState<HangoutType | undefined>();

  const group = getGroup(groupId);
  if (!group) return <Header title="Group not found" back />;

  const has = (s: OptionalSection) => sections.includes(s);
  const addSection = (s: OptionalSection) => setSections((prev) => [...prev, s]);
  const removeSection = (s: OptionalSection) => {
    setSections((prev) => prev.filter((x) => x !== s));
    if (s === 'deadline') setDeadline(undefined);
    if (s === 'type') setType(undefined);
  };

  const toggleDay = (iso: string) =>
    setDays((prev) => (prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort()));

  const send = () => {
    createInvite({
      groupId: group.id,
      days,
      deadline: has('deadline') ? deadline : undefined,
      askBudget: has('budget'),
      type: has('type') ? type : undefined,
      askCars: has('cars'),
    });
    navigate(`/group/${group.id}`, { replace: true });
  };

  const remaining = (Object.keys(SECTION_LABEL) as OptionalSection[]).filter((s) => !has(s));

  return (
    <>
      <Header title="Plan a hangout!" subtitle={group.name} back />

      <h2 className="heading" style={{ marginBottom: 4 }}>
        Availability: when?
      </h2>
      <p className="caption muted" style={{ marginBottom: 12 }}>
        Pick the days you want to offer. Everyone fills in their times.
      </p>
      <DayPicker days={DAY_OPTIONS} selected={days} onToggle={toggleDay} />

      <SectionTitle>Add details</SectionTitle>
      <p className="caption muted" style={{ margin: '-6px 0 10px' }}>
        All optional. Add only what your crew needs.
      </p>
      <div className="wrap">
        {remaining.map((s) => (
          <Chip key={s} label={`+ ${SECTION_LABEL[s]}`} tone="accent" onClick={() => addSection(s)} />
        ))}
        {remaining.length === 0 ? <p className="caption muted">You added everything.</p> : null}
      </div>

      <div className="stack" style={{ marginTop: 16 }}>
        {has('deadline') ? (
          <SectionCard title="Reply by" onRemove={() => removeSection('deadline')}>
            <DayPicker
              days={DAY_OPTIONS}
              selected={deadline ? [deadline] : []}
              onToggle={(iso) => setDeadline((d) => (d === iso ? undefined : iso))}
            />
          </SectionCard>
        ) : null}

        {has('budget') ? (
          <SectionCard title="Budget" onRemove={() => removeSection('budget')}>
            <p className="caption muted">
              Everyone will enter what they can spend. Rendezvoo suggests a budget that works for all.
            </p>
          </SectionCard>
        ) : null}

        {has('type') ? (
          <SectionCard title="Type of hangout" onRemove={() => removeSection('type')}>
            <div className="wrap">
              {HANGOUT_TYPES.map((t) => (
                <Chip key={t} label={t} selected={type === t} onClick={() => setType(t)} />
              ))}
            </div>
            {type && HOSTED_TYPES.includes(type) ? (
              <p className="caption" style={{ color: 'var(--accent)' }}>
                Everyone will also be asked if they are willing to host.
              </p>
            ) : null}
          </SectionCard>
        ) : null}

        {has('cars') ? (
          <SectionCard title="Cars" onRemove={() => removeSection('cars')}>
            <p className="caption muted">
              Everyone will say whether they can drive, so rides are easy to set up.
            </p>
          </SectionCard>
        ) : null}
      </div>

      <div className="stack" style={{ marginTop: 28, gap: 8 }}>
        <Button onClick={send} disabled={days.length === 0}>
          Send invite
        </Button>
        <p className="caption muted center">
          {days.length === 0
            ? 'Pick at least one day to send the invite.'
            : `${days.length} day${days.length === 1 ? '' : 's'} offered${
                deadline ? ` · reply by ${prettyDate(deadline)}` : ''
              }`}
        </p>
      </div>
    </>
  );
}

function SectionCard({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="stack">
      <div className="row-between">
        <span className="label">{title}</span>
        <button className="link-btn muted" aria-label={`Remove ${title}`} onClick={onRemove}>
          Remove
        </button>
      </div>
      {children}
    </Card>
  );
}
