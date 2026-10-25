import { useState } from 'react';

import { MonthCalendar } from '../components/MonthCalendar';
import { Avatar, Card, Chip, Header, Segmented } from '../components/ui';
import { useAppData } from '../data/AppData';
import { ME } from '../data/mock';
import { prettyDate } from '../utils/dates';

type Mode = 'mine' | 'friends';

export default function CalendarPage() {
  const { groups } = useAppData();
  const [mode, setMode] = useState<Mode>('mine');
  const [selected, setSelected] = useState<string | undefined>();

  // My busy blocks across every group.
  const mine = groups.flatMap((g) =>
    g.busy.filter((b) => b.memberId === ME).map((b) => ({ ...b, group: g.name, color: g.color })),
  );
  const marks: Record<string, string[]> = {};
  for (const b of mine) (marks[b.date] ??= []).push(b.color);
  const onSelected = mine.filter((b) => b.date === selected);

  return (
    <>
      <Header
        title="Calendar"
        subtitle={mode === 'mine' ? 'Your schedule' : "Your friends' schedules"}
      />
      <Segmented
        label="Calendar view"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'mine', label: 'Mine' },
          { value: 'friends', label: 'Friends' },
        ]}
      />

      {mode === 'mine' ? (
        <div className="stack" style={{ marginTop: 16 }}>
          <MonthCalendar marks={marks} selected={selected} onSelect={setSelected} />
          {selected ? (
            <Card>
              <div className="label muted">{prettyDate(selected)}</div>
              {onSelected.length === 0 ? (
                <p style={{ marginTop: 6 }}>Nothing on your calendar. Free to hang!</p>
              ) : (
                onSelected.map((b) => (
                  <div key={b.id} style={{ marginTop: 8 }}>
                    <div className="heading">{b.label}</div>
                    <div className="caption muted">{b.group}</div>
                  </div>
                ))
              )}
            </Card>
          ) : (
            <p className="caption muted center">Tap a day to see what is on it.</p>
          )}
        </div>
      ) : (
        <div className="stack" style={{ marginTop: 16 }}>
          {groups.map((g) => {
            const others = g.members.filter((m) => m.id !== ME);
            return (
              <Card key={g.id} className="stack">
                <h2 className="heading">{g.name}</h2>
                {others.length === 0 ? <p className="caption muted">No other members yet.</p> : null}
                {others.map((m) => {
                  const busy = g.busy.filter((b) => b.memberId === m.id);
                  return (
                    <div key={m.id} className="stack" style={{ gap: 8 }}>
                      <div className="row" style={{ gap: 10 }}>
                        <Avatar label={m.name} color={m.color} size={34} />
                        <span className="label">{m.name}</span>
                      </div>
                      <div className="wrap" style={{ gap: 6 }}>
                        {busy.length === 0 ? (
                          <span className="caption" style={{ color: 'var(--accent)' }}>
                            Wide open
                          </span>
                        ) : (
                          busy.map((b) => (
                            <Chip key={b.id} label={`${prettyDate(b.date)} · ${b.label}`} />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
