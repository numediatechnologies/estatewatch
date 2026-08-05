import React, { useState } from 'react';
import { DeceasedEstate } from '../types';
import { sendEmailNotification } from '../services/api';
import { Mail, Send, CheckCircle, AlertCircle, X, ExternalLink, Loader2 } from 'lucide-react';

interface SendEmailModalProps {
  estate: DeceasedEstate;
  onClose: () => void;
}

export function SendEmailModal({ estate, onClose }: SendEmailModalProps) {
  const [recipientEmail, setRecipientEmail] = useState(estate.executorEmail || 'attorney@estatewatch.co.za');
  const [alertName, setAlertName] = useState('High-Value Deceased Estate Notice');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; previewUrl?: string; error?: string } | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail) return;

    setIsSending(true);
    setResult(null);

    const response = await sendEmailNotification(recipientEmail, estate, alertName);

    setIsSending(false);
    if (response.success) {
      setResult({
        success: true,
        message: response.message || `Alert notification sent to ${recipientEmail}`,
        previewUrl: response.previewUrl,
      });
    } else {
      setResult({
        success: false,
        error: response.error || 'Failed to dispatch email. Check server log.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl space-y-0">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Send Email Alert Notification</h3>
              <p className="text-xs text-slate-400">Dispatch live HTML Gazette alert to recipient</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
            <div className="text-slate-400 font-mono">TARGET ESTATE</div>
            <div className="font-bold text-white">{estate.deceasedName}</div>
            <div className="text-amber-400 font-mono text-[11px]">{estate.estateNumber} • {estate.province} • {estate.valueBand}</div>
          </div>

          {!result ? (
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. executor@legal.co.za or your-email@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alert Criteria Name Header
                </label>
                <input
                  type="text"
                  value={alertName}
                  onChange={(e) => setAlertName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Dispatching Email...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Live Email Alert
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {result.success ? (
                <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle className="w-5 h-5" />
                    Email Notification Delivered!
                  </div>
                  <p className="text-xs text-slate-300">{result.message}</p>
                  
                  {result.previewUrl && (
                    <div className="pt-2">
                      <a
                        href={result.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Preview Delivered HTML Email (Ethereal Inbox)
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-rose-950/60 border border-rose-500/40 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <AlertCircle className="w-5 h-5" />
                    Delivery Failed
                  </div>
                  <p className="text-xs text-slate-300">{result.error}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
