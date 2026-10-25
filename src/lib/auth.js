import { supabase } from './supabase'

export const signUp = (email, password, username) =>
  supabase.auth.signUp({ email, password, options: { data: { username } } })

export const logIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const logOut = () => supabase.auth.signOut()