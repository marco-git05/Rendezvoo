'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button, ErrorText, Field } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (session) router.replace('/'); }, [session, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } }, // a database trigger copies this into profiles.name
    });
    setBusy(false);
    if (error) return setError(error.message);
    // No email confirmation step: if sign-up didn't start a session, log straight in.
    if (!data.session) {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (loginError) {
        console.error('[signup] Auto login failed. Turn off "Confirm email" in Supabase → Authentication → Sign In / Providers → Email.', loginError.message);
        setError('Your account was created, but we couldn’t log you in. Please try logging in.');
      }
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-extrabold">Create your account</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Your name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="new-password" minLength={6} required
          hint="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorText error={error} />
        <Button type="submit" loading={busy}>Sign up</Button>
      </form>
      <p className="text-center text-sm">
        Already have an account? <Link href="/login" className="font-semibold text-brand">Log in</Link>
      </p>
    </main>
  );
}
