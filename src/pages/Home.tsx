import { useNavigate } from 'react-router-dom';

import { Avatar, Card, Header } from '../components/ui';
import { useAppData } from '../data/AppData';

const CATEGORY_LABEL = { school: 'School', personal: 'Personal', family: 'Family', work: 'Work' } as const;

export default function Home() {
  const navigate = useNavigate();
  const { groups, profile, togglePin } = useAppData();

  // Pinned groups float to the top; otherwise keep the original order.
  const sorted = [...groups].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <>
      <Header title={`Welcome, ${profile.name || 'friend'}`} subtitle="Your crews" />

      <div className="stack">
        {sorted.map((g) => (
          <div key={g.id} style={{ position: 'relative' }}>
            <Card className="group-card" onClick={() => navigate(`/group/${g.id}`)}>
              <Avatar label={g.name} color={g.color} size={52} />
              <div className="grow">
                <div className="heading">{g.name}</div>
                <div className="caption muted">
                  {CATEGORY_LABEL[g.category]} · {g.members.length} members
                </div>
              </div>
              <span style={{ width: 40, flex: 'none' }} aria-hidden="true" />
            </Card>
            {/* Sits over the card (not inside it) so a button is never nested in a button. */}
            <button
              className="pin"
              style={{ position: 'absolute', right: 16, top: '50%', marginTop: -20 }}
              aria-label={g.pinned ? `Unpin ${g.name}` : `Pin ${g.name}`}
              aria-pressed={g.pinned}
              onClick={() => togglePin(g.id)}>
              <span>📌</span>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
