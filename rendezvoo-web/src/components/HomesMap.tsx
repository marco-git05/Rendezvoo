'use client';

import dynamic from 'next/dynamic';

// Leaflet touches `window`, so it must only load in the browser.
export const HomesMap = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => <div className="h-[320px] animate-pulse rounded-2xl bg-line" />,
});

export type { Pin } from './MapInner';
