import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';
import { db } from './firebaseDb';
import type { User } from './types';

export interface AuthSession {
  user: User;
  firebaseUser?: FirebaseUser;
  token?: string;
}

const SESSION_KEY = 'hesics_auth_v3';

/**
 * Sign in using Firebase Email & Password
 */
export async function signInWithPassword(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  if (!isFirebaseConfigured || !auth) {
    // Fallback in demo mode
    const matched = db.getUserByEmail(email);
    if (matched && matched.is_active) {
      setLocalSession(matched);
      return { user: matched, error: null };
    }
    return { user: null, error: 'User not found in team directory' };
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const matched = db.getUserByEmail(cred.user.email || '');
    if (!matched) {
      return { user: null, error: 'Authenticated with Firebase, but your email is not in the HESICS team directory.' };
    }
    if (!matched.is_active) {
      await fbSignOut(auth);
      return { user: null, error: 'Your team account has been deactivated. Contact the Founder.' };
    }
    setLocalSession(matched);
    return { user: matched, error: null };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Authentication failed' };
  }
}

/**
 * Sign in using Google Provider via Firebase Auth
 */
export async function signInWithGoogle(): Promise<{ user: User | null; error: string | null }> {
  if (!isFirebaseConfigured || !auth) {
    return { user: null, error: 'Firebase is not yet configured with your project API keys.' };
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email || '';
    const matched = db.getUserByEmail(email);

    if (!matched) {
      await fbSignOut(auth);
      return { user: null, error: `Google account (${email}) is not registered in the HESICS team directory.` };
    }
    if (!matched.is_active) {
      await fbSignOut(auth);
      return { user: null, error: 'Your account is deactivated.' };
    }
    setLocalSession(matched);
    return { user: matched, error: null };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Google sign in failed' };
  }
}

/**
 * Send passwordless Email Sign-in link via Firebase
 */
export async function sendEmailLink(email: string): Promise<{ success: boolean; error: string | null }> {
  if (!isFirebaseConfigured || !auth) {
    const matched = db.getUserByEmail(email);
    if (matched && matched.is_active) {
      return { success: true, error: null };
    }
    return { success: false, error: 'Email not found in HESICS team roster.' };
  }

  const actionCodeSettings = {
    url: window.location.href,
    handleCodeInApp: true,
  };

  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send login link' };
  }
}

/**
 * Check and complete email link sign-in on redirect
 */
export async function completeEmailLinkSignIn(): Promise<User | null> {
  if (!isFirebaseConfigured || !auth) return null;

  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt('Please provide your email for confirmation');
    }
    if (email) {
      try {
        const result = await signInWithEmailLink(auth, email, window.location.href);
        window.localStorage.removeItem('emailForSignIn');
        const matched = db.getUserByEmail(result.user.email || '');
        if (matched && matched.is_active) {
          setLocalSession(matched);
          return matched;
        }
      } catch (err) {
        console.error('Error signing in with email link:', err);
      }
    }
  }
  return null;
}

/**
 * Sign out of Firebase & local session
 */
export async function signOut(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Firebase signout error:', e);
    }
  }
  clearLocalSession();
}

/**
 * Real-time auth listener for Firebase Auth
 */
export function onAuthStateChange(callback: (user: User | null) => void): (() => void) {
  if (!isFirebaseConfigured || !auth) {
    const local = getLocalSession();
    callback(local);
    return () => {};
  }

  const unsubscribe = fbOnAuthStateChanged(auth, (firebaseUser) => {
    if (!firebaseUser || !firebaseUser.email) {
      const local = getLocalSession();
      callback(local);
      return;
    }

    const matched = db.getUserByEmail(firebaseUser.email);
    if (matched && matched.is_active) {
      setLocalSession(matched);
      callback(matched);
    } else {
      callback(null);
    }
  });

  return unsubscribe;
}

// ─── Local Storage Session Persistence ─────────────────────────────────────────

export function getLocalSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: User = JSON.parse(raw);
    return db.getUserById(parsed.id) || parsed;
  } catch {
    return null;
  }
}

export function setLocalSession(user: User): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Local session write error:', e);
  }
}

export function clearLocalSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
