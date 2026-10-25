'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button, Card, Chip, ErrorText, Field, PageHeader } from '@/components/ui';
import { createGroup, joinGroup } from '@/lib/api';
import type { GroupKind } from '@/lib/types';

const KINDS: { value: GroupKind; label: string }[] = [
  { value: 'friends', label: 'Friends' },
  { value: 'school', label: 'School / club' },
  { value: 'work', label: 'Work' },
];

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<GroupKind>('friends');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState('');

  async function run(e: FormEvent, action: 'create' | 'join') {
    e.preventDefault();
    setBusy(action);
    setError('');
    try {
      const id = action === 'create' ? await createGroup(name.trim(), kind) : await joinGroup(code);
      router.push(`/groups/${id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader title="New group" back="/" />
      <ErrorText error={error} />
      <Card>
        <form onSubmit={(e) => run(e, 'create')} className="flex flex-col gap-4">
          <h2 className="font-bold">Start a group</h2>
          <Field label="Group name" placeholder="Sunday Brunch Club" required value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => <Chip key={k.value} label={k.label} selected={kind === k.value} onClick={() => setKind(k.value)} />)}
          </div>
          <p className="text-sm text-muted">School and work groups can mark priority attendees and turn photo albums off.</p>
          <Button type="submit" loading={busy === 'create'} disabled={!name.trim()}>Create group</Button>
        </form>
      </Card>
      <p className="text-center text-sm text-muted">or</p>
      <Card>
        <form onSubmit={(e) => run(e, 'join')} className="flex flex-col gap-4">
          <h2 className="font-bold">Join with a code</h2>
          <Field label="Invite code" placeholder="A1B2C3" maxLength={6} value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <Button type="submit" variant="secondary" loading={busy === 'join'} disabled={code.length < 6}>Join group</Button>
        </form>
      </Card>
    </>
  );
}
