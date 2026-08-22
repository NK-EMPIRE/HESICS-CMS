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
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";
import { db } from "./db/team";
import type { User, UserHierarchy } from "./types";

export interface AuthSession {
  user: User;
  firebaseUser?: FirebaseUser;
  token?: string;
}

const SESSION_KEY = "hesics_auth_v3";
export const ROOT_MASTER_EMAIL = "hesics1@gmail.com";
const ROOT_MASTER_PASS = "ngng786$Money";

function getOrCreateRootUser(): User {
  let root = db.getUserByEmail(ROOT_MASTER_EMAIL);
  if (!root) {
    root = db.addUser({
      name: "CHIEF",
      email: ROOT_MASTER_EMAIL,
      hierarchy: "founder",
      role_id: "role-admin",
      role_name: "Admin",
      department: "Executive Operations",
      is_active: true,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=HesicsChief`,
    });
  } else if (root.name !== "CHIEF") {
    root = db.updateUser(root.id, { name: "CHIEF" }) || root;
  }
  return root;
}

/**
 * Sign in using Firebase Email & Password
 * Only registered accounts authorized by an Admin/Founder can log in.
 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> {
  const normalizedEmail = email.trim().toLowerCase();

  // Root Master Account immediate authorization
  if (normalizedEmail === ROOT_MASTER_EMAIL) {
    if (password === ROOT_MASTER_PASS) {
      const rootUser = getOrCreateRootUser();
      setLocalSession(rootUser);
      return { user: rootUser, error: null };
    }
  }

  if (!isFirebaseConfigured || !auth) {
    const matched = db.getUserByEmail(normalizedEmail);
    if (!matched) {
      return {
        user: null,
        error:
          "Access Denied: This account is not registered in HESICS. Only administrators can add team members.",
      };
    }
    if (!matched.is_active) {
      return {
        user: null,
        error:
          "Your team account has been deactivated. Please contact your administrator.",
      };
    }
    setLocalSession(matched);
    return { user: matched, error: null };
  }

  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      normalizedEmail,
      password,
    );
    let matched = db.getUserByEmail(cred.user.email || normalizedEmail);

    if (!matched) {
      if (normalizedEmail === ROOT_MASTER_EMAIL) {
        matched = getOrCreateRootUser();
      } else {
        await fbSignOut(auth);
        return {
          user: null,
          error:
            "Access Denied: Your email is not registered in the HESICS team directory. Please contact your organization administrator to add your account.",
        };
      }
    }

    if (!matched.is_active) {
      await fbSignOut(auth);
      return {
        user: null,
        error:
          "Your team account has been deactivated. Please contact your administrator.",
      };
    }

    setLocalSession(matched);
    return { user: matched, error: null };
  } catch (err: any) {
    // If master account fallback
    if (
      normalizedEmail === ROOT_MASTER_EMAIL &&
      password === ROOT_MASTER_PASS
    ) {
      const rootUser = getOrCreateRootUser();
      setLocalSession(rootUser);
      return { user: rootUser, error: null };
    }

    const code = err?.code;
    if (code === "auth/unauthorized-domain") {
      return {
        user: null,
        error: `Domain Authorization Needed: Please add "${window.location.hostname}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`,
      };
    }
    if (
      code === "auth/invalid-credential" ||
      code === "auth/wrong-password" ||
      code === "auth/user-not-found"
    ) {
      return {
        user: null,
        error:
          "Invalid email or password. Please verify your credentials or reset your password.",
      };
    }
    return { user: null, error: err?.message || "Authentication failed" };
  }
}

/**
 * Sign in using Google Provider via Firebase Auth
 * Strictly enforced: Only authorized roster emails can sign in.
 */
export async function signInWithGoogle(): Promise<{
  user: User | null;
  error: string | null;
}> {
  if (!isFirebaseConfigured || !auth) {
    return {
      user: null,
      error: "Firebase is not yet configured with your project API keys.",
    };
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    const normalizedEmail = (result.user.email || "").trim().toLowerCase();
    let matched = db.getUserByEmail(normalizedEmail);

    if (!matched) {
      if (normalizedEmail === ROOT_MASTER_EMAIL) {
        matched = getOrCreateRootUser();
      } else {
        await fbSignOut(auth);
        return {
          user: null,
          error: `Access Denied: ${normalizedEmail} is not authorized in HESICS. Only administrators can add new accounts.`,
        };
      }
    }

    if (!matched.is_active) {
      await fbSignOut(auth);
      return {
        user: null,
        error:
          "Your account is deactivated. Please contact your administrator.",
      };
    }

    setLocalSession(matched);
    return { user: matched, error: null };
  } catch (err: any) {
    const code = err?.code;
    if (code === "auth/unauthorized-domain") {
      return {
        user: null,
        error: `Domain Authorization Needed: Please add "${window.location.hostname}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`,
      };
    }
    if (code === "auth/popup-closed-by-user") {
      return { user: null, error: "Sign-in popup was cancelled." };
    }
    return { user: null, error: err?.message || "Google sign in failed" };
  }
}

/**
 * Admin Provisioning: Add new team member to HESICS
 */
export async function adminCreateTeamMember(
  name: string,
  email: string,
  roleId: string,
  roleName: string,
  hierarchy: UserHierarchy,
  department?: string,
): Promise<{ user: User | null; error: string | null }> {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.getUserByEmail(normalizedEmail);
  if (existing) {
    return {
      user: null,
      error:
        "A team member with this email already exists in the organization.",
    };
  }

  const newUser = db.addUser({
    name,
    email: normalizedEmail,
    role_id: roleId,
    role_name: roleName,
    hierarchy,
    department: department || "Operations",
    is_active: true,
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
  });

  return { user: newUser, error: null };
}

/**
 * Send Password Reset Email via Firebase
 */
export async function sendPasswordReset(
  email: string,
): Promise<{ success: boolean; error: string | null }> {
  const normalizedEmail = email.trim().toLowerCase();
  const matched = db.getUserByEmail(normalizedEmail);

  if (!matched && normalizedEmail !== ROOT_MASTER_EMAIL) {
    return {
      success: false,
      error:
        "Email not found in HESICS team directory. Please contact your administrator.",
    };
  }

  if (!isFirebaseConfigured || !auth) {
    return { success: true, error: null };
  }

  try {
    await sendPasswordResetEmail(auth, normalizedEmail);
    return { success: true, error: null };
  } catch (err: any) {
    const code = err?.code;
    if (code === "auth/unauthorized-domain") {
      return {
        success: false,
        error: `Please add "${window.location.hostname}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`,
      };
    }
    return {
      success: false,
      error: err?.message || "Failed to send password reset email.",
    };
  }
}

/**
 * Send passwordless Email Sign-in link via Firebase
 */
export async function sendEmailLink(
  email: string,
): Promise<{ success: boolean; error: string | null }> {
  const normalizedEmail = email.trim().toLowerCase();
  const matched = db.getUserByEmail(normalizedEmail);

  if (!matched && normalizedEmail !== ROOT_MASTER_EMAIL) {
    return {
      success: false,
      error:
        "Email not found in HESICS team roster. Please contact your administrator.",
    };
  }

  if (!isFirebaseConfigured || !auth) {
    return { success: true, error: null };
  }

  const actionCodeSettings = {
    url: window.location.href,
    handleCodeInApp: true,
  };

  try {
    await sendSignInLinkToEmail(auth, normalizedEmail, actionCodeSettings);
    window.localStorage.setItem("emailForSignIn", normalizedEmail);
    return { success: true, error: null };
  } catch (err: any) {
    const code = err?.code;
    if (code === "auth/unauthorized-domain") {
      return {
        success: false,
        error: `Please add "${window.location.hostname}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`,
      };
    }
    return {
      success: false,
      error: err?.message || "Failed to send login link",
    };
  }
}

/**
 * Check and complete email link sign-in on redirect
 */
export async function completeEmailLinkSignIn(): Promise<User | null> {
  if (!isFirebaseConfigured || !auth) return null;

  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem("emailForSignIn");
    if (!email) {
      email = window.prompt("Please provide your email for confirmation");
    }
    if (email) {
      try {
        const result = await signInWithEmailLink(
          auth,
          email,
          window.location.href,
        );
        window.localStorage.removeItem("emailForSignIn");
        const normalizedEmail = (result.user.email || "").trim().toLowerCase();
        let matched = db.getUserByEmail(normalizedEmail);
        if (!matched && normalizedEmail === ROOT_MASTER_EMAIL) {
          matched = getOrCreateRootUser();
        }
        if (matched && matched.is_active) {
          setLocalSession(matched);
          return matched;
        }
      } catch (err) {
        console.error("Error signing in with email link:", err);
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
      console.warn("Firebase signout error:", e);
    }
  }
  clearLocalSession();
}

/**
 * Real-time auth listener for Firebase Auth
 */
export function onAuthStateChange(
  callback: (user: User | null) => void,
): () => void {
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

    const normalizedEmail = firebaseUser.email.trim().toLowerCase();
    let matched = db.getUserByEmail(normalizedEmail);
    if (!matched && normalizedEmail === ROOT_MASTER_EMAIL) {
      matched = getOrCreateRootUser();
    }

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
    console.error("Local session write error:", e);
  }
}

export function clearLocalSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
