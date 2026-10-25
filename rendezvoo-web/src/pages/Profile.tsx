import { Avatar, Button, Card, Chip, Field, Header, SectionTitle } from '../components/ui';
import { useAppData } from '../data/AppData';
import { DIETARY_OPTIONS } from '../data/types';
import { PALETTES, THEME_ORDER, useTheme } from '../theme';

export default function Profile() {
  const { themeName, setThemeName } = useTheme();
  const { profile, updateProfile, resetDemo } = useAppData();

  const toggleDiet = (item: string) =>
    updateProfile({
      dietary: profile.dietary.includes(item)
        ? profile.dietary.filter((d) => d !== item)
        : [...profile.dietary, item],
    });

  return (
    <>
      <Header title="Your profile" />

      <div className="center" style={{ marginBottom: 8 }}>
        <div style={{ display: 'inline-block' }}>
          <Avatar label={profile.name || '?'} color="var(--primary)" size={96} />
        </div>
        <p className="caption muted" style={{ marginTop: 8 }}>
          Photo upload coming soon
        </p>
      </div>

      <div className="stack" style={{ marginTop: 12, gap: 14 }}>
        <Field
          label="Name"
          value={profile.name}
          onChange={(e) => updateProfile({ name: e.target.value })}
          placeholder="Your name"
          autoComplete="off"
        />
        <Field
          label="Pronouns"
          value={profile.pronouns}
          onChange={(e) => updateProfile({ pronouns: e.target.value })}
          placeholder="Optional"
          autoComplete="off"
        />
      </div>

      <SectionTitle>My theme</SectionTitle>
      <div className="stack" style={{ gap: 10 }}>
        <span className="label muted">Colors</span>
        {THEME_ORDER.map((name) => {
          const p = PALETTES[name];
          return (
            <button
              key={name}
              className="theme-option"
              aria-pressed={themeName === name}
              onClick={() => setThemeName(name)}>
              <span className="swatches" aria-hidden="true">
                {p.swatches.map((s) => (
                  <i key={s} style={{ background: s }} />
                ))}
              </span>
              <span className="label grow">{p.label}</span>
              {themeName === name ? (
                <span style={{ color: 'var(--primary)', fontWeight: 900 }}>✓</span>
              ) : null}
            </button>
          );
        })}
        <span className="label muted" style={{ marginTop: 6 }}>
          Images
        </span>
        <Card className="soon">
          <p className="caption muted">Photo backgrounds are coming soon.</p>
        </Card>
      </div>

      <SectionTitle>Dietary restrictions</SectionTitle>
      <div className="wrap">
        {DIETARY_OPTIONS.map((d) => (
          <Chip
            key={d}
            label={d}
            selected={profile.dietary.includes(d)}
            onClick={() => toggleDiet(d)}
          />
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <Field
          label="Anything else?"
          value={profile.dietaryNote}
          onChange={(e) => updateProfile({ dietaryNote: e.target.value })}
          placeholder="e.g. no shellfish"
          autoComplete="off"
        />
      </div>

      <SectionTitle>Map</SectionTitle>
      <Card className="map-card">
        <div className="pinicon" aria-hidden="true">
          📍
        </div>
        <div className="label">Your map spot</div>
        <p className="caption muted" style={{ marginTop: 4 }}>
          Your location only shows in groups where you turn on "show location".
        </p>
      </Card>

      <div style={{ marginTop: 28 }}>
        <Button variant="ghost" onClick={resetDemo}>
          Reset demo data
        </Button>
      </div>
    </>
  );
}
