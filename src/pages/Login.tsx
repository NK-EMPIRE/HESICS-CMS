import React, { useState, useEffect } from 'react';
import {
  ArrowRight, ShieldCheck, Mail, CheckCircle2, Loader2, AlertCircle,
  Lock, Sparkles, KeyRound, ArrowLeft, Building2
} from 'lucide-react';
import { User } from '../lib/types';
import { isFirebaseConfigured } from '../lib/firebase';
import {
  signInWithPassword,
  sendPasswordReset,
  signInWithGoogle,
  sendEmailLink,
  completeEmailLinkSignIn,
  onAuthStateChange
} from '../lib/firebaseAuth';
import { HesicsLogo } from '../components/common/HesicsLogo';

interface LoginProps {
  onLogin: (user: User) => void;
}

type AuthView = 'signin' | 'forgot_password' | 'magic_link';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [authView, setAuthView] = useState<AuthView>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Check email link sign-in on redirect or live auth changes
  useEffect(() => {
    completeEmailLinkSignIn().then((user) => {
      if (user) onLogin(user);
    });

    const unsub = onAuthStateChange((user) => {
      if (user) onLogin(user);
    });
    return unsub;
  }, [onLogin]);

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both your work email and password.');
      return;
    }

    setLoading(true);
    clearMessages();

    const res = await signInWithPassword(email, password);
    setLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else if (res.user) {
      onLogin(res.user);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your work email address.');
      return;
    }

    setLoading(true);
    clearMessages();

    const res = await sendPasswordReset(email);
    setLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Password reset instructions sent to ${email}`);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your work email.');
      return;
    }

    setLoading(true);
    clearMessages();

    const res = await sendEmailLink(email);
    setLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Magic login link sent to ${email}. Check your inbox!`);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    clearMessages();

    const res = await signInWithGoogle();
    setLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else if (res.user) {
      onLogin(res.user);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 font-sans selection:bg-[#77727E]/20">

      {/* Ambient Electric Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-[#77727E]/5 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-[360px] space-y-5 relative z-10">

        {/* HESICS Brand Emblem */}
        <div className="text-center space-y-2.5">
          <div className="w-14 h-14 rounded-2xl bg-[#09090C] border border-[#77727E]/30 flex items-center justify-center mx-auto shadow-2xl shadow-[#77727E]/15 overflow-hidden p-2">
            <HesicsLogo size={40} variant="glow" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#F4F4F6] tracking-tight font-display">HESICS</h1>
            <p className="text-[10px] text-[#606070] uppercase font-semibold tracking-widest mt-0.5">Business Operating System</p>
          </div>
        </div>

        {/* Main Authentication Surface */}
        <div className="bg-[#0D0D11] border border-[#1C1C22] rounded-2xl p-6 space-y-4 shadow-2xl">

          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-[#181820] pb-3 text-xs">
            <span className="font-semibold text-[#F4F4F6] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#77727E]" />
              {authView === 'signin' && 'Sign In to Workspace'}
              {authView === 'forgot_password' && 'Password Recovery'}
              {authView === 'magic_link' && 'Magic Link Access'}
            </span>
            {authView !== 'signin' && (
              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setAuthView('signin');
                }}
                className="text-[11px] text-[#707080] hover:text-[#F4F4F6] flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            )}
          </div>

          {/* Feedback Banners */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* View 1: Email & Password Form */}
          {authView === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="hesics-label">Work Email</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#505060]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@hesics.com"
                    className="hesics-input pl-9"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="hesics-label mb-0">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      clearMessages();
                      setAuthView('forgot_password');
                    }}
                    className="text-[10px] text-[#707080] hover:text-[#77727E] transition-colors"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#505060]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="hesics-input pl-9"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="hesics-btn-primary w-full py-2.5 mt-1"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Enter Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {/* Single Sign-On / Alternative Options */}
              <div className="pt-2 border-t border-[#181820] space-y-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="hesics-btn-secondary w-full py-2"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.36 7.37 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setAuthView('magic_link');
                  }}
                  className="w-full text-center text-[10px] text-[#606070] hover:text-[#9090A0] transition-colors py-1"
                >
                  Or email me a passwordless login link
                </button>
              </div>
            </form>
          )}

          {/* View 2: Password Reset */}
          {authView === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-3.5">
              <p className="text-[11px] text-[#808090]">
                Enter your authorized work email to receive password reset instructions.
              </p>
              <div>
                <label className="hesics-label">Work Email</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#505060]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@hesics.com"
                    className="hesics-input pl-9"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="hesics-btn-primary w-full py-2"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send Reset Link'}
              </button>
            </form>
          )}

          {/* View 3: Magic Link */}
          {authView === 'magic_link' && (
            <form onSubmit={handleMagicLink} className="space-y-3.5">
              <p className="text-[11px] text-[#808090]">
                We'll email you a one-click magic link to access your HESICS workspace.
              </p>
              <div>
                <label className="hesics-label">Work Email</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#505060]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@hesics.com"
                    className="hesics-input pl-9"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="hesics-btn-primary w-full py-2"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send Magic Link'}
              </button>
            </form>
          )}

        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-[#454555] space-y-1">
          <div>Authorized Organization Access Only</div>
          <div className="text-[#353545]">Accounts provisioned by workspace administrators</div>
        </div>

      </div>
    </div>
  );
};
