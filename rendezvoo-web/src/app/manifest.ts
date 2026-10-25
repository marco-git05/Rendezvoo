import type { MetadataRoute } from 'next';

// Makes the site installable on Android: Chrome menu → "Add to Home screen" / "Install app".
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rendezvoo',
    short_name: 'Rendezvoo',
    description: 'Plan hangouts with friends, minus the group-chat chaos.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBF7F2',
    theme_color: '#E2603B',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
