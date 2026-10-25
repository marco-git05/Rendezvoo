'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button, ErrorText, Field } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (session) router.replace('/'); }, [session, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-4xl font-extrabold">📍 Rendezvoo</h1>
        <p className="mt-1 text-muted">Plans with friends, minus the group-chat chaos.</p>
      </div>
      {/* autoComplete lets the browser's password manager save and fill the login */}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorText error={error} />
        <Button type="submit" loading={busy}>Log in</Button>
      </form>
      <p className="text-center text-sm">
        New here? <Link href="/signup" className="font-semibold text-brand">Create an account</Link>
      </p>
    </main>
  );
}
