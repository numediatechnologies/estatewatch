import React, { useState } from 'react';
import { CreditCard, Check, Sparkles, ShieldCheck, Zap, Download } from 'lucide-react';

export const BillingView: React.FC<{ isAdmin?: boolean }> = ({ isAdmin = false }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [currentPlan, setCurrentPlan] = useState<'pro' | 'agency' | 'free'>('pro');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState('');

  const handleSelectPlan = (planName: string) => {
    setSelectedCheckoutPlan(planName);
    setShowCheckoutModal(true);
  };

  if (isAdmin) return (
    <div className="rounded-2xl border border-amber-500/40 bg-slate-900 p-8">
      <div className="flex items-center gap-3 text-amber-300 text-xl font-bold"><ShieldCheck className="w-7 h-7" /> Administrator access</div>
      <p className="text-slate-300 mt-3 max-w-2xl">All EstateWatch functionality is enabled for this verified administrator account. No subscription, checkout, usage credit, or payment is required.</p>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-950 px-4 py-2 text-sm font-bold text-emerald-400 border border-emerald-800"><Check className="w-4 h-4" /> Full platform access active</div>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-400" />
              Subscription & Pricing Plans
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
              Active Plan: PRO TIER
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Transparent South African ZAR pricing. Cancel or upgrade anytime via PayFast on tenders.marketdirect.co.za.
          </p>
        </div>

        {/* Monthly vs Annual Toggle */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              billingCycle === 'monthly' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              billingCycle === 'annual' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
            }`}
          >
            Annual Billing
            <span className="text-[9px] bg-emerald-400 text-slate-950 px-1 py-0.2 rounded font-extrabold uppercase">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Free Trial */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Free Trial</span>
            <div className="text-2xl font-bold text-white mt-1">R 0</div>
            <p className="text-[11px] text-slate-500 mt-1">14-day trial for new estate attorneys & tracers</p>

            <ul className="space-y-2 text-xs text-slate-300 mt-4 border-t border-slate-800 pt-4">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>1 Active Monitored Alert</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Email Digest Notifications</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Basic Gazette Search</span>
              </li>
            </ul>
          </div>

          <button
            disabled
            className="w-full py-2 bg-slate-800 text-slate-500 text-xs font-bold rounded-xl cursor-default text-center"
          >
            Trial Used
          </button>
        </div>

        {/* Pro Tier (Popular) */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 relative shadow-2xl shadow-amber-500/10">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow">
            Most Popular
          </div>

          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Pro Solo Tier</span>
            <div className="text-3xl font-extrabold text-white mt-1">
              R {billingCycle === 'annual' ? '559' : '699'}
              <span className="text-xs text-slate-400 font-normal"> / month</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">For solo estate attorneys, investors & tracers</p>

            <ul className="space-y-2 text-xs text-slate-200 mt-4 border-t border-slate-800 pt-4">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold">Unlimited Active Alerts</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold text-emerald-400">WhatsApp Instant Push Alerts</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Email & SMS Channel Sync</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Full Lead Pipeline CRM</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>CSV / PDF Data Export</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleSelectPlan('Pro Solo Tier (R699/mo)')}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md text-center"
          >
            Current Active Plan
          </button>
        </div>

        {/* Agency / Firm Tier */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">Agency / Firm</span>
            <div className="text-3xl font-extrabold text-white mt-1">
              R {billingCycle === 'annual' ? '1,999' : '2,499'}
              <span className="text-xs text-slate-400 font-normal"> / month</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">For law firms, agencies & investor teams</p>

            <ul className="space-y-2 text-xs text-slate-300 mt-4 border-t border-slate-800 pt-4">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>5 Team Seats Included</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Shared Pipeline CRM Board</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>REST API Access for Cases</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Dedicated Account Manager</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleSelectPlan('Agency Tier (R2,499/mo)')}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
          >
            Upgrade to Agency
          </button>
        </div>

        {/* Pay-Per-Lead Credit Pack */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">Pay-Per-Lead</span>
            <div className="text-2xl font-bold text-white mt-1">
              R 49 <span className="text-xs text-slate-400 font-normal"> / estate notice</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">For low-volume occasional users</p>

            <ul className="space-y-2 text-xs text-slate-300 mt-4 border-t border-slate-800 pt-4">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>No Monthly Subscription</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Pay only when unlocking leads</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Never expires</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleSelectPlan('10 Lead Credits Pack (R490)')}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
          >
            Buy 10 Credits (R490)
          </button>
        </div>

      </div>

      {/* Invoice History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-sm text-white">Invoice & Tax Receipt History</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Invoice #</th>
                <th className="p-3">Date</th>
                <th className="p-3">Plan / Item</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Gateway</th>
                <th className="p-3 text-right">PDF Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="p-3 font-mono text-slate-200">INV-2025-0012</td>
                <td className="p-3 text-slate-400">2025-01-01</td>
                <td className="p-3 font-semibold text-white">Pro Solo Subscription (Monthly)</td>
                <td className="p-3 font-bold text-amber-400">R 699.00</td>
                <td className="p-3 text-slate-400">PayFast SA</td>
                <td className="p-3 text-right">
                  <button className="text-amber-400 hover:underline text-[11px] font-semibold flex items-center justify-end gap-1 cursor-pointer">
                    <Download className="w-3 h-3" /> Download
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Checkout Simulator Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">PayFast / Paystack SA Checkout</h3>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              Selected Item: <strong className="text-amber-400">{selectedCheckoutPlan}</strong>
            </p>
            <p className="text-[11px] text-slate-500">
              Checkout will be routed through PayFast with secure ZAR settlement on tenders.marketdirect.co.za.
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal (ZAR)</span>
                <span className="text-slate-200">R 699.00</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>VAT (15%)</span>
                <span className="text-slate-200">R 104.85</span>
              </div>
              <div className="flex justify-between font-bold text-white pt-2 border-t border-slate-800">
                <span>Total Due</span>
                <span className="text-amber-400 text-sm">R 803.85</span>
              </div>
            </div>

            <button
              onClick={() => {
                alert('PayFast Gateway Simulator: Payment successful!');
                setShowCheckoutModal(false);
              }}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Simulate Successful Payment
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
