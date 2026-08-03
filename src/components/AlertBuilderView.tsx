import React, { useState } from 'react';
import { AlertCriteria, Province, EstateValueBand, AssetType, NotificationChannel } from '../types';
import { 
  BellRing, 
  Plus, 
  Check, 
  Trash2, 
  Sparkles, 
  MessageSquare, 
  Mail, 
  Smartphone, 
  Bell, 
  ShieldCheck,
  Zap,
  CheckCircle2
} from 'lucide-react';

interface AlertBuilderViewProps {
  alerts: AlertCriteria[];
  onCreateAlert: (newAlert: AlertCriteria) => void;
  onToggleAlert: (id: string) => void;
  onDeleteAlert: (id: string) => void;
}

const ALL_PROVINCES: Province[] = [
  'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 
  'Free State', 'Mpumalanga', 'Limpopo', 'North West', 'Northern Cape'
];

const ALL_VALUE_BANDS: EstateValueBand[] = [
  '< R250,000',
  'R250,000 - R1,000,000',
  'R1,000,000 - R5,000,000',
  'R5,000,000 - R20,000,000',
  'R20,000,000+'
];

const ALL_ASSET_TYPES: { id: AssetType; label: string }[] = [
  { id: 'property', label: 'Real Estate Property' },
  { id: 'business', label: 'Business & Commercial Units' },
  { id: 'shares', label: 'Share Portfolios & Investments' },
  { id: 'vehicle', label: 'Vehicles & Transport Fleets' },
  { id: 'bank_accounts', label: 'Bank Accounts & Liquidity' },
  { id: 'other', label: 'Other Assets' }
];

export const AlertBuilderView: React.FC<AlertBuilderViewProps> = ({
  alerts,
  onCreateAlert,
  onToggleAlert,
  onDeleteAlert
}) => {
  const [alertName, setAlertName] = useState('Gauteng & WC Property Alert');
  const [surnameMatch, setSurnameMatch] = useState('');
  const [selectedProvinces, setSelectedProvinces] = useState<Province[]>(['Gauteng', 'Western Cape']);
  const [selectedValueBands, setSelectedValueBands] = useState<EstateValueBand[]>([
    'R1,000,000 - R5,000,000', 'R5,000,000 - R20,000,000', 'R20,000,000+'
  ]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<AssetType[]>(['property', 'business']);
  const [channels, setChannels] = useState<NotificationChannel[]>(['whatsapp', 'email']);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleProvince = (p: Province) => {
    setSelectedProvinces(prev => 
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const toggleValueBand = (v: EstateValueBand) => {
    setSelectedValueBands(prev => 
      prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
    );
  };

  const toggleAssetType = (a: AssetType) => {
    setSelectedAssetTypes(prev => 
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    );
  };

  const toggleChannel = (c: NotificationChannel) => {
    setChannels(prev => 
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertName.trim() || selectedProvinces.length === 0) return;

    const newAlert: AlertCriteria = {
      id: `alt-${Date.now()}`,
      name: alertName,
      surnameMatch: surnameMatch.trim() || undefined,
      provinces: selectedProvinces,
      valueBands: selectedValueBands,
      assetTypes: selectedAssetTypes,
      channels: channels.length > 0 ? channels : ['whatsapp', 'email'],
      isActive: true,
      matchCount: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };

    onCreateAlert(newAlert);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Intro */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
          <BellRing className="w-5 h-5" />
          <span>Alert Builder Wizard — Instant Gazette Notice Triggers</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          Configure exact criteria for deceased estate notices gazetted weekly in South Africa. When a new Gazette notice matches your rule, EstateWatch immediately extracts structured fields and delivers an instant alert to your selected channels.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Builder Form */}
        <form onSubmit={handleCreate} className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          
          <h3 className="font-bold text-sm text-white border-b border-slate-800 pb-3 flex items-center justify-between">
            <span>Define Alert Criteria</span>
            <span className="text-xs text-slate-400 font-normal">Step-by-step Rule Config</span>
          </h3>

          {/* Alert Name & Surname Match */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Alert Name / Label *
              </label>
              <input
                type="text"
                value={alertName}
                onChange={(e) => setAlertName(e.target.value)}
                placeholder="e.g. Sandton High-Value Estate Alert"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Surname Match / Family Filter (Optional)
              </label>
              <input
                type="text"
                value={surnameMatch}
                onChange={(e) => setSurnameMatch(e.target.value)}
                placeholder="e.g. Van Der Merwe, Naidoo, Mokoena"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500"
              />
            </div>
          </div>

          {/* Provinces Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              Target Provinces ({selectedProvinces.length} selected)
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_PROVINCES.map((p) => {
                const isSelected = selectedProvinces.includes(p);
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => toggleProvince(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Value Bands Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              Estate Value Bands ({selectedValueBands.length} selected)
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_VALUE_BANDS.map((v) => {
                const isSelected = selectedValueBands.includes(v);
                return (
                  <button
                    type="button"
                    key={v}
                    onClick={() => toggleValueBand(v)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Asset Types Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              Asset Types & Property Flags
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_ASSET_TYPES.map((a) => {
                const isSelected = selectedAssetTypes.includes(a.id);
                return (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => toggleAssetType(a.id)}
                    className={`p-2 rounded-xl text-left text-xs font-medium border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-950 text-white border-amber-500/50'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800'
                    }`}
                  >
                    <span>{a.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notification Channels */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-300 block">
              Alert Delivery Channels
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => toggleChannel('whatsapp')}
                className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  channels.includes('whatsapp')
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/50'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp Instant</span>
              </button>

              <button
                type="button"
                onClick={() => toggleChannel('email')}
                className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  channels.includes('email')
                    ? 'bg-blue-950/40 text-blue-400 border-blue-500/50'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Email Digest</span>
              </button>

              <button
                type="button"
                onClick={() => toggleChannel('sms')}
                className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  channels.includes('sms')
                    ? 'bg-purple-950/40 text-purple-400 border-purple-500/50'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>SMS Push</span>
              </button>

              <button
                type="button"
                onClick={() => toggleChannel('push')}
                className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  channels.includes('push')
                    ? 'bg-amber-950/40 text-amber-400 border-amber-500/50'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>In-App Banner</span>
              </button>
            </div>
          </div>

          {/* Plain Language Live Summary */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              Plain Language Alert Summary
            </span>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              "When a new deceased estate in <strong className="text-white">{selectedProvinces.join(', ') || 'Any Province'}</strong> valued at <strong className="text-white">{selectedValueBands.join(' / ') || 'Any Value'}</strong> is gazetted, notify my <strong className="text-amber-400">{channels.join(', ').toUpperCase()}</strong> within 5 minutes."
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-2">
            {savedSuccess ? (
              <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Alert Saved & Live Monitored!
              </div>
            ) : <div />}

            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/10 ml-auto"
            >
              <Plus className="w-4 h-4" />
              Save & Activate Alert Rule
            </button>
          </div>

        </form>

        {/* Right Column: Existing Active Rules */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <BellRing className="w-4 h-4 text-amber-400" />
            Existing Alert Rules ({alerts.length})
          </h3>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-white">{alert.name}</h4>
                    <span className="text-[10px] text-slate-500">Created: {alert.createdAt}</span>
                  </div>

                  <button
                    onClick={() => onToggleAlert(alert.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      alert.isActive
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {alert.isActive ? 'ACTIVE' : 'PAUSED'}
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1">
                  <div>Provinces: <strong className="text-slate-200">{alert.provinces.join(', ')}</strong></div>
                  <div>Values: <strong className="text-amber-400">{alert.valueBands.join(' | ')}</strong></div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                  <span>Matches: <strong className="text-white">{alert.matchCount}</strong></span>
                  <button
                    onClick={() => onDeleteAlert(alert.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                    title="Delete Rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
