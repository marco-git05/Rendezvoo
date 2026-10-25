'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Spinner } from '@/components/ui';

const NAV = [
  { href: '/', label: 'Groups'},
  { href: '/calendar', label: 'Calendar'},
  { href: '/profile', label: 'Profile'},
];

// Everything inside (app) requires login. Logged-out visitors go to /login.
export default function AppLayout({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!loading && !session) router.replace('/login');
  }, [loading, session, router]);

  if (loading || !session) return <div className="grid min-h-dvh place-items-center"><Spinner /></div>;

  const isActive = (href: string) =>
    href === '/' ? path === '/' || path.startsWith('/groups') || path.startsWith('/invites') : path.startsWith(href);

  return (
    <div className="min-h-dvh pb-24 sm:pb-10">
      <header className="sticky top-0 z-[1100] border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-extrabold">Rendezvoo</Link>
          <nav className="hidden gap-1 sm:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${isActive(n.href) ? 'bg-brand-soft text-brand' : 'text-muted hover:text-ink'}`}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5">{children}</main>

      {/* Bottom tab bar on phones */}
      <nav className="fixed inset-x-0 bottom-0 z-[1100] grid grid-cols-3 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] sm:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-xs font-semibold ${isActive(n.href) ? 'text-brand' : 'text-muted'}`}>
            <span className="text-xl"></span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
