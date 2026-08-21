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
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-4 font-sans selection:bg-[#1E9EFF]/20">

      {/* Ambient electric blue glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#1E9EFF]/5 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-[380px] space-y-5 relative z-10">

        {/* HESICS Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#0a0a0a] border border-[#1E9EFF]/30 flex items-center justify-center mx-auto shadow-2xl shadow-[#1E9EFF]/15 overflow-hidden p-2">
            <HesicsLogo size={48} variant="glow" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-display">HESICS</h1>
            <p className="text-[10px] text-[#555555] mt-0.5 tracking-widest uppercase font-semibold">Business OS</p>
            <p className="text-[10px] text-[#444444]">Make It Simple.</p>
          </div>
        </div>

        {/* Main Auth Card */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6 space-y-4 shadow-2xl">

          {/* Header row */}
          <div className="flex items-center justify-between border-b border-[#161616] pb-3 text-xs">
            <span className="font-semibold text-white">
              {authView === 'signin' && 'Sign in to your Organization'}
              {authView === 'forgot_password' && 'Reset Password'}
              {authView === 'magic_link' && 'Passwordless Sign In'}
            </span>

            {authView !== 'signin' && (
              <button
                type="button"
                onClick={() => { setAuthView('signin'); clearMessages(); }}
                className="text-[10px] text-[#888888] hover:text-white flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            )}
          </div>

          {/* One-Click Google Sign-In */}
          {isFirebaseConfigured && authView === 'signin' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-[#121212] hover:bg-[#181818] border border-[#1e1e1e] hover:border-[#333333] text-white text-xs font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#161616]" />
                <span className="text-[10px] text-[#444444] uppercase font-semibold">or email</span>
                <div className="flex-1 h-px bg-[#161616]" />
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-900/40 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-400 leading-tight">{errorMsg}</p>
            </div>
          )}
          {successMsg && (
            <div className="flex items-start gap-2 p-3 bg-emerald-950/30 border border-emerald-900/40 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-400 leading-tight">{successMsg}</p>
            </div>
          )}

          {/* View 1: Sign In with Email & Password */}
          {authView === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#555555] mb-1">
                  Work Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearMessages(); }}
                    placeholder="name@hesics.com"
                    className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-xs text-white placeholder-[#333333] focus:outline-none focus:border-[#1E9EFF]/40 transition-colors pr-9"
                  />
                  <Mail className="absolute right-3 top-2.5 w-3.5 h-3.5 text-[#333333]" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[#555555]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setAuthView('forgot_password'); clearMessages(); }}
                    className="text-[10px] text-[#1E9EFF] hover:underline"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearMessages(); }}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-xs text-white placeholder-[#333333] focus:outline-none focus:border-[#1E9EFF]/40 transition-colors pr-9"
                  />
                  <Lock className="absolute right-3 top-2.5 w-3.5 h-3.5 text-[#333333]" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <button
                  type="button"
                  onClick={() => { setAuthView('magic_link'); clearMessages(); }}
                  className="text-[10px] text-[#666666] hover:text-[#aaaaaa] transition-colors"
                >
                  Sign in with Magic Link →
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1E9EFF] hover:bg-[#0A8AE6] disabled:opacity-60 text-white font-semibold text-xs rounded-lg transition-colors shadow-lg shadow-[#1E9EFF]/10"
              >
                {loading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Authenticating...</>
                ) : (
                  <>Sign In <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </form>
          )}

          {/* View 2: Forgot Password */}
          {authView === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-3.5">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#1E9EFF]" /> Reset Password
                </h3>
                <p className="text-[11px] text-[#666666]">
                  Enter your registered work email to receive a secure password reset link.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#555555] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearMessages(); }}
                    placeholder="name@hesics.com"
                    className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-xs text-white placeholder-[#333333] focus:outline-none focus:border-[#1E9EFF]/40 transition-colors pr-9"
                  />
                  <Mail className="absolute right-3 top-2.5 w-3.5 h-3.5 text-[#333333]" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1E9EFF] hover:bg-[#0A8AE6] disabled:opacity-60 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                {loading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                ) : (
                  <>Send Reset Email <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </form>
          )}

          {/* View 3: Magic Link */}
          {authView === 'magic_link' && (
            <form onSubmit={handleMagicLink} className="space-y-3.5">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#1E9EFF]" /> Passwordless Magic Link
                </h3>
                <p className="text-[11px] text-[#666666]">
                  Receive an instant sign-in link in your registered inbox.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#555555] mb-1">
                  Work Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearMessages(); }}
                    placeholder="name@hesics.com"
                    className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-xs text-white placeholder-[#333333] focus:outline-none focus:border-[#1E9EFF]/40 transition-colors pr-9"
                  />
                  <Mail className="absolute right-3 top-2.5 w-3.5 h-3.5 text-[#333333]" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1E9EFF] hover:bg-[#0A8AE6] disabled:opacity-60 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                {loading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending Link...</>
                ) : (
                  <>Send Magic Link <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </form>
          )}

          {/* Admin Managed Note */}
          <div className="p-3 bg-[#0a0a0a] border border-[#161616] rounded-xl flex items-start gap-2.5">
            <Building2 className="w-4 h-4 text-[#555555] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#555555] leading-relaxed">
              <strong className="text-[#888888]">Invitation Only:</strong> New accounts can only be provisioned by organization administrators. Contact your admin if you need access.
            </p>
          </div>
        </div>

        {/* Security badge & status */}
        <div className="text-center text-[10px] text-[#3a3a3a] flex items-center justify-center gap-2">
          <ShieldCheck className="w-3 h-3 text-[#1E9EFF]" />
          <span>Firebase Authentication & Admin-Controlled Provisioning</span>
        </div>

      </div>
    </div>
  );
};