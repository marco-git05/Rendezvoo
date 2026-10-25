import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { MonthCalendar } from '../components/MonthCalendar';
import { Button, Card, Header, IconButton } from '../components/ui';
import { useAppData } from '../data/AppData';
import { prettyDate } from '../utils/dates';


export default function GroupPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getGroup } = useAppData();
  const [selected, setSelected] = useState<string | undefined>();

  const group = getGroup(id);
  if (!group) return <Header title="Group not found" back />;

  const memberById = Object.fromEntries(group.members.map((m) => [m.id, m]));
  const marks: Record<string, string[]> = {};
  for (const b of group.busy) {
    const m = memberById[b.memberId];
    if (m) (marks[b.date] ??= []).push(m.color);
  }
  const busyOnSelected = group.busy.filter((b) => b.date === selected && memberById[b.memberId]);

  return (
    <>
      <Header
        title={group.name}
        subtitle="Group calendar"
        back
        right={
          <IconButton
            glyph="⚙️"
            label="Group settings"
            onClick={() => navigate(`/group/${group.id}/settings`)}
          />
        }
      />

      <MonthCalendar marks={marks} selected={selected} onSelect={setSelected} />

      <div className="legend">
        {group.members.map((m) => (
          <span key={m.id} className="caption muted">
            <i style={{ background: m.color }} />
            {m.name}
          </span>
        ))}
      </div>

      {selected ? (
        <Card className="stack">
          <div className="label muted">{prettyDate(selected)}</div>
          {busyOnSelected.length === 0 ? (
            <p>Everyone looks free.</p>
          ) : (
            busyOnSelected.map((b) => (
              <p key={b.id}>
                {memberById[b.memberId].name} is busy · {b.label}
              </p>
            ))
          )}
        </Card>
      ) : null}

      <div style={{ marginTop: 20 }}>
        <Button onClick={() => navigate(`/hangout/new/${group.id}`)}>+ Plan a hangout</Button>
      </div>

      <h2 className="heading section-title">Recent</h2>
      <Card>
        {group.feed.length === 0 ? (
          <p className="caption muted">Nothing yet. Plan the first hangout!</p>
        ) : null}
        {group.feed.map((f) => (
          <button
            key={f.id}
            className={`feed-item ${f.inviteId ? 'invite' : ''}`}
            disabled={!f.inviteId}
            onClick={() => f.inviteId && navigate(`/invite/${f.inviteId}`)}>
            <i />
            <span className="grow">{f.text}</span>
            <span className="caption muted">{f.when}</span>
          </button>
        ))}
      </Card>
    </>
  );
}
