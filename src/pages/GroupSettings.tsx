import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { Avatar, Button, Card, Field, Header, SectionTitle, Toggle } from '../components/ui';
import { useAppData } from '../data/AppData';
import { ME } from '../data/mock';
import { useTheme } from '../theme';

export default function GroupSettings() {
  const { id } = useParams();
  const { palette } = useTheme();
  const { getGroup, setShowLocation, setGroupColor, addMember, removeMember } = useAppData();
  const [newName, setNewName] = useState('');

  const group = getGroup(id);
  if (!group) return <Header title="Group not found" back />;

  const isAdmin = group.role === 'admin';
  const submitMember = () => {
    const name = newName.trim();
    if (!name) return;
    addMember(group.id, name);
    setNewName('');
  };

  return (
    <>
      <Header title="Group settings" subtitle={group.name} back />

      <Card className="stack">
        <div className="row-between">
          <span className="label">Status</span>
          <span className={`badge ${isAdmin ? 'admin' : ''}`}>
            {isAdmin ? 'Admin' : 'Member'}
            {isAdmin ? <span aria-hidden="true">👑</span> : null}
          </span>
        </div>

        <div className="row-between">
          <span className="label">
            Show location <span aria-hidden="true">🏠</span>
          </span>
          <Toggle
            label="Show my home location to this group"
            checked={group.showLocation}
            onChange={(v) => setShowLocation(group.id, v)}
          />
        </div>

        <div className="stack" style={{ gap: 10 }}>
          <span className="label">Group color</span>
          <div className="wrap" style={{ gap: 12 }}>
            {palette.groupColors.map((c) => (
              <button
                key={c}
                className="color-dot"
                style={{ background: c }}
                aria-label={`Group color ${c}`}
                aria-pressed={group.color === c}
                onClick={() => setGroupColor(group.id, c)}
              />
            ))}
          </div>
        </div>
      </Card>

      {isAdmin ? (
        <>
          <SectionTitle>Admin functions</SectionTitle>
          <Card className="stack">
            <span className="label">Add member</span>
            <Field
              label="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitMember()}
              placeholder="Friend's name"
              autoComplete="off"
            />
            <Button variant="accent" onClick={submitMember} disabled={!newName.trim()}>
              Add to group
            </Button>
          </Card>

          <SectionTitle>Members</SectionTitle>
          <Card>
            {group.members.map((m) => (
              <div key={m.id} className="member-row">
                <Avatar label={m.name} color={m.color} size={36} />
                <span className="grow">{m.name}</span>
                {m.id !== ME ? (
                  <button
                    className="link-btn"
                    aria-label={`Remove ${m.name}`}
                    onClick={() => removeMember(group.id, m.id)}>
                    Remove
                  </button>
                ) : (
                  <span className="caption muted">You</span>
                )}
              </div>
            ))}
          </Card>
        </>
      ) : null}
    </>
  );
}
