import React, { useState } from 'react';
import { UserAccount, SystemRole, UserRole } from '../types';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  KeyRound, 
  UserCheck, 
  Sparkles, 
  CheckCircle2, 
  X, 
  ArrowRight,
  ShieldAlert,
  Bot
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onLogin: (account: UserAccount) => void;
  onLogout: () => void;
}

export const DEMO_ADMIN: UserAccount = {
  id: 'usr-admin-01',
  email: 'admin@estatewatch.co.za',
  name: 'Sarah Jenkins (Admin)',
  role: 'admin',
  userPersona: 'attorney',
};

export const DEMO_USER: UserAccount = {
  id: 'usr-user-01',
  email: 'investor@estatewatch.co.za',
  name: 'Marcus Vance (Subscriber)',
  role: 'user',
  userPersona: 'investor',
};

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout
}) => {
  const [activeRoleTab, setActiveRoleTab] = useState<SystemRole>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<UserRole>('attorney');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const accountName = email ? email.split('@')[0] : (activeRoleTab === 'admin' ? 'System Administrator' : 'Verified Subscriber');
    onLogin({
      id: `usr-${Date.now()}`,
      email: email || (activeRoleTab === 'admin' ? 'admin@estatewatch.co.za' : 'user@estatewatch.co.za'),
      name: accountName,
      role: activeRoleTab,
      userPersona: selectedPersona
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Top Glow Accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Close */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              EstateWatch Portal Access
            </h2>
            <p className="text-xs text-slate-400">
              Sign in to manage alerts, CRM leads, or launch the Admin Scraper
            </p>
          </div>
        </div>

        {/* Current User Status if logged in */}
        {currentUser ? (
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  currentUser.role === 'admin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                }`}>
                  {currentUser.role === 'admin' ? 'ADM' : 'USR'}
                </div>
                <div>
                  <div className="font-bold text-sm text-white">{currentUser.name}</div>
                  <div className="text-xs text-slate-400">{currentUser.email}</div>
                </div>
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${
                currentUser.role === 'admin' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              }`}>
                {currentUser.role === 'admin' ? 'Administrator' : 'Standard User'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span>Persona View: <strong className="text-slate-200 uppercase">{currentUser.userPersona}</strong></span>
              <button 
                onClick={onLogout}
                className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Quick Demo Switcher Presets */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick One-Click Demo Sign-In
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onLogin(DEMO_USER);
                    onClose();
                  }}
                  className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/50 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-blue-400 group-hover:text-blue-300 mb-0.5">
                    <span>User Login</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[11px] font-medium text-slate-200">{DEMO_USER.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">Subscriber • Feeds & Alerts</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onLogin(DEMO_ADMIN);
                    onClose();
                  }}
                  className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400 group-hover:text-amber-300 mb-0.5">
                    <span>Admin Login</span>
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-[11px] font-medium text-slate-200">{DEMO_ADMIN.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">Admin • Scraper & OCR + AI</div>
                </button>
              </div>
            </div>

            {/* Custom Credentials Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Role Toggle Tabs */}
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveRoleTab('user')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeRoleTab === 'user' 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Standard User</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRoleTab('admin')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeRoleTab === 'admin' 
                      ? 'bg-amber-500 text-slate-950 shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Admin User</span>
                </button>
              </div>

              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder={activeRoleTab === 'admin' ? 'admin@estatewatch.co.za' : 'user@estatewatch.co.za'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Persona selection */}
              {activeRoleTab === 'user' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Default Persona View</label>
                  <select
                    value={selectedPersona}
                    onChange={(e) => setSelectedPersona(e.target.value as UserRole)}
                    className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="attorney">Estate Attorney</option>
                    <option value="investor">Property Investor</option>
                    <option value="tracer">Heir & Asset Tracer</option>
                    <option value="debt_collector">Debt Collector</option>
                    <option value="financial_advisor">Financial Advisor</option>
                  </select>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className={`w-full py-3 rounded-xl font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                  activeRoleTab === 'admin'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Sign In as {activeRoleTab === 'admin' ? 'Administrator' : 'User'}</span>
              </button>

            </form>
          </>
        )}

      </div>
    </div>
  );
};
