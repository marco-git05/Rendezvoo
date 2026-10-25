import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

export interface SignUpResult {
  error: string | null;
  needsConfirmation: boolean;
}

export interface AuthValue {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<SignUpResult>;
  logIn: (email: string, password: string) => Promise<string | null>;
  logOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}