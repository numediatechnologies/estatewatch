import React, { useState } from 'react';
import { 
  Bell, 
  ShieldCheck, 
  Zap, 
  ChevronDown, 
  UserCheck, 
  FileSearch,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { UserRole } from '../types';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenSimulateModal: () => void;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenLoginModal: () => void;
  currentUser: any;
}

const ROLE_LABELS: Record<UserRole, { label: string; desc: string }> = {
  attorney: { label: 'Estate Attorney', desc: 'Fiduciary & Probate Legal Leads' },
  investor: { label: 'Property Investor', desc: 'Off-Market Probate Property Alerts' },
  tracer: { label: 'Heir & Asset Tracer', desc: 'Unclaimed Inheritance & Surname Matching' },
  funeral: { label: 'Funeral Home Services', desc: 'Timely Support & Memorial Cross-Sell' },
  debt_collector: { label: 'Debt Collector / Creditor', desc: 'Section 29 Claim Window Monitoring' },
  financial_advisor: { label: 'Financial Adviser / Insurer', desc: 'Policy and pension payout tracing' }
};

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  onOpenSimulateModal,
  unreadCount,
  onOpenNotifications,
  onOpenLoginModal,
  currentUser
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        
        {/* Brand Title & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg lg:text-xl tracking-tight text-white flex items-center gap-1.5">
                ESTATE<span className="text-amber-400 font-serif font-bold">WATCH</span> <span className="text-amber-400">👁️</span>
              </h1>
              <span className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                South African Gazette alerts
              </span>
            </div>
            <p className="text-[10px] font-semibold text-amber-300/80">by MarketDirect.co.za</p>
            <p className="text-xs text-slate-400 hidden sm:block">
              Clear estate notices. Practical alerts. A simple next step.
            </p>
          </div>
        </div>

        {/* Center Live Ingestion Ticker */}
        <div className="hidden xl:flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 rounded-full px-3.5 py-1.5 text-xs text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-slate-200">South African Gazette monitoring</span>
          <span className="text-slate-500">·</span>
          <span className="text-emerald-400">Verified notice details</span>
        </div>

        {/* Right Actions & Persona Selector */}
        <div className="flex items-center gap-2.5">
          
          {/* Quick Simulation Trigger Button */}
          {currentUser?.role === 'admin' && <button
            onClick={onOpenSimulateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-lg shadow-md shadow-amber-500/10 transition-all cursor-pointer"
            title="Simulate a new Gazette notice match to test alert delivery"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span className="hidden md:inline">Test Gazette Alert</span>
          </button>}

          {/* Persona Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 rounded-lg text-xs text-slate-200 transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <div className="text-left hidden sm:block">
                <span className="text-[10px] text-slate-400 block leading-none">Your view</span>
                <span className="font-semibold leading-tight block">{ROLE_LABELS[currentRole].label}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50">
                <div className="px-3 py-1.5 border-b border-slate-800 mb-1">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Choose your business view</p>
                  <p className="text-xs text-slate-500">See practical guidance suited to your work</p>
                </div>
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      onRoleChange(role);
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800/80 transition-colors ${
                      currentRole === role ? 'bg-amber-500/10 text-amber-400 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{ROLE_LABELS[role].label}</div>
                      <div className="text-[10px] text-slate-400">{ROLE_LABELS[role].desc}</div>
                    </div>
                    {currentRole === role && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Login Button */}
          <button
            onClick={onOpenLoginModal}
            aria-label={currentUser ? `Account: ${currentUser.name}` : 'Login to EstateWatch'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 rounded-lg text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="inline max-w-28 truncate">{currentUser ? currentUser.name : 'Login'}</span>
          </button>

          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[9px] leading-none flex items-center justify-center border-2 border-slate-900 shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* POPIA Status Pill */}
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 bg-emerald-950/60 border border-emerald-800/50 rounded-lg text-[11px] text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy protected</span>
          </div>

        </div>

      </div>
    </header>
  );
};
