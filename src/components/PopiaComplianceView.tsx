import React, { useState } from 'react';
import { ShieldCheck, FileText, CheckCircle2, AlertTriangle, Send, Lock } from 'lucide-react';
import { BrandName } from './BrandName';

export const PopiaComplianceView: React.FC = () => {
  const [optOutSubmitted, setOptOutSubmitted] = useState(false);
  const [estateRef, setEstateRef] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterRole, setRequesterRole] = useState('executor');
  const [reason, setReason] = useState('');

  const handleOptOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOptOutSubmitted(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
          <ShieldCheck className="w-5 h-5" />
          <span>Protection of Personal Information Act (POPIA) Compliance Framework</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          Deceased estate notices published in the Government Gazette and at the Master's Office are statutory public records under Section 29 & 35 of Act 66 of 1965. <BrandName /> processes this public data in strict compliance with South Africa’s POPIA regulation.
        </p>
      </div>

      {/* Core Principles Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <Lock className="w-4 h-4" />
            1. Automatic ID Masking
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            All South African ID numbers gazetted in notices are automatically masked (e.g. <strong className="text-slate-200">760518****088</strong>), preventing full identity exposure while retaining birthdate verification.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
            <FileText className="w-4 h-4" />
            2. Legitimate Interest Basis
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Data processing serves lawful legal & professional notification purposes (creditor claims, fiduciary administration, and inheritance tracing) as mandated by public record redistribution standards.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" />
            3. Next-of-Kin Opt-Out
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Appointed executors and surviving immediate next-of-kin can request data suppression or contact details removal via our dedicated portal below.
          </p>
        </div>

      </div>

      {/* Opt-Out / Suppression Request Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-sm text-white border-b border-slate-800 pb-3 flex items-center justify-between">
          <span>Executor / Next-of-Kin Data Removal & Suppression Form</span>
          <span className="text-xs text-slate-400 font-normal">POPIA Section 24 Request</span>
        </h3>

        {optOutSubmitted ? (
          <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-xs text-emerald-300 space-y-1">
            <div className="font-bold text-sm flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Opt-Out Request Received & Logged
            </div>
            <p>
              Your removal request for Master Ref <strong className="text-white">{estateRef}</strong> has been submitted to our Data Protection Officer. Processing completed within 24 business hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleOptOutSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Requester Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="e.g. Adv. Cheryl Lombard"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Master Estate Reference No. *
                </label>
                <input
                  type="text"
                  required
                  value={estateRef}
                  onChange={(e) => setEstateRef(e.target.value)}
                  placeholder="e.g. 01482/2025/JHB"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Capacity / Role *
                </label>
                <select
                  value={requesterRole}
                  onChange={(e) => setRequesterRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="executor">Appointed Executor / Attorney</option>
                  <option value="spouse">Surviving Spouse</option>
                  <option value="heir">Direct Heir / Family Member</option>
                  <option value="other">Other Legal Representative</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Reason for Suppression / Contact Info Removal
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Specify if requesting full suppression or masking of phone/email contact details..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-700 flex items-center gap-2"
            >
              <Send className="w-4 h-4 text-amber-400" />
              Submit POPIA Suppression Request
            </button>

          </form>
        )}

      </div>

    </div>
  );
};
