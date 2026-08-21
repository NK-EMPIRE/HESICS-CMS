import React, { useState, useEffect } from 'react';
import {
  ArrowRight, ShieldCheck, Mail, CheckCircle2, Loader2, AlertCircle,
  Lock, User as UserIcon, Sparkles, KeyRound, ArrowLeft
} from 'lucide-react';
import { User, UserHierarchy } from '../lib/types';
import { isFirebaseConfigured } from '../lib/firebase';
import {
  signInWithPassword,
  signUpWithPassword,
  sendPasswordReset,
  signInWithGoogle,
  sendEmailLink,
  completeEmailLinkSignIn,
  onAuthStateChange
} from '../lib/firebaseAuth';

interface LoginProps {
  onLogin: (user: User) => void;
}

type AuthView = 'signin' | 'signup' | 'forgot_password' | 'magic_link';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [authView, setAuthView] = useState<AuthView>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hierarchy, setHierarchy] = useState<UserHierarchy>('employee');
  const [department, setDepartment] = useState('Operations');

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
      setErrorMsg('Please enter both your email and password.');
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim() || !password.trim()) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    clearMessages();

    const res = await signUpWithPassword(name, email, password, hierarchy, department);
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
      setErrorMsg('Please enter your email address.');
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#1E9EFF]/5 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-[390px] space-y-6 relative z-10">

        {/* HESICS Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="w-14 h-14 rounded-2xl bg-[#0d0d0d] border border-[#1E9EFF]/25 flex items-center justify-center mx-auto shadow-2xl shadow-[#1E9EFF]/10">
            <svg width="32" height="25" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 2H7V10H13V2H18V20H13V13H7V20H2V2Z" fill="white"/>
              <path d="M20 2L24 2L24 20" stroke="#1E9EFF" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-display">HESICS</h1>
            <p className="text-[10px] text-[#555555] mt-0.5 tracking-widest uppercase font-semibold">Business OS</p>
            <p className="text-[10px] text-[#444444]">Make It Simple.</p>
          </div>
        </div>

        {/* Main Auth Card */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6 space-y-5 shadow-2xl">

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center justify-between border-b border-[#161616] pb-3 text-xs">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => { setAuthView('signin'); clearMessages(); }}
                className={`font-semibold transition-colors relative py-1 ${authView === 'signin' ? 'text-[#1E9EFF]' : 'text-[#666666] hover:text-white'}`}
              >
                Sign In
                {authView === 'signin' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E9EFF] rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => { setAuthView('signup'); clearMessages(); }}
                className={`font-semibold transition-colors relative py-1 ${authView === 'signup' ? 'text-[#1E9EFF]' : 'text-[#666666] hover:text-white'}`}
              >
                Create Account
                {authView === 'signup' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E9EFF] rounded-full" />
                )}
              </button>
            </div>

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
          {isFirebaseConfigured && authView !== 'forgot_password' && (
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
            <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-900/40 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-[11px] text-red-400 leading-tight">{errorMsg}</p>
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-950/30 border border-emerald-900/40 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
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

              <div className="flex items-center justify-between pt-1">
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

          {/* View 2: Sign Up / Register Team Member */}
          {authView === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#555555] mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearMessages(); }}
                    placeholder="e.g. Peer Sheik Mydeen"
                    className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-xs text-white placeholder-[#333333] focus:outline-none focus:border-[#1E9EFF]/40 transition-colors pr-9"
                  />
                  <UserIcon className="absolute right-3 top-2.5 w-3.5 h-3.5 text-[#333333]" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#555555] mb-1">
                  Work Email *
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
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#555555] mb-1">
                  Create Password *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearMessages(); }}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-xs text-white placeholder-[#333333] focus:outline-none focus:border-[#1E9EFF]/40 transition-colors pr-9"
                  />
                  <Lock className="absolute right-3 top-2.5 w-3.5 h-3.5 text-[#333333]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#555555] mb-1">
                    Role Tier
                  </label>
                  <select
                    value={hierarchy}
                    onChange={(e) => setHierarchy(e.target.value as UserHierarchy)}
                    className="w-full px-2.5 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-xs text-white focus:outline-none focus:border-[#1E9EFF]/40"
                  >
                    <option value="founder">Founder</option>
                    <option value="admin">Admin</option>
                    <option value="employee">Employee</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#555555] mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Operations, Sales..."
                    className="w-full px-2.5 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-xs text-white focus:outline-none focus:border-[#1E9EFF]/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1E9EFF] hover:bg-[#0A8AE6] disabled:opacity-60 text-white font-semibold text-xs rounded-lg transition-colors shadow-lg shadow-[#1E9EFF]/10 mt-2"
              >
                {loading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating Account...</>
                ) : (
                  <>Create Account <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </form>
          )}

          {/* View 3: Forgot Password */}
          {authView === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-3.5">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#1E9EFF]" /> Reset Password
                </h3>
                <p className="text-[11px] text-[#666666]">
                  Enter your registered work email to receive a password reset link.
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

          {/* View 4: Magic Link */}
          {authView === 'magic_link' && (
            <form onSubmit={handleMagicLink} className="space-y-3.5">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#1E9EFF]" /> Passwordless Magic Link
                </h3>
                <p className="text-[11px] text-[#666666]">
                  Receive a secure instant sign-in link directly in your inbox.
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
        </div>

        {/* Security badge & status */}
        <div className="text-center text-[10px] text-[#3a3a3a] flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#1E9EFF]" />
          <span>Firebase Authentication & Role-Based Access Control</span>
        </div>

        <div className="mx-auto w-fit flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border text-emerald-400 bg-emerald-950/30 border-emerald-900/40">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Firebase Production Authentication Active</span>
        </div>

      </div>
    </div>
  );
};
