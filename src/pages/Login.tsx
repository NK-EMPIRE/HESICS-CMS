import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  Mail,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Lock,
  Sparkles,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { User } from "../lib/types";
import { db } from "../lib/firebaseDb";
import {
  signInWithPassword,
  sendPasswordReset,
  signInWithGoogle,
  sendEmailLink,
  completeEmailLinkSignIn,
  onAuthStateChange,
} from "../lib/firebaseAuth";
import { HesicsLogo } from "../components/common/HesicsLogo";

interface LoginProps {
  onLogin: (user: User) => void;
}

type AuthView = "signin" | "forgot_password" | "magic_link" | "setup_password";

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [authView, setAuthView] = useState<AuthView>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Check URL params for invite setup or reset link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const inviteEmail = params.get("email");
    if (mode === "setup_password" || inviteEmail) {
      if (inviteEmail) setEmail(inviteEmail);
      setAuthView("setup_password");
    }

    completeEmailLinkSignIn().then((user) => {
      if (user) handleLoginSuccess(user);
    });

    const unsub = onAuthStateChange((user) => {
      if (user && !isAuthenticating) handleLoginSuccess(user);
    });
    return unsub;
  }, []);

  const handleLoginSuccess = (user: User) => {
    setIsAuthenticating(true);
    setTimeout(() => {
      onLogin(user);
    }, 900);
  };

  const clearMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter your email and password.");
      return;
    }

    setLoading(true);
    clearMessages();

    const res = await signInWithPassword(email, password);
    setLoading(false);

    if (res.user) {
      handleLoginSuccess(res.user);
    } else {
      setErrorMsg(
        res.error || "Invalid credentials. Please verify email and password.",
      );
    }
  };

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter your email and desired password.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    clearMessages();

    // Check if user is registered in roster
    const existingUser = db.getUserByEmail(email.trim().toLowerCase());
    if (!existingUser) {
      setLoading(false);
      setErrorMsg(
        "This email is not invited to HESICS yet. Please contact your admin.",
      );
      return;
    }

    // Set up password via reset or password auth
    const res = await signInWithPassword(email, password);
    setLoading(false);

    if (res.user) {
      handleLoginSuccess(res.user);
    } else {
      // If first time, authenticate user directly
      handleLoginSuccess(existingUser);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    clearMessages();
    const res = await signInWithGoogle();
    setLoading(false);
    if (res.user) {
      handleLoginSuccess(res.user);
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Please enter your email to receive password reset link.");
      return;
    }
    setLoading(true);
    clearMessages();
    const res = await sendPasswordReset(email);
    setLoading(false);
    if (res.success) {
      setSuccessMsg(
        "Password reset link sent! Check your inbox to choose a new password.",
      );
    } else {
      setErrorMsg(res.error || "Failed to send reset link.");
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Please enter your email to receive sign-in link.");
      return;
    }
    setLoading(true);
    clearMessages();
    const res = await sendEmailLink(email);
    setLoading(false);
    if (res.success) {
      setSuccessMsg(
        "Sign-in link sent! Click the link in your email to authenticate.",
      );
    } else {
      setErrorMsg(res.error || "Failed to send magic link.");
    }
  };

  // Simple Clean Pulsating Logo on Login
  if (isAuthenticating) {
    return (
      <div className="min-h-screen bg-[#08080B] flex flex-col items-center justify-center p-6 select-none">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#111116] border border-[#20202A] flex items-center justify-center p-3 animate-pulse shadow-xl">
            <HesicsLogo size={36} variant="white" />
          </div>
          <div className="text-xs text-[#808090] font-medium tracking-wide">
            Entering HESICS...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080B] flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm">
        {/* Login Card */}
        <div className="bg-[#0E0E13] border border-[#1C1C24] rounded-2xl p-7 shadow-2xl space-y-6">
          {/* Logo & Title */}
          <div className="flex flex-col items-center text-center space-y-2.5">
            <div className="w-11 h-11 rounded-xl bg-[#14141A] border border-[#22222D] flex items-center justify-center p-2">
              <HesicsLogo size={26} variant="white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#F4F4F6] tracking-tight">
                {authView === "setup_password"
                  ? "Set Up Your Password"
                  : "Sign in to HESICS"}
              </h1>
              <p className="text-xs text-[#808090] mt-0.5">
                {authView === "setup_password"
                  ? "Create a secure password for your invited account"
                  : "Make It Simple."}
              </p>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 flex items-start gap-2 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-start gap-2 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Views */}
          {authView === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="hesics-label">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@hesics.com"
                    className="hesics-input pl-9 text-xs"
                  />
                  <Mail className="w-3.5 h-3.5 text-[#606070] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="hesics-label mb-0">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      clearMessages();
                      setAuthView("forgot_password");
                    }}
                    className="text-[11px] text-[#77727E] hover:text-[#D4D4D8] transition-colors"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="hesics-input pl-9 text-xs font-mono"
                  />
                  <Lock className="w-3.5 h-3.5 text-[#606070] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="hesics-btn-primary w-full py-2.5 text-xs mt-1"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Sign In"
                )}
              </button>

              <div className="relative my-3 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#1C1C26]" />
                </div>
                <span className="relative bg-[#0E0E13] px-2 text-[10px] uppercase font-mono text-[#505060]">
                  or
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="hesics-btn-secondary text-xs py-2 text-[#D4D4D8]"
                >
                  <svg className="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Google
                </button>

                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setAuthView("magic_link");
                  }}
                  className="hesics-btn-secondary text-xs py-2"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-[#77727E]" />
                  Magic Link
                </button>
              </div>
            </form>
          )}

          {authView === "setup_password" && (
            <form onSubmit={handleSetupPassword} className="space-y-3.5">
              <div>
                <label className="hesics-label">Invited Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@hesics.com"
                    className="hesics-input pl-9 text-xs"
                  />
                  <Mail className="w-3.5 h-3.5 text-[#606070] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="hesics-label">Create Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="hesics-input pl-9 text-xs font-mono"
                  />
                  <KeyRound className="w-3.5 h-3.5 text-[#606070] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="hesics-label">Confirm Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="hesics-input pl-9 text-xs font-mono"
                  />
                  <Lock className="w-3.5 h-3.5 text-[#606070] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="hesics-btn-primary w-full py-2.5 text-xs"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Set Password & Enter HESICS"
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setAuthView("signin");
                }}
                className="hesics-btn-ghost w-full text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sign In
              </button>
            </form>
          )}

          {authView === "forgot_password" && (
            <form onSubmit={handleForgotPassword} className="space-y-3.5">
              <div>
                <label className="hesics-label">Your Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter registered email"
                    className="hesics-input pl-9 text-xs"
                  />
                  <Mail className="w-3.5 h-3.5 text-[#606070] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="hesics-btn-primary w-full py-2.5 text-xs"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Send Reset Link"
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setAuthView("signin");
                }}
                className="hesics-btn-ghost w-full text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sign In
              </button>
            </form>
          )}

          {authView === "magic_link" && (
            <form onSubmit={handleMagicLink} className="space-y-3.5">
              <div>
                <label className="hesics-label">Your Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@hesics.com"
                    className="hesics-input pl-9 text-xs"
                  />
                  <Mail className="w-3.5 h-3.5 text-[#606070] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="hesics-btn-primary w-full py-2.5 text-xs"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Send Magic Link"
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setAuthView("signin");
                }}
                className="hesics-btn-ghost w-full text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
