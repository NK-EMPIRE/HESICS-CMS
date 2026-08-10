/**
 * HESICS OS — Authentication Layer
 *
 * When VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set:
 *   → Uses real Supabase Auth magic-link (email OTP)
 *   → Session managed by Supabase SDK, auto-refreshed
 *
 * When not configured (demo mode):
 *   → Falls through to the mock localStorage login in the Login page
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { db } from './supabase';
import type { User } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthSession {
  user: User;
  accessToken: string;
  expiresAt: number;
}

// ─── Supabase Auth ────────────────────────────────────────────────────────────

/**
 * Send magic-link email via Supabase Auth.
 * Returns error message string if it fails, null on success.
 */
export async function sendMagicLink(email: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) {
    return 'Supabase not configured. Using demo login.';
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
      shouldCreateUser: false, // Only allow pre-existing team members
    },
  });

  if (error) return error.message;
  return null;
}

/**
 * Sign out current Supabase session.
 */
export async function signOut(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }
}

/**
 * Get the current Supabase session's matching User from our DB.
 * Returns null if no session or user not found in team roster.
 */
export async function getSessionUser(): Promise<User | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data } = await supabase.auth.getSession();
  if (!data.session?.user?.email) return null;

  const email = data.session.user.email;
  const teamUsers = db.getUsers();
  return teamUsers.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.is_active
  ) || null;
}

/**
 * Subscribe to Supabase auth state changes.
 * Calls callback with matched User whenever session changes.
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): (() => void) {
  if (!isSupabaseConfigured || !supabase) {
    return () => {}; // no-op unsubscribe
  }

  const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user?.email) {
      callback(null);
      return;
    }
    const email = session.user.email;
    const teamUsers = db.getUsers();
    const matched = teamUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.is_active
    );
    callback(matched || null);
  });

  return () => data.subscription.unsubscribe();
}

// ─── Session helpers ──────────────────────────────────────────────────────────

const SESSION_KEY = 'hesics_auth_v3';

export function getLocalSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: User = JSON.parse(raw);
    // Re-hydrate from db to catch any role/permission updates
    return db.getUserById(parsed.id) || null;
  } catch {
    return null;
  }
}

export function setLocalSession(user: User): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch { /* ignore */ }
}

export function clearLocalSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
