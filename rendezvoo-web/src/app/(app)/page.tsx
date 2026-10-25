'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Avatar, ButtonLink, Empty, ErrorText, PageHeader, Spinner } from '@/components/ui';
import { getMyGroups, updateMyMembership } from '@/lib/api';
import type { Membership } from '@/lib/types';

// Home screen: your groups, pinned ones first.
export default function GroupsPage() {
  const [rows, setRows] = useState<Membership[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    getMyGroups().then(setRows).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function togglePin(m: Membership) {
    await updateMyMembership(m.group_id, { pinned: !m.pinned });
    load();
  }

  return (
    <>
      <PageHeader title="Your groups" right={<ButtonLink href="/groups/new">+ New group</ButtonLink>} />
      <ErrorText error={error} />
      {rows === null ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty title="No groups yet" subtitle="Create a group, or join one with a 6-character code." />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((m) => (
            <li key={m.group_id} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 transition hover:border-brand">
              <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: m.color }} />
              <Link href={`/groups/${m.group_id}`} className="flex flex-1 items-center gap-3">
                <Avatar src={m.groups?.avatar_url} name={m.groups?.name} size={44} />
                <span className="flex flex-col">
                  <span className="font-semibold">{m.groups?.name}</span>
                  <span className="text-xs capitalize text-muted">{m.groups?.kind}</span>
                </span>
              </Link>
              <button
                onClick={() => togglePin(m)}
                title={m.pinned ? 'Unpin' : 'Pin to top'}
                aria-label={m.pinned ? 'Unpin group' : 'Pin group to top'}
                className={`rounded-lg px-2 py-1 text-lg transition ${m.pinned ? '' : 'opacity-25 hover:opacity-70'}`}
              >
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
