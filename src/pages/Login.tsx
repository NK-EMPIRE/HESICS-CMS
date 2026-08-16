import React, { useState, useEffect } from 'react';
import {
  ArrowRight, ShieldCheck, Crown, Shield, UserCheck,
  Mail, CheckCircle2, Loader2, AlertCircle, Lock, Sparkles
} from 'lucide-react';
import { User, UserHierarchy } from '../lib/types';
import { db } from '../lib/firebaseDb';
import { isFirebaseConfigured } from '../lib/firebase';
import {
  signInWithPassword,
  signInWithGoogle,
  sendEmailLink,
  completeEmailLinkSignIn,
  onAuthStateChange
} from '../lib/firebaseAuth';

interface LoginProps {
  onLogin: (user: User) => void;
}

const hierarchyConfig: Record<UserHierarchy, { label: string; color: string; icon: React.ReactNode }> = {
  founder: {
    label: 'Founder',
    color: 'text-amber-400 bg-amber-950/40 border-amber-900/50',
    icon: <Crown className="w-3 h-3" />,
  },
  admin: {
    label: 'Admin',
    color: 'text-[#1E9EFF] bg-[#1E9EFF]/10 border-[#1E9EFF]/30',
    icon: <Shield className="w-3 h-3" />,
  },
  employee: {
    label: 'Employee',
    color: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50',
    icon: <UserCheck className="w-3 h-3" />,
  },
  intern: {
    label: 'Intern',
    color: 'text-slate-500 bg-slate-900/40 border-slate-800/50',
    icon: <UserCheck className="w-3 h-3" />,
  },
};

type LoginMode = 'password' | 'magic_link';
type LoginState = 'idle' | 'loading' | 'sent' | 'error';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const users = db.getUsers().filter((u) => u.is_active);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<LoginMode>('password');
  const [loginState, setLoginState] = useState<LoginState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Check email link sign in on load
  useEffect(() => {
    completeEmailLinkSignIn().then((user) => {
      if (user) onLogin(user);
    });

    const unsub = onAuthStateChange((user) => {
      if (user) onLogin(user);
    });
    return unsub;
  }, [onLogin]);

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoginState('loading');
    setErrorMsg('');

    const res = await signInWithPassword(email, password);
    if (res.error) {
      setErrorMsg(res.error);
      setLoginState('error');
    } else if (res.user) {
      onLogin(res.user);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoginState('loading');
    setErrorMsg('');

    const res = await sendEmailLink(email);
    if (res.error) {
      setErrorMsg(res.error);
      setLoginState('error');
    } else {
      setLoginState('sent');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoginState('loading');
    setErrorMsg('');
    const res = await signInWithGoogle();
    if (res.error) {
      setErrorMsg(res.error);
      setLoginState('error');
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

      <div className="w-full max-w-[380px] space-y-6 relative z-10">

        {/* HESICS Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#0d0d0d] border border-[#1E9EFF]/25 flex items-center justify-center mx-auto shadow-2xl shadow-[#1E9EFF]/10">
            <svg width="32" height="25" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 2H7V10H13V2H18V20H13V13H7V20H2V2Z" fill="white"/>
              <path d="M20 2L24 2L24 20" stroke="#1E9EFF" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-display">HESICS</h1>
            <p className="text-[11px] text-[#555555] mt-0.5 tracking-widest uppercase font-semibold">Business OS</p>
            <p className="text-[10px] text-[#333333] mt-0.5">Make It Simple.</p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-5 space-y-5 shadow-2xl">

          {loginState === 'sent' ? (
            /* Magic link sent state */
            <div className="py-4 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#1E9EFF]/10 border border-[#1E9EFF]/30 flex items-center justify-center mx-auto">
                <Mail className="w-5 h-5 text-[#1E9EFF]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Check your email</h3>
                <p className="text-[11px] text-[#666666] mt-1">
                  Login link sent to <span className="text-white font-mono">{email}</span>
                </p>
                <p className="text-[10px] text-[#444444] mt-2">Click the link in your email to authenticate securely.</p>
              </div>
              <button
                onClick={() => { setLoginState('idle'); setEmail(''); }}
                className="text-[11px] text-[#666666] hover:text-white transition-colors underline"
              >
                Use a different email or password
              </button>
            </div>
          ) : (
            <>
              {/* Mode Switcher */}
              <div className="flex items-center justify-between border-b border-[#161616] pb-3">
                <span className="text-[11px] font-semibold text-white">Sign In to Workspace</span>
                <button
                  type="button"
                  onClick={() => setMode(mode === 'password' ? 'magic_link' : 'password')}
                  className="text-[10px] text-[#1E9EFF] hover:underline transition-colors"
                >
                  {mode === 'password' ? 'Use Magic Link' : 'Use Password'}
                </button>
              </div>

              {/* Google Sign In Button */}
              {isFirebaseConfigured && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loginState === 'loading'}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-[#111111] hover:bg-[#161616] border border-[#1e1e1e] text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Continue with Google
                </button>
              )}

              {isFirebaseConfigured && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#161616]" />
                  <span className="text-[10px] text-[#444444] uppercase font-semibold">or email</span>
                  <div className="flex-1 h-px bg-[#161616]" />
                </div>
              )}

              {/* Form */}
              <form onSubmit={mode === 'password' ? handlePasswordSignIn : handleMagicLink} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#555555] mb-1.5">
                    Work Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (loginState === 'error') setLoginState('idle');
                      }}
                      placeholder="you@hesics.com"
                      className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-xs text-white placeholder-[#333333] focus:outline-none focus:border-[#1E9EFF]/40 transition-colors pr-9"
                    />
                    <Mail className="absolute right-3 top-2.5 w-3.5 h-3.5 text-[#333333]" />
                  </div>
                </div>

                {mode === 'password' && (
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#555555] mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required={isFirebaseConfigured}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (loginState === 'error') setLoginState('idle');
                        }}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-xs text-white placeholder-[#333333] focus:outline-none focus:border-[#1E9EFF]/40 transition-colors pr-9"
                      />
                      <Lock className="absolute right-3 top-2.5 w-3.5 h-3.5 text-[#333333]" />
                    </div>
                  </div>
                )}

                {loginState === 'error' && (
                  <div className="flex items-center gap-1.5 p-2.5 bg-red-950/30 border border-red-900/40 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <p className="text-[10px] text-red-400 leading-tight">{errorMsg}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginState === 'loading'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1E9EFF] hover:bg-[#0A8AE6] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg transition-colors shadow-lg shadow-[#1E9EFF]/10"
                >
                  {loginState === 'loading' ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Authenticating...</>
                  ) : mode === 'magic_link' ? (
                    <><Mail className="w-3.5 h-3.5" /> Send Magic Link</>
                  ) : (
                    <>Sign In <ArrowRight className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#161616]" />
                <span className="text-[10px] text-[#444444] uppercase font-semibold tracking-wider whitespace-nowrap">
                  team direct access
                </span>
                <div className="flex-1 h-px bg-[#161616]" />
              </div>

              {/* Team member quick select */}
              <div className="space-y-1.5">
                {users.map((u) => {
                  const cfg = hierarchyConfig[u.hierarchy] || hierarchyConfig.intern;
                  return (
                    <button
                      key={u.id}
                      onClick={() => onLogin(u)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#0a0a0a] border border-[#141414] hover:border-[#222222] hover:bg-[#111111] transition-all text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.avatar_url}
                          alt={u.name}
                          className="w-7 h-7 rounded-full bg-[#1a1a1a]"
                        />
                        <div>
                          <div className="text-xs font-semibold text-white leading-tight">{u.name}</div>
                          <div className="text-[10px] text-[#444444] mt-0.5">{u.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cfg.color}`}>
                          {cfg.icon}{cfg.label}
                        </span>
                        <ArrowRight className="w-3 h-3 text-[#333333] group-hover:text-[#666666] transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-[#3a3a3a] flex items-center justify-center gap-2">
          <ShieldCheck className="w-3 h-3" />
          <span>
            {isFirebaseConfigured
              ? 'Firebase Auth · Cloud Firestore · Production Security'
              : 'Local Engine Active · Connect Firebase in .env'}
          </span>
        </div>

        {/* Connection status pill */}
        <div className={`mx-auto w-fit flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
          isFirebaseConfigured
            ? 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40'
            : 'text-[#555555] bg-[#111111] border-[#1a1a1a]'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isFirebaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-[#444444]'}`} />
          {isFirebaseConfigured ? 'Live Firebase & Firestore Connected' : 'Production Engine Ready (Local State Active)'}
        </div>
      </div>
    </div>
  );
};
