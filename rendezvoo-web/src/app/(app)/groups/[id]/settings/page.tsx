'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useUserId } from '@/components/AuthProvider';
import { Avatar, Button, Card, Chip, ErrorText, Field, PageHeader, SectionTitle, Spinner, Switch } from '@/components/ui';
import {
  getGroup, getMembers, getMyHome, leaveGroup, setPriority, updateGroup, updateMyMembership, uploadImage,
} from '@/lib/api';
import type { Group, GroupKind, Membership } from '@/lib/types';

const COLORS = ['#E2603B', '#F2A541', '#3BA776', '#2D9CDB', '#6C5CE7', '#D6457A', '#5D6D7E'];

export default function GroupSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const uid = useUserId();
  const [group, setGroup] = useState<Group | null>(null);
  const [name, setName] = useState('');
  const [members, setMembers] = useState<Membership[]>([]);
  const [hasHome, setHasHome] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [g, m, h] = await Promise.all([getGroup(id), getMembers(id), getMyHome()]);
      setGroup(g); setName(g.name); setMembers(m); setHasHome(!!h);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (!group) return error ? <ErrorText error={error} /> : <Spinner />;

  const me = members.find((m) => m.user_id === uid);
  const isAdmin = group.admin_id === uid;

  async function patchMe(patch: Partial<Pick<Membership, 'color' | 'pinned' | 'share_location'>>) {
    setMembers((ms) => ms.map((m) => (m.user_id === uid ? { ...m, ...patch } : m))); // instant UI
    try { await updateMyMembership(id, patch); } catch (e) { setError((e as Error).message); load(); }
  }

  async function changePhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage('avatars', `groups/${id}`, file);
      await updateGroup(id, { avatar_url: url });
      setGroup((g) => (g ? { ...g, avatar_url: url } : g));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function saveName() {
    if (name.trim() && name !== group!.name) await updateGroup(id, { name: name.trim() }).catch((e) => setError(e.message));
  }

  async function changeKind(kind: GroupKind) {
    setGroup((g) => (g ? { ...g, kind } : g));
    await updateGroup(id, { kind }).catch((e) => setError(e.message));
  }

  async function togglePriority(m: Membership) {
    setMembers((ms) => ms.map((x) => (x.user_id === m.user_id ? { ...x, is_priority: !x.is_priority } : x)));
    await setPriority(id, m.user_id, !m.is_priority).catch((e) => { setError(e.message); load(); });
  }

  async function leave() {
    if (!confirm(`Leave ${group!.name}? You'll stop seeing its hangouts.`)) return;
    await leaveGroup(id);
    router.replace('/');
  }

  return (
    <>
      <PageHeader title="Group settings" back={`/groups/${id}`} />
      <ErrorText error={error} />

      {/* Anyone in the group can change the photo and name */}
      <div className="flex items-center gap-4">
        <Avatar src={group.avatar_url} name={group.name} size={80} />
        <label className="cursor-pointer font-semibold text-brand">
          {uploading ? 'Uploading…' : 'Change group photo'}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => changePhoto(e.target.files?.[0])} />
        </label>
      </div>
      <Field label="Group name" value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} />

      {isAdmin && (
        <>
          <SectionTitle>Group type (admin)</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {(['friends', 'school', 'work'] as GroupKind[]).map((k) => (
              <Chip key={k} label={k[0].toUpperCase() + k.slice(1)} selected={group.kind === k} onClick={() => changeKind(k)} />
            ))}
          </div>
        </>
      )}

      <SectionTitle>Your calendar color for this group</SectionTitle>
      <div className="flex flex-wrap gap-3">
        {COLORS.map((c) => (
          <button key={c} onClick={() => patchMe({ color: c })} aria-label={`Color ${c}`}
            className={`h-10 w-10 rounded-full text-white ${me?.color === c ? 'ring-4 ring-ink ring-offset-2' : ''}`}
            style={{ background: c }}>
            {me?.color === c ? '✓' : ''}
          </button>
        ))}
      </div>

      <Card className="flex flex-col gap-4">
        <Switch label="Pin to top of my groups" checked={!!me?.pinned} onChange={(v) => patchMe({ pinned: v })} />
        <Switch
          label="Share my house location with this group"
          hint={hasHome ? 'The AI uses the house locations people share here to find spots that are a fair drive for everyone. Only this group can see yours.' : 'Pin your house on your profile first.'}
          checked={!!me?.share_location}
          disabled={!hasHome}
          onChange={(v) => patchMe({ share_location: v })}
        />
      </Card>

      <SectionTitle>Members</SectionTitle>
      {group.kind !== 'friends' && (
        <p className="text-sm text-muted">
          ★ Priority attendees: the AI only picks times when they're free (if possible).{isAdmin ? ' Tap ★ to toggle.' : ''}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center gap-3">
            <Avatar src={m.profiles?.avatar_url} name={m.profiles?.name} size={36} />
            <span className="flex-1">{m.profiles?.name}{m.user_id === uid ? ' (you)' : ''}</span>
            {m.user_id === group.admin_id && <span className="text-xs font-bold text-brand">ADMIN</span>}
            {group.kind !== 'friends' && (
              <button
                disabled={!isAdmin}
                onClick={() => togglePriority(m)}
                aria-label={m.is_priority ? 'Remove priority' : 'Make priority'}
                className={`text-xl ${m.is_priority ? 'text-brand' : 'text-line'} ${isAdmin ? 'hover:text-brand' : ''}`}
              >
                ★
              </button>
            )}
          </li>
        ))}
      </ul>

      <Button variant="danger" className="mt-4" onClick={leave}>Leave group</Button>
    </>
  );
}
