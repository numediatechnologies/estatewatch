import React from 'react';
import {
  LayoutDashboard,
  FileText,
  BellRing,
  Briefcase,
  Cpu,
  ShieldCheck,
  CreditCard,
  Building2,
  Sparkles,
  HelpCircle,
  Bot
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'estates'
  | 'alerts'
  | 'pipeline'
  | 'ingestion'
  | 'admin'
  | 'popia'
  | 'billing';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  matchesCount: number;
  pipelineCount: number;
  isAdmin: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  matchesCount,
  pipelineCount,
  isAdmin,
}) => {
  const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'estates', label: 'Estate notices', icon: <FileText className="w-4 h-4" />, badge: matchesCount },
    { id: 'alerts', label: 'Set an alert', icon: <BellRing className="w-4 h-4" /> },
    { id: 'pipeline', label: 'Saved opportunities', icon: <Briefcase className="w-4 h-4" />, badge: pipelineCount },
    ...(isAdmin ? [{ id: 'ingestion' as TabType, label: 'Admin Ingestion', icon: <Cpu className="w-4 h-4" /> }] : []),
    { id: 'popia', label: 'POPIA & Legal Basis', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'billing', label: 'Subscription & Plans', icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-full lg:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
      <div className="p-3 lg:p-4 space-y-6">

        {/* Navigation Group */}
        <div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2 px-3">
            Your tools
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-amber-400' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Feature Highlight / Value Proposition Box */}
        <div className="hidden lg:block bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>Why EstateWatch?</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            We help you spot relevant deceased-estate notices and take a clear next step.
          </p>
          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>Alerts sent by:</span>
            <span className="text-emerald-400 font-semibold">Email, with optional SMS</span>
          </div>
        </div>

      </div>

      {/* Footer Info */}
      <div className="p-3 lg:p-4 border-t border-slate-800/80 bg-slate-950/40 text-xs text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-[11px] text-slate-400">South African Gazette monitoring</span>
        </div>
        <a
          href="#popia"
          onClick={(e) => { e.preventDefault(); onTabChange('popia'); }}
          className="text-[11px] text-amber-400/80 hover:text-amber-400 hover:underline"
        >
          Privacy information
        </a>
      </div>
    </aside>
  );
};
