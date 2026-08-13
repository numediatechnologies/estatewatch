import React, { useState } from 'react';
import { PipelineItem, PipelineStage } from '../types';
import { 
  Briefcase, 
  Trash2, 
  Plus, 
  ArrowRight, 
  Building2, 
  Phone, 
  Mail, 
  Download, 
  CheckCircle2, 
  Calendar,
  FileText,
  Tag
  ,ArrowUpDown
} from 'lucide-react';

interface PipelineCrmViewProps {
  pipeline: PipelineItem[];
  isSignedIn: boolean;
  onRequestSignIn: () => void;
  onUpdateStage: (itemId: string, newStage: PipelineStage) => void;
  onUpdateNotes: (itemId: string, notes: string, estimate?: number, followUpAt?: string | null) => void;
  onRemoveItem: (itemId: string) => void;
  onSelectEstateModal: (estate: any) => void;
}

const STAGES: { id: PipelineStage; label: string; color: string }[] = [
  { id: 'new', label: 'New Lead', color: 'border-blue-500/40 text-blue-400 bg-blue-950/20' },
  { id: 'contacted', label: 'Executor Contacted', color: 'border-amber-500/40 text-amber-400 bg-amber-950/20' },
  { id: 'pitched', label: 'Proposal / Pitch Sent', color: 'border-purple-500/40 text-purple-400 bg-purple-950/20' },
  { id: 'won', label: 'Mandate Won', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20' },
  { id: 'archived', label: 'Archived / Passed', color: 'border-slate-700 text-slate-500 bg-slate-900/40' }
];

export const PipelineCrmView: React.FC<PipelineCrmViewProps> = ({
  pipeline, isSignedIn, onRequestSignIn,
  onUpdateStage,
  onUpdateNotes,
  onRemoveItem,
  onSelectEstateModal
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotesText, setEditNotesText] = useState('');
  const [editEstimate, setEditEstimate] = useState<number>(0);
  const [editFollowUpAt, setEditFollowUpAt] = useState('');
  const [sortBy, setSortBy] = useState<'followUp' | 'priority' | 'stage' | 'updated'>('followUp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const totalValue = pipeline.reduce((acc, item) => acc + (item.valueEstimate || 0), 0);

  if (!isSignedIn) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
        <Briefcase className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Sign in to save opportunities</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">Your Lead Pipeline is private account data. Sign in to save estate notices, add notes, track follow-ups, and manage your opportunities.</p>
        <button onClick={onRequestSignIn} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl">Sign in to continue</button>
      </div>
    );
  }

  const handleStartEdit = (item: PipelineItem) => {
    setEditingId(item.id);
    setEditNotesText(item.notes);
    setEditEstimate(item.valueEstimate || 0);
    setEditFollowUpAt(item.followUpAt || '');
  };

  const handleSaveEdit = (itemId: string) => {
    onUpdateNotes(itemId, editNotesText, editEstimate, editFollowUpAt || null);
    setEditingId(null);
  };

  const handleExportPipelineCsv = () => {
    const headers = ['Deceased Name', 'Master Ref', 'Stage', 'Priority', 'Value Estimate (ZAR)', 'Executor', 'Notes', 'Last Updated'];
    const rows = pipeline.map(p => [
      `"${p.estate.deceasedName}"`,
      `"${p.estate.estateNumber}"`,
      `"${p.stage}"`,
      `"${p.priority}"`,
      `"${p.valueEstimate || 0}"`,
      `"${p.estate.executorName}"`,
      `"${p.notes.replace(/"/g, '""')}"`,
      `"${p.updatedAt}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `estatewatch_pipeline_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-amber-400" />
              Saved Estate Opportunities
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
              {pipeline.length} Active Leads
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Track deceased estate mandates from initial Gazette notification to closed deal
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[10px] text-slate-300">
              <option value="followUp">Follow-up</option>
              <option value="priority">Priority</option>
              <option value="stage">Stage</option>
              <option value="updated">Last updated</option>
            </select>
            <button type="button" onClick={() => setSortDirection(current => current === 'asc' ? 'desc' : 'asc')} className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[10px] text-slate-300" aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}>{sortDirection === 'asc' ? '↑' : '↓'}</button>
          </div>
          <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 block text-[10px]">Total Pipeline Value:</span>
            <span className="text-sm font-bold text-amber-400">R {totalValue.toLocaleString()}</span>
          </div>

          <button
            onClick={handleExportPipelineCsv}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Pipeline</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Layout */}
      <div className="overflow-x-auto pb-4 -mx-1 px-1">
        <div className="grid grid-cols-5 gap-4 min-w-[1380px]">
        {STAGES.map((stage) => {
          const priorityRank = { low: 1, medium: 2, high: 3 };
          const parseTime = (value?: string) => value ? Date.parse(value.replace(' ', 'T')) || 0 : 0;
          const now = Date.now();
          const itemsInStage = pipeline.filter(p => p.stage === stage.id).map((item, index) => ({ item, index })).sort((a, b) => {
            const left = a.item;
            const right = b.item;
            const leftOverdue = left.followUpAt ? parseTime(left.followUpAt) < now : false;
            const rightOverdue = right.followUpAt ? parseTime(right.followUpAt) < now : false;
            let comparison = 0;
            if (sortBy === 'followUp') {
              const leftMissing = !left.followUpAt;
              const rightMissing = !right.followUpAt;
              if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
              else if (leftOverdue !== rightOverdue) comparison = Number(rightOverdue) - Number(leftOverdue);
              else comparison = (parseTime(left.followUpAt) || Number.MAX_SAFE_INTEGER) - (parseTime(right.followUpAt) || Number.MAX_SAFE_INTEGER);
            }
            if (sortBy === 'priority') comparison = priorityRank[left.priority] - priorityRank[right.priority];
            if (sortBy === 'stage') comparison = left.stage.localeCompare(right.stage);
            if (sortBy === 'updated') {
              const leftMissing = !left.updatedAt;
              const rightMissing = !right.updatedAt;
              if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
              else comparison = parseTime(left.updatedAt) - parseTime(right.updatedAt);
            }
            if (comparison === 0) comparison = left.estate.deceasedName.localeCompare(right.estate.deceasedName) || a.index - b.index;
            return (sortDirection === 'asc' ? 1 : -1) * comparison;
          }).map(({ item }) => item);
          const stageValue = itemsInStage.reduce((acc, i) => acc + (i.valueEstimate || 0), 0);

          return (
            <div
              key={stage.id}
              className="w-[260px] bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3 flex flex-col space-y-3"
            >
              {/* Stage Header */}
              <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${stage.color}`}>
                <span>{stage.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 border border-slate-800">
                  {itemsInStage.length}
                </span>
              </div>

              <div className="text-[10px] text-slate-500 px-1 font-mono">
                Value: R {stageValue.toLocaleString()}
              </div>

              {/* Items List */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px] pr-1">
                {itemsInStage.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-xl p-3.5 transition-all space-y-3 shadow-md"
                  >
                    
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                          {item.estate.province}
                        </span>
                        <h4 
                          onClick={() => onSelectEstateModal(item.estate)}
                          className="font-bold text-xs text-white hover:text-amber-300 cursor-pointer underline-offset-2 hover:underline"
                        >
                          {item.estate.deceasedName}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono block">{item.estate.estateNumber}</span>
                      </div>

                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-slate-600 hover:text-red-400 p-1 transition-colors cursor-pointer"
                        title="Remove from Pipeline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {item.estate.hasProperty && (
                      <div className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                        <Building2 className="w-3 h-3" /> Property Flagged
                      </div>
                    )}

                    {/* Notes / Edit Notes */}
                    {editingId === item.id ? (
                      <div className="space-y-2 bg-slate-900 p-2 rounded-lg border border-slate-700">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Notes</label>
                          <textarea
                            rows={2}
                            value={editNotesText}
                            onChange={(e) => setEditNotesText(e.target.value)}
                            className="w-full bg-slate-950 text-xs text-slate-200 p-1.5 rounded border border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Est Value (ZAR)</label>
                          <input
                            type="number"
                            value={editEstimate}
                            onChange={(e) => setEditEstimate(Number(e.target.value))}
                            className="w-full bg-slate-950 text-xs text-slate-200 p-1.5 rounded border border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Follow-up date</label>
                          <input type="datetime-local" value={editFollowUpAt} onChange={(e) => setEditFollowUpAt(e.target.value)} className="w-full bg-slate-950 text-xs text-slate-200 p-1.5 rounded border border-slate-700" />
                        </div>
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="w-full py-1 bg-amber-500 text-slate-950 font-bold text-[10px] rounded cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => handleStartEdit(item)} 
                        className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 cursor-pointer hover:border-slate-700"
                        title="Click to edit lead notes"
                      >
                        <p className="line-clamp-2 text-[11px] italic">"{item.notes || 'Click to add lead notes...'}"</p>
                        {item.valueEstimate && item.valueEstimate > 0 && (
                          <span className="text-[10px] font-bold text-amber-400 block mt-1">
                            Est Value: R {item.valueEstimate.toLocaleString()}
                          </span>
                        )}
                        {item.followUpAt && <span className={`text-[10px] font-semibold block mt-1 ${new Date(item.followUpAt).getTime() < Date.now() ? 'text-rose-400' : 'text-slate-400'}`}>Follow-up: {new Date(item.followUpAt).toLocaleString()}</span>}
                      </div>
                    )}

                    {/* Stage Switcher Buttons */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Move Stage:</span>
                      <select
                        value={item.stage}
                        onChange={(e) => onUpdateStage(item.id, e.target.value as PipelineStage)}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-[10px]"
                      >
                        <option value="new">New Lead</option>
                        <option value="contacted">Contacted</option>
                        <option value="pitched">Pitched</option>
                        <option value="won">Mandate Won</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>

                  </div>
                ))}

                {itemsInStage.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-600 border border-dashed border-slate-800 rounded-xl">
                    No leads in {stage.label}
                  </div>
                )}
              </div>

            </div>
          );
        })}
        </div>
      </div>

    </div>
  );
};
