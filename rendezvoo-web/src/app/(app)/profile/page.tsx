'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { HomesMap } from '@/components/HomesMap';
import { Avatar, Button, Card, ErrorText, Field, PageHeader, SectionTitle, Spinner } from '@/components/ui';
import { clearMyHome, findPlaces, getMyHome, getMyProfile, setMyHome, updateMyProfile, uploadImage } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Home, PlaceResult, Profile } from '@/lib/types';

export default function ProfilePage() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [home, setHome] = useState<Home | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState<'photo' | 'locate' | 'search' | null>(null);
  const [address, setAddress] = useState('');
  const [matches, setMatches] = useState<PlaceResult[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyProfile().then((p) => { setProfile(p); setName(p.name ?? ''); }).catch((e) => setError(e.message));
    getMyHome().then(setHome).catch(() => {});
  }, []);

  if (!profile) return error ? <ErrorText error={error} /> : <Spinner />;

  async function saveName() {
    await updateMyProfile({ name: name.trim() }).catch((e) => setError(e.message));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function changePhoto(file: File | undefined) {
    if (!file) return;
    setBusy('photo');
    try {
      const url = await uploadImage('avatars', `users/${profile!.id}`, file);
      await updateMyProfile({ avatar_url: url });
      setProfile((p) => (p ? { ...p, avatar_url: url } : p));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function pin(lat: number, lng: number) {
    try {
      await setMyHome(lat, lng);
      setHome({ user_id: profile!.id, lat, lng });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function searchAddress(e: FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setBusy('search');
    setError('');
    try {
      const found = (await findPlaces(address.trim())).filter((p) => p.lat != null && p.lng != null);
      setMatches(found); // the person picks the right one (a street name can exist in many cities)
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function locateMe() {
    if (!navigator.geolocation) return setError('Your browser can’t share location. Click the map instead.');
    setBusy('locate');
    navigator.geolocation.getCurrentPosition(
      (pos) => { pin(pos.coords.latitude, pos.coords.longitude); setBusy(null); },
      () => { setError('Location was blocked. Click your home on the map instead.'); setBusy(null); },
    );
  }

  return (
    <>
      <PageHeader title="Profile" />
      <ErrorText error={error} />

      <div className="flex items-center gap-4">
        <Avatar src={profile.avatar_url} name={profile.name} size={88} />
        <div className="flex flex-col gap-1">
          <p className="text-xl font-bold">{profile.name}</p>
          <p className="text-sm text-muted">{session?.user.email}</p>
          <label className="cursor-pointer text-sm font-semibold text-brand">
            {busy === 'photo' ? 'Uploading…' : 'Change photo'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => changePhoto(e.target.files?.[0])} />
          </label>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <Field className="flex-1" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button variant="secondary" onClick={saveName} disabled={!name.trim() || name === profile.name}>
          {saved ? 'Saved ✓' : 'Save'}
        </Button>
      </div>

      <SectionTitle>My house</SectionTitle>
      <p className="text-sm text-muted">
        Search your address or click the map to pin your house. It stays private until you turn on “Share my house location” in a group’s settings,
        and then only that group can see it.
      </p>
      <form onSubmit={searchAddress} className="flex gap-2">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Search your address or neighborhood"
          autoComplete="street-address"
          className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3.5 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
        />
        <Button type="submit" variant="secondary" loading={busy === 'search'} disabled={!address.trim()}>Search</Button>
      </form>
      {matches && (
        matches.length === 0 ? <p className="text-sm text-muted">No match. Try adding the city, or click the map.</p> : (
          <ul className="flex flex-col gap-1.5">
            {matches.slice(0, 5).map((m) => (
              <li key={m.id}>
                <button type="button" onClick={async () => { await pin(m.lat!, m.lng!); setMatches(null); }}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-left text-sm hover:border-brand">
                  <b>{m.name}</b>{m.address ? <span className="text-muted"> · {m.address}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        )
      )}
      <HomesMap pins={home ? [{ id: 'home', lat: home.lat, lng: home.lng, label: 'Home', kind: 'home' }] : []} onPick={pin} />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={locateMe} loading={busy === 'locate'}>📍 Use my current location</Button>
        {home && (
          <Button variant="danger" onClick={async () => { await clearMyHome(); setHome(null); }}>Remove pin</Button>
        )}
      </div>

      <Card className="mt-4">
        <Button variant="danger" className="w-full" onClick={() => supabase.auth.signOut()}>Log out</Button>
      </Card>
    </>
  );
}
