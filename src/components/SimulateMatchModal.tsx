import React, { useState } from 'react';
import { DeceasedEstate, Province, EstateValueBand } from '../types';
import { Zap, Check, Bell, MessageSquare, Mail, X, Sparkles } from 'lucide-react';

interface SimulateMatchModalProps {
  onClose: () => void;
  onSimulate: (newEstate: DeceasedEstate) => void;
}

export const SimulateMatchModal: React.FC<SimulateMatchModalProps> = ({
  onClose,
  onSimulate
}) => {
  const [surname, setSurname] = useState('Dlamini');
  const [firstName, setFirstName] = useState('Sibusiso Robert');
  const [province, setProvince] = useState<Province>('Gauteng');
  const [district, setDistrict] = useState('Sandton');
  const [valueBand, setValueBand] = useState<EstateValueBand>('R5,000,000 - R20,000,000');
  const [hasProperty, setHasProperty] = useState(true);

  const handleRunSimulation = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const simulatedEstate: DeceasedEstate = {
      id: `sim-${Date.now()}`,
      sourceId: `GG-50282-${randomNum}`,
      deceasedName: `${surname}, ${firstName}`,
      idNumberMasked: `760518****08${Math.floor(Math.random() * 9)}`,
      dateOfDeath: new Date().toISOString().split('T')[0],
      gazetteDate: new Date().toISOString().split('T')[0],
      province,
      district,
      masterOffice: `Master of the High Court, ${district}`,
      estateNumber: `0${randomNum}/2025/${province === 'Gauteng' ? 'JHB' : 'CPT'}`,
      executorName: 'Sibusiso Dlamini & Family Nominee',
      executorContact: '+27 83 992 1044',
      executorEmail: 'estate.dlamini@fiduciarysa.co.za',
      valueBand,
      assetTypes: hasProperty ? ['property', 'shares', 'vehicle'] : ['bank_accounts', 'vehicle'],
      hasProperty,
      propertyDetails: hasProperty ? `Erf ${randomNum} Bryanston Manor, Sandton (Residential Estate)` : undefined,
      rawNoticeSnippet: `LIVE SIMULATION NOTICE: Estate Late ${firstName.toUpperCase()} ${surname.toUpperCase()}. Master Ref: 0${randomNum}/2025. Date of death: ${new Date().toLocaleDateString()}. Section 29 Notice to Creditors.`,
      gazetteRef: 'Govt Gazette Vol 712 No 50282 (Live Trigger)',
      status: 'pending',
      matchScore: 99,
      matchedAlertIds: ['alt-1']
    };

    onSimulate(simulatedEstate);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-transparent">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Test Gazette Alert Trigger</h3>
              <p className="text-xs text-slate-400">Simulate a newly published Gazette deceased estate notice</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
            This will instantly insert a simulated deceased estate notice into EstateWatch and trigger matching active alerts across <strong>WhatsApp, Email, and Push notifications</strong>.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Deceased Surname</label>
              <input
                type="text"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">First Names</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Province</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value as Province)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              >
                <option value="Gauteng">Gauteng</option>
                <option value="Western Cape">Western Cape</option>
                <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                <option value="Eastern Cape">Eastern Cape</option>
                <option value="Free State">Free State</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">District / City</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Estate Value Band</label>
            <select
              value={valueBand}
              onChange={(e) => setValueBand(e.target.value as EstateValueBand)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
            >
              <option value="< R250,000">&lt; R250,000</option>
              <option value="R250,000 - R1,000,000">R250,000 - R1,000,000</option>
              <option value="R1,000,000 - R5,000,000">R1,000,000 - R5,000,000</option>
              <option value="R5,000,000 - R20,000,000">R5,000,000 - R20,000,000</option>
              <option value="R20,000,000+">R20,000,000+</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="hasPropertySim"
              checked={hasProperty}
              onChange={(e) => setHasProperty(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="hasPropertySim" className="text-xs text-slate-300 font-medium cursor-pointer">
              Includes Real Estate Property Asset
            </label>
          </div>

          {/* Delivery Channels Preview */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Target Delivery Channels</span>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="flex items-center gap-1 text-emerald-400">
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Push
              </span>
              <span className="flex items-center gap-1 text-blue-400">
                <Mail className="w-3.5 h-3.5" /> Email Digest
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <Bell className="w-3.5 h-3.5" /> In-App Alert
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleRunSimulation}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
          >
            <Zap className="w-4 h-4 fill-current" />
            Fire Live Alert Run
          </button>
        </div>

      </div>
    </div>
  );
};
