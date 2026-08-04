import React, { useState } from 'react';
import { ArrowRight, Lock, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { User } from '../lib/types';
import { db } from '../lib/supabase';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const users = db.getUsers();
  const [email, setEmail] = useState('');
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);

  const handleMagicLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // Check if email matches existing team member or login founder
    const matched = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (matched) {
      onLogin(matched);
    } else {
      setIsMagicLinkSent(true);
      // Log in demo founder
      setTimeout(() => {
        onLogin(users[0]);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-[#191919] flex items-center justify-center p-4 font-sans text-[#d4d4d4]">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-lg bg-[#2e2e2e] border border-[#3d3d3d] flex items-center justify-center font-display font-bold text-lg text-white mx-auto shadow-xl">
            H
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Hesics OS</h1>
          <p className="text-xs text-[#888888]">
            Business Operating System & Internal CRM
          </p>
        </div>

        {/* Auth Card */}
        <div className="notion-card p-6 space-y-5">
          {isMagicLinkSent ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-8 h-8 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-900/60 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-white">Magic Link Dispatched</h3>
              <p className="text-xs text-[#888888]">
                Check your inbox at <span className="text-white font-mono">{email}</span> to sign in.
              </p>
              <div className="text-[10px] text-[#666666] animate-pulse pt-2">
                Authenticating session...
              </div>
            </div>
          ) : (
            <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#888888] mb-1.5">
                  Sign in with Email (Magic Link)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hesicsaura.com"
                  className="w-full px-3 py-2 bg-[#191919] border border-[#2e2e2e] rounded-md text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#555555]"
                />
              </div>

              <button
                type="submit"
                className="w-full notion-button justify-center bg-[#FF6B00] hover:bg-[#ea580c] text-white font-semibold text-xs py-2 shadow-lg shadow-brand-500/10"
              >
                Send Magic Link <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          <div className="relative flex items-center justify-center border-t border-[#2a2a2a] pt-4">
            <span className="text-[10px] text-[#666666] uppercase font-semibold tracking-wider bg-[#202020] px-2 relative -top-6">
              Or Sign In As Team Member
            </span>
          </div>

          {/* Quick Demo Role Selector */}
          <div className="space-y-1.5 pt-1">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => onLogin(u)}
                className="w-full flex items-center justify-between p-2 rounded-md bg-[#191919] border border-[#282828] hover:border-[#383838] hover:bg-[#252525] transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={u.avatar_url}
                    alt={u.name}
                    className="w-6 h-6 rounded-full bg-[#333333]"
                  />
                  <div>
                    <div className="text-xs font-semibold text-white leading-none">{u.name}</div>
                    <div className="text-[10px] text-[#777777] mt-0.5">{u.email}</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#666666]" />
              </button>
            ))}
          </div>
        </div>

        {/* Security Footer */}
        <div className="text-center text-[10px] text-[#666666] flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3 text-[#555555]" />
          <span>PostgreSQL RLS & Permission Architecture</span>
        </div>
      </div>
    </div>
  );
};
