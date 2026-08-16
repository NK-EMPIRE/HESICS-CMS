import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  updatePassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';
import { db } from './firebaseDb';
import type { User, UserHierarchy } from './types';

export interface AuthSession {
  user: User;
  firebaseUser?: FirebaseUser;
  token?: string;
}

const SESSION_KEY = 'hesics_auth_v3';

/**
 * Sign Up / Register new account with Firebase Auth & link with HESICS Directory
 */
export async function signUpWithPassword(
  name: string,
  email: string,
  password: string,
  hierarchy: UserHierarchy = 'employee',
  department?: string
): Promise<{ user: User | null; error: string | null }> {
  if (!isFirebaseConfigured || !auth) {
    // Local demo registration
    const existing = db.getUserByEmail(email);
    if (existing) {
      return { user: null, error: 'An account with this email already exists.' };
    }
    const roleId = hierarchy === 'founder' ? 'role-founder' : hierarchy === 'admin' ? 'role-admin' : 'role-sales';
    const roleName = hierarchy === 'founder' ? 'Founder' : hierarchy === 'admin' ? 'Admin' : 'Sales Lead';

    const newUser = db.addUser({
      name,
      email,
      hierarchy,
      role_id: roleId,
      role_name: roleName,
      department: department || 'Operations',
      is_active: true,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    });
    setLocalSession(newUser);
    return { user: newUser, error: null };
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    // Check if user already in directory, or create new directory entry
    let matched = db.getUserByEmail(email);
    if (!matched) {
      const roleId = hierarchy === 'founder' ? 'role-founder' : hierarchy === 'admin' ? 'role-admin' : 'role-sales';
      const roleName = hierarchy === 'founder' ? 'Founder' : hierarchy === 'admin' ? 'Admin' : 'Sales Lead';

      matched = db.addUser({
        name,
        email,
        hierarchy,
        role_id: roleId,
        role_name: roleName,
        department: department || 'Operations',
        is_active: true,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      });
    }

    setLocalSession(matched);
    return { user: matched, error: null };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Failed to create account.' };
  }
}

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
    return { user: null, error: 'User not found in team directory.' };
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    let matched = db.getUserByEmail(cred.user.email || '');
    if (!matched) {
      // Create user entry if newly authenticated
      matched = db.addUser({
        name: cred.user.displayName || email.split('@')[0],
        email: cred.user.email || email,
        hierarchy: 'employee',
        role_id: 'role-sales',
        role_name: 'Team Member',
        is_active: true,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
      });
    }
    if (!matched.is_active) {
      await fbSignOut(auth);
      return { user: null, error: 'Your team account has been deactivated. Contact the Founder.' };
    }
    setLocalSession(matched);
    return { user: matched, error: null };
  } catch (err: any) {
    const code = err?.code;
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return { user: null, error: 'Invalid email or password. Please check your credentials or reset your password.' };
    }
    return { user: null, error: err?.message || 'Authentication failed' };
  }
}

/**
 * Send Password Reset Email via Firebase
 */
export async function sendPasswordReset(email: string): Promise<{ success: boolean; error: string | null }> {
  if (!isFirebaseConfigured || !auth) {
    const matched = db.getUserByEmail(email);
    if (matched) {
      return { success: true, error: null };
    }
    return { success: false, error: 'Email not found in HESICS team directory.' };
  }

  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send password reset email.' };
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
    let matched = db.getUserByEmail(email);

    if (!matched) {
      // Create user entry in HESICS directory on first Google Sign-In
      matched = db.addUser({
        name: result.user.displayName || email.split('@')[0],
        email: email,
        hierarchy: 'employee',
        role_id: 'role-sales',
        role_name: 'Team Member',
        is_active: true,
        avatar_url: result.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
      });
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
