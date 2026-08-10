import React, { useState, useEffect } from 'react';
import {
  ArrowRight, ShieldCheck, Crown, Shield, UserCheck,
  Mail, CheckCircle2, Loader2, AlertCircle
} from 'lucide-react';
import { User, UserHierarchy } from '../lib/types';
import { db, isSupabaseConfigured } from '../lib/supabase';
import { sendMagicLink, onAuthStateChange } from '../lib/auth';

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

type LoginState = 'idle' | 'sending' | 'sent' | 'error';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const users = db.getUsers().filter((u) => u.is_active);
  const [email, setEmail] = useState('');
  const [loginState, setLoginState] = useState<LoginState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Listen for Supabase auth state changes (magic link click)
  useEffect(() => {
    const unsub = onAuthStateChange((user) => {
      if (user) onLogin(user);
    });
    return unsub;
  }, [onLogin]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // In demo mode (no Supabase), try to find user by email directly
    if (!isSupabaseConfigured) {
      const matched = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (matched) {
        onLogin(matched);
        return;
      }
      setErrorMsg('No team member found with this email. Ask the Founder to add you.');
      setLoginState('error');
      return;
    }

    // Real Supabase magic-link flow
    setLoginState('sending');
    const err = await sendMagicLink(email);
    if (err) {
      setErrorMsg(err);
      setLoginState('error');
    } else {
      setLoginState('sent');
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-4 font-sans">

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#1E9EFF]/4 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-[360px] space-y-6 relative z-10">

        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#0d0d0d] border border-[#1E9EFF]/25 flex items-center justify-center mx-auto shadow-2xl shadow-[#1E9EFF]/10">
            <svg width="32" height="25" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 2H7V10H13V2H18V20H13V13H7V20H2V2Z" fill="white"/>
              <path d="M20 2L24 2L24 20" stroke="#1E9EFF" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-display">HESICS</h1>
            <p className="text-[11px] text-[#444444] mt-0.5 tracking-widest uppercase font-medium">Make It Simple.</p>
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
                <h3 className="text-sm font-bold text-white">Check your inbox</h3>
                <p className="text-[11px] text-[#666666] mt-1">
                  Magic link sent to <span className="text-white font-mono">{email}</span>
                </p>
                <p className="text-[10px] text-[#444444] mt-2">Click the link to sign in. It expires in 1 hour.</p>
              </div>
              <button
                onClick={() => { setLoginState('idle'); setEmail(''); }}
                className="text-[11px] text-[#666666] hover:text-white transition-colors underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              {/* Email form */}
              <form onSubmit={handleMagicLink} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#555555] mb-1.5">
                    {isSupabaseConfigured ? 'Sign in with Magic Link' : 'Work Email'}
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
                      className="w-full px-3 py-2.5 bg-[#080808] border border-[#1e1e1e] rounded-lg text-xs text-white placeholder-[#333333] focus:outline-none focus:border-[#1E9EFF]/40 transition-colors pr-9"
                    />
                    <Mail className="absolute right-3 top-2.5 w-3.5 h-3.5 text-[#333333]" />
                  </div>
                  {loginState === 'error' && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                      <p className="text-[10px] text-red-400">{errorMsg}</p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loginState === 'sending'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1E9EFF] hover:bg-[#0A8AE6] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg transition-colors"
                >
                  {loginState === 'sending' ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending link...</>
                  ) : isSupabaseConfigured ? (
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
                  {isSupabaseConfigured ? 'or sign in as' : 'quick access'}
                </span>
                <div className="flex-1 h-px bg-[#161616]" />
              </div>

              {/* Team member quick select */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-[#444444] uppercase font-semibold tracking-wider mb-2">Team</p>
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
            {isSupabaseConfigured
              ? 'Supabase Auth · PostgreSQL RLS · Permission-gated access'
              : 'Demo mode · Connect Supabase for real auth'}
          </span>
        </div>

        {/* Connection status pill */}
        <div className={`mx-auto w-fit flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
          isSupabaseConfigured
            ? 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40'
            : 'text-[#555555] bg-[#111111] border-[#1a1a1a]'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-[#444444]'}`} />
          {isSupabaseConfigured ? 'Live Supabase connected' : 'Local demo mode'}
        </div>
      </div>
    </div>
  );
};
