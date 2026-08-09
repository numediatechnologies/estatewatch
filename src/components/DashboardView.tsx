import React from 'react';
import { 
  DeceasedEstate, 
  AlertCriteria, 
  PipelineItem, 
  UserRole 
} from '../types';
import { 
  BellRing, 
  FileText, 
  Briefcase, 
  TrendingUp, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  MapPin, 
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Plus
} from 'lucide-react';

interface DashboardViewProps {
  currentRole: UserRole;
  estates: DeceasedEstate[];
  alerts: AlertCriteria[];
  pipeline: PipelineItem[];
  onSelectEstate: (estate: DeceasedEstate) => void;
  onNavigateToTab: (tab: any) => void;
  onOpenSimulateModal: () => void;
  isAdmin?: boolean;
}

const ROLE_RECOMMENDATIONS: Record<UserRole, { title: string; strategy: string; focus: string }> = {
  attorney: {
    title: 'Find relevant estate opportunities',
    strategy: 'Monitor surnames and Master’s Office areas relevant to your practice, then verify the published representative and claim period.',
    focus: 'Evidence available: J193 deceased details, representative, address, office and claim period.'
  },
  investor: {
    title: 'Research estate opportunities responsibly',
    strategy: 'Monitor relevant surnames and provinces, then conduct separate lawful property research after reviewing the Gazette record.',
    focus: 'J193 does not reliably identify property or estate value.'
  },
  tracer: {
    title: 'Trace possible heirs and inheritances',
    strategy: 'Set surname alerts across selected provinces and review spouse, address and representative fields from the source notice.',
    focus: 'Top Target: Estate notices with missing executor details or out-of-province death notices.'
  },
  funeral: {
    title: 'Monitor notices in your service area',
    strategy: 'Monitor local Master’s Office areas and use published dates without assuming immediate publication after death.',
    focus: 'Top Target: Recent Section 29 notices in your local district.'
  },
  debt_collector: {
    title: 'Track creditor claim periods',
    strategy: '30-day statutory window starts on Gazette publication date. Ensure all outstanding debts are formally lodged with executor before distribution.',
    focus: 'Top Target: Section 29 notices published in the last 7 days.'
  },
  financial_advisor: {
    title: 'Trace possible policy and pension matters',
    strategy: 'Use surname and province alerts, then verify policy or pension relationships through appropriate private records.',
    focus: 'J193 does not publish reliable estate value or financial-product holdings.'
  }
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentRole,
  estates,
  alerts,
  pipeline,
  onSelectEstate,
  onNavigateToTab,
  onOpenSimulateModal,
  isAdmin = false,
}) => {
  const totalPipelineValue = pipeline.reduce((acc, item) => acc + (item.valueEstimate || 0), 0);
  const activeAlertsCount = alerts.filter(a => a.isActive).length;
  const recentMatches = estates.slice(0, 5);

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Strategy Box */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Built for your work
              </span>
              <span className="text-xs text-slate-400">• Verified J193 fields</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {ROLE_RECOMMENDATIONS[currentRole].title}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {ROLE_RECOMMENDATIONS[currentRole].strategy}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && <button
              onClick={onOpenSimulateModal}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4 fill-current" />
              Test Gazette Alert Run
            </button>}
            <button
              onClick={() => onNavigateToTab('alerts')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              Create Alert
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Monitored Alerts</span>
            <BellRing className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{activeAlertsCount}</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 pt-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified email matching</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Gazette Matches Today</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{estates.length}</div>
          <div className="text-[11px] text-slate-400 pt-1">
            <span>Available Gazette notices</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Pipeline Deals Value</span>
            <Briefcase className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">
            R {totalPipelineValue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 pt-1">
            <span>{pipeline.length} saved estate leads</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Notice checks</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400 tracking-tight">Verified fields</div>
          <div className="text-[11px] text-slate-400 pt-1">
            <span>Unclear records held for review</span>
          </div>
        </div>

      </div>

      {/* Main Grid: Recent Gazette Matches + Active Alert Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Live Gazette Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              Recent Gazette Deceased Estate Notices
            </h3>
            <button
              onClick={() => onNavigateToTab('estates')}
              className="text-xs text-amber-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              View all notices ({estates.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentMatches.map((estate) => (
              <div
                key={estate.id}
                onClick={() => onSelectEstate(estate)}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 transition-all hover:bg-slate-800/50 cursor-pointer space-y-3 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                        {estate.province}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{estate.estateNumber}</span>
                      {estate.hasProperty && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40 flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> Property Asset
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                      {estate.deceasedName}
                    </h4>
                  </div>

                  <span className="text-xs font-bold text-amber-400 shrink-0 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                    {estate.valueBand}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 italic bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                  "{estate.rawNoticeSnippet}"
                </p>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {estate.district}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Executor: <span className="text-slate-300 font-medium">{estate.executorName}</span>
                  </span>
                  <span className="text-amber-400 font-semibold group-hover:underline text-[11px] flex items-center gap-1">
                    View Card
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Active Alert Criteria & Channel Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BellRing className="w-4 h-4 text-amber-400" />
              Active Alert Rules
            </h3>
            <button
              onClick={() => onNavigateToTab('alerts')}
              className="text-xs text-amber-400 hover:underline font-semibold cursor-pointer"
            >
              Manage ({alerts.length})
            </button>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">{alert.name}</span>
                  <span className={`w-2 h-2 rounded-full ${alert.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                </div>

                <div className="text-[11px] text-slate-400 space-y-1">
                  <div>Provinces: <strong className="text-slate-200">{alert.provinces.join(', ')}</strong></div>
                  <div>Value: <strong className="text-amber-400">{alert.valueBands.join(' | ')}</strong></div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                  <span>Matches triggered: <strong className="text-white">{alert.matchCount}</strong></span>
                  <div className="flex items-center gap-1">
                    {alert.channels.map(c => (
                      <span key={c} className="uppercase px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 font-bold text-[9px]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <MessageSquare className="w-4 h-4" />
              Verified email alerts enabled
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Alerts are sent after a parsed Gazette record matches an active surname or province rule. Each email links to the exact online record.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
