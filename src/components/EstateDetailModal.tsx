import React, { useState } from 'react';
import { DeceasedEstate, PipelineStage } from '../types';
import { SendEmailModal } from './SendEmailModal';
import { fetchOriginalGazetteUrl } from '../services/api';
import { 
  X, 
  Building2, 
  MapPin, 
  Calendar, 
  ShieldAlert, 
  FileText, 
  Phone, 
  Mail, 
  Briefcase, 
  Check, 
  Share2, 
  ExternalLink,
  Tag
} from 'lucide-react';

interface EstateDetailModalProps {
  estate: DeceasedEstate;
  onClose: () => void;
  onAddToPipeline: (estate: DeceasedEstate, stage: PipelineStage, notes: string) => void;
  isInPipeline: boolean;
  isSignedIn: boolean;
  canViewOriginal: boolean;
  onViewPlans: () => void;
}

export const EstateDetailModal: React.FC<EstateDetailModalProps> = ({
  estate,
  onClose,
  onAddToPipeline,
  isInPipeline,
  isSignedIn,
  canViewOriginal,
  onViewPlans,
}) => {
  const [notes, setNotes] = React.useState('');
  const [stage, setStage] = React.useState<PipelineStage>('new');
  const [copied, setCopied] = React.useState(false);
  const [showEmailModal, setShowEmailModal] = React.useState(false);
  const [sourceError, setSourceError] = React.useState('');
  const [openingSource, setOpeningSource] = React.useState(false);
  const isPreview = !estate.executorName && !estate.rawNoticeSnippet;

  const handleViewOriginal = async () => {
    setSourceError(''); setOpeningSource(true);
    try { window.open(await fetchOriginalGazetteUrl(estate.id), '_blank', 'noopener,noreferrer'); }
    catch (error: any) { setSourceError(error.message); }
    finally { setOpeningSource(false); }
  };

  const handleCopyNotice = () => {
    navigator.clipboard.writeText(
      `ESTATEWATCH NOTICE SUMMARY:\n` +
      `Deceased: ${estate.deceasedName}\n` +
      `Master Ref: ${estate.estateNumber}\n` +
      `District: ${estate.district}, ${estate.province}\n` +
      `Date of Death: ${estate.dateOfDeath}\n` +
      `Executor: ${estate.executorName} (${estate.executorContact})\n` +
      `Value Band: ${estate.valueBand}\n` +
      `Gazette Ref: ${estate.gazetteRef}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {estate.province} • {estate.district}
              </span>
              <span className="text-xs text-slate-400">Master Ref: <strong className="text-white">{estate.estateNumber}</strong></span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">{estate.deceasedName}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Key Quick Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Date of Death</span>
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mt-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                {estate.dateOfDeath}
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Estate Value Band</span>
              <span className="text-xs font-bold text-amber-400 mt-1 block">
                {estate.valueBand}
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Masked ID (POPIA)</span>
              <span className="text-xs font-mono font-bold text-slate-300 mt-1 block">
                {estate.idNumberMasked}
              </span>
            </div>
          </div>

          {/* Gazette Source Info */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-400" />
                Gazetted Notice Details ({estate.gazetteRef})
              </h4>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                Gazetted: {estate.gazetteDate}
              </span>
            </div>
            {isPreview ? <p className="text-xs text-slate-400 bg-slate-900 p-3 rounded-lg border border-slate-800">This is a safe preview. Sign in with an active subscription to view the full notice record and contact details.</p> : <p className="text-xs font-mono text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800 leading-relaxed italic">"{estate.rawNoticeSnippet}"</p>}
            {canViewOriginal ? <button onClick={handleViewOriginal} disabled={openingSource} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-60"><ExternalLink className="w-3.5 h-3.5" />{openingSource ? 'Opening…' : 'View Original Gazette PDF'}</button> : <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-slate-400"><ShieldAlert className="inline w-4 h-4 mr-1.5 text-amber-400" />{isSignedIn ? 'Original Gazette PDFs are available with an active subscription.' : 'Sign in with an active subscription to view the original Gazette PDF.'} {isSignedIn && <button onClick={onViewPlans} className="ml-1 font-bold text-amber-400 hover:underline">View Plans</button>}</div>}
            {sourceError && <p role="alert" className="text-xs text-rose-400">{sourceError}</p>}
          </div>

          {/* Property & Assets Section */}
          {estate.hasProperty && (
            <div className="bg-amber-950/20 border border-amber-500/20 p-4 rounded-xl space-y-1.5">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                Identified Real Estate & Property Assets
              </h4>
              <p className="text-xs text-slate-300 font-medium">
                {estate.propertyDetails || 'Property identified in Gazette filing.'}
              </p>
            </div>
          )}

          {/* Executor / Legal Contact */}
          {!isPreview && <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-300">
              Appointed Executor / Attorney Details
            </h4>
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-white">{estate.executorName}</div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <a href={`tel:${estate.executorContact}`} className="flex items-center gap-1 text-amber-400 hover:underline">
                  <Phone className="w-3.5 h-3.5" />
                  {estate.executorContact}
                </a>
                <a href={`mailto:${estate.executorEmail}`} className="flex items-center gap-1 text-slate-300 hover:underline">
                  <Mail className="w-3.5 h-3.5" />
                  {estate.executorEmail}
                </a>
              </div>
            </div>
          </div>}

          {/* Add to Pipeline CRM Box */}
          <div className="bg-slate-800/60 border border-slate-700/80 p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-amber-400" />
              {isInPipeline ? 'Opportunity saved' : 'Save this opportunity'}
            </h4>

            {!isInPipeline ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Initial Stage</label>
                    <select
                      value={stage}
                      onChange={(e) => setStage(e.target.value as PipelineStage)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <option value="new">New Lead</option>
                      <option value="contacted">Contacted</option>
                      <option value="pitched">Pitched / Proposal</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Master Office</label>
                    <input 
                      type="text" 
                      disabled 
                      value={estate.masterOffice} 
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Lead Notes & Pitch Reminders</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Call executor on Monday to offer property valuation services..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <button
                  onClick={() => onAddToPipeline(estate, stage, notes)}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Briefcase className="w-4 h-4" />
                  Save Opportunity
                </button>
              </div>
            ) : (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>This estate notice is currently saved in your Lead Pipeline.</span>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyNotice}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              {copied ? 'Copied Summary!' : 'Copy WhatsApp Summary'}
            </button>

            <button
              onClick={() => setShowEmailModal(true)}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              Send Email Alert
            </button>
          </div>
          
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {showEmailModal && (
        <SendEmailModal estate={estate} onClose={() => setShowEmailModal(false)} />
      )}
    </div>
  );
};
