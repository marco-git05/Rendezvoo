import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { AvailabilityGrid } from '../components/AvailabilityGrid';
import { Button, Card, Chip, Field, Header, Segmented, SectionTitle } from '../components/ui';
import { useAppData } from '../data/AppData';
import { HOSTED_TYPES } from '../data/types';
import { prettyDate } from '../utils/dates';

type YesNo = 'yes' | 'no';
const YES_NO = [
  { value: 'yes' as const, label: 'Yes' },
  { value: 'no' as const, label: 'No' },
];
const toYesNo = (v: boolean | undefined): YesNo | undefined =>
  v === undefined ? undefined : v ? 'yes' : 'no';

export default function FillInvite() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getInvite, getGroup, getResponse, submitResponse } = useAppData();

  const invite = getInvite(id);
  const existing = invite ? getResponse(invite.id) : undefined;

  const [availability, setAvailability] = useState<string[]>(existing?.availability ?? []);
  const [drive, setDrive] = useState<YesNo | undefined>(toYesNo(existing?.canDrive));
  const [host, setHost] = useState<YesNo | undefined>(toYesNo(existing?.willingToHost));
  const [budget, setBudget] = useState(existing?.budget ?? '');
  const [submitted, setSubmitted] = useState(false);

  if (!invite) return <Header title="Invite not found" back />;

  const group = getGroup(invite.groupId);
  const asksHost = !!invite.type && HOSTED_TYPES.includes(invite.type);

  const submit = () => {
    submitResponse({
      inviteId: invite.id,
      availability,
      canDrive: invite.askCars && drive ? drive === 'yes' : undefined,
      budget: invite.askBudget && budget.trim() ? budget.trim() : undefined,
      willingToHost: asksHost && host ? host === 'yes' : undefined,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <>
        <Header title="You're in!" back />
        <Card className="stack">
          <h2 className="heading">Response sent</h2>
          <p className="muted">
            Thanks! {invite.creator} and the group can see when you are free. Once everyone replies,
            Rendezvoo will suggest the best plan.
          </p>
        </Card>
        <div style={{ marginTop: 20 }}>
          <Button onClick={() => navigate(-1)}>Done</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={`${invite.creator} sent an invite!`} subtitle={group?.name} back />

      <div className="wrap" style={{ marginBottom: 6 }}>
        {invite.type ? <Chip label={invite.type} selected tone="accent" /> : null}
        {invite.deadline ? <Chip label={`Reply by ${prettyDate(invite.deadline)}`} /> : null}
      </div>

      <SectionTitle>Add your availability</SectionTitle>
      <p className="caption muted" style={{ margin: '-6px 0 10px' }}>
        Click or drag across the times you are free. Tap a day to select all of it.
      </p>
      <AvailabilityGrid days={invite.days} value={availability} onChange={setAvailability} />

      <div className="stack" style={{ gap: 20, marginTop: 20 }}>
        {invite.askCars ? (
          <div className="stack" style={{ gap: 8 }}>
            <span className="label">Can you drive?</span>
            <Segmented label="Can you drive?" options={YES_NO} value={drive} onChange={setDrive} />
          </div>
        ) : null}

        {asksHost ? (
          <div className="stack" style={{ gap: 8 }}>
            <span className="label">Willing to host?</span>
            <Segmented label="Willing to host?" options={YES_NO} value={host} onChange={setHost} />
          </div>
        ) : null}

        {invite.askBudget ? (
          <Field
            label="Your budget ($)"
            value={budget}
            onChange={(e) => setBudget(e.target.value.replace(/[^0-9.]/g, ''))}
            inputMode="decimal"
            placeholder="e.g. 25"
          />
        ) : null}
      </div>

      <div className="stack" style={{ marginTop: 28, gap: 8 }}>
        <Button onClick={submit} disabled={availability.length === 0}>
          Submit
        </Button>
        {availability.length === 0 ? (
          <p className="caption muted center">Pick at least one time to submit.</p>
        ) : null}
      </div>
    </>
  );
}
