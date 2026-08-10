import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Crown, Shield, UserCheck } from 'lucide-react';
import { User, UserHierarchy } from '../lib/types';
import { db } from '../lib/supabase';

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
    color: 'text-blue-400 bg-blue-950/40 border-blue-900/50',
    icon: <Shield className="w-3 h-3" />,
  },
  employee: {
    label: 'Employee',
    color: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50',
    icon: <UserCheck className="w-3 h-3" />,
  },
  intern: {
    label: 'Intern',
    color: 'text-slate-400 bg-slate-800/40 border-slate-700/50',
    icon: <UserCheck className="w-3 h-3" />,
  },
};

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const users = db.getUsers().filter((u) => u.is_active);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    const matched = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (matched) {
      onLogin(matched);
    } else {
      setError('No team member found with this email. Contact the Founder or Admin to get access.');
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4 font-sans text-[#d4d4d4]">
      <div className="w-full max-w-sm space-y-5">

        {/* Brand */}
        <div className="text-center space-y-2">
          {/* HESICS H-bracket logo mark */}
          <div className="w-12 h-12 rounded-xl bg-[#0d0d0d] border border-[#1E9EFF]/20 flex items-center justify-center mx-auto shadow-lg shadow-[#1E9EFF]/10">
            <svg width="28" height="22" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 2H7V10H13V2H18V20H13V13H7V20H2V2Z" fill="white"/>
              <path d="M20 2L24 2L24 20" stroke="#1E9EFF" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight font-display">HESICS</h1>
          <p className="text-[11px] text-[#444444]">Make It Simple.</p>
        </div>

        {/* Auth Card */}
        <div className="p-5 bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl space-y-5">

          {/* Email sign-in */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#666666] mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="you@hesics.com"
                className="w-full px-3 py-2 bg-[#080808] border border-[#1e1e1e] rounded-lg text-xs text-white placeholder-[#333333] focus:outline-none focus:border-[#1E9EFF]/40 transition-colors"
              />
              {error && (
                <p className="text-[10px] text-red-400 mt-1.5">{error}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1E9EFF] hover:bg-[#0A8AE6] text-white font-semibold text-xs rounded-lg transition-colors"
            >
              Sign In <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#161616]" />
            <span className="text-[10px] text-[#555555] uppercase font-semibold tracking-wider">or</span>
            <div className="flex-1 h-px bg-[#161616]" />
          </div>

          {/* Team Members */}
          <div>
            <p className="text-[10px] text-[#555555] uppercase font-semibold tracking-wider mb-2">
              Quick Sign In — Team Members
            </p>
            <div className="space-y-1.5">
              {users.map((u) => {
                const cfg = hierarchyConfig[u.hierarchy] || hierarchyConfig.intern;
                return (
                  <button
                    key={u.id}
                    onClick={() => onLogin(u)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#080808] border border-[#181818] hover:border-[#383838] hover:bg-[#111111] transition-all text-left group"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={u.avatar_url}
                        alt={u.name}
                        className="w-7 h-7 rounded-full bg-[#333333]"
                      />
                      <div>
                        <div className="text-xs font-semibold text-white leading-tight">{u.name}</div>
                        <div className="text-[10px] text-[#666666] mt-0.5">{u.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cfg.color}`}>
                        {cfg.icon}{cfg.label}
                      </span>
                      <ArrowRight className="w-3 h-3 text-[#444444] group-hover:text-[#888888] transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-[#555555] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3 h-3" />
          <span>Permission-based RBAC · Hierarchy-controlled access</span>
        </div>
      </div>
    </div>
  );
};
