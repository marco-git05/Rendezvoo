import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Shows up in the browser console and terminal if .env.local is missing.
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
}

// Browser client. persistSession keeps people logged in until they log out.
// (Placeholder values only let the build finish; set the real ones in .env.local.)
export const supabase = createClient(url || 'https://missing-env.supabase.co', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true },
});
