import React, { useState, useEffect } from 'react';
import {
  UserRole,
  DeceasedEstate,
  AlertCriteria,
  PipelineItem,
  PipelineStage,
  NotificationEvent
} from './types';
import { INITIAL_ESTATES } from './data/mockEstates';
import { INITIAL_ALERTS } from './data/mockAlerts';
import { INITIAL_PIPELINE } from './data/mockPipeline';

import {
  fetchHealthCheck,
  fetchEstates,
  fetchEstate,
  fetchAlerts,
  createAlert as createAlertApi,
  updateAlert as updateAlertApi,
  toggleAlert as toggleAlertApi,
  deleteAlert as deleteAlertApi,
  fetchPipeline,
  addPipelineItem as addPipelineApi,
  updatePipelineStage as updatePipelineStageApi,
  removePipelineItem as removePipelineApi,
  fetchNotifications,
  simulateMatchApi,
} from './services/api';

import { Header } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { EstatesFeedView } from './components/EstatesFeedView';
import { AlertBuilderView } from './components/AlertBuilderView';
import { PipelineCrmView } from './components/PipelineCrmView';
import { IngestionScannerView } from './components/IngestionScannerView';
import { AdminScraperView } from './components/AdminScraperView';
import { PopiaComplianceView } from './components/PopiaComplianceView';
import { BillingView } from './components/BillingView';
import { EstateDetailModal } from './components/EstateDetailModal';
import { SimulateMatchModal } from './components/SimulateMatchModal';
import { LoginModal } from './components/LoginModal';
import { restoreNeonSession, signOutFromNeon } from './services/neonAuth';

import { Bot, Check, X, Bell, MessageSquare, Zap, Database, Mail } from 'lucide-react';
import { UserAccount } from './types';
import { SeoHead } from './components/SeoHead';
import { geographicPage } from './seo';

export function App() {
  const geoPage = geographicPage();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('attorney');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('reset-password')) setShowLoginModal(true);
    void restoreNeonSession().then((user) => {
      if (user) setCurrentUser({ id: user.id, email: user.email, name: user.name, role: user.role, subscriptionActive: user.subscriptionActive, userPersona: 'attorney' });
    });
  }, []);

  useEffect(() => {
    const estateId = new URLSearchParams(window.location.search).get('estate');
    if (!estateId) return;
    let active = true;
    void fetchEstate(estateId).then((estate) => {
      if (!active || !estate) return;
      setSelectedEstate(estate);
      setActiveTab('estates');
    });
    return () => { active = false; };
  }, []);

  // Core Data State (Initialized with mocks, updated from Neon DB)
  const demoEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';
  const [estates, setEstates] = useState<DeceasedEstate[]>(demoEnabled ? INITIAL_ESTATES : []);
  const [alerts, setAlerts] = useState<AlertCriteria[]>(demoEnabled ? INITIAL_ALERTS : []);
  const [pipeline, setPipeline] = useState<PipelineItem[]>(demoEnabled ? INITIAL_PIPELINE : []);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  // Modals & Notifications
  const [selectedEstate, setSelectedEstate] = useState<DeceasedEstate | null>(null);
  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEvent[]>(demoEnabled ? [
    {
      id: 'notif-1',
      alertId: 'alt-1',
      alertName: 'Gauteng High-Value Estate Alert',
      estateId: 'est-101',
      deceasedName: 'Van Der Merwe, Hendrik Johannes',
      estateNumber: '01482/2025/JHB',
      channel: 'email',
      sentAt: '2025-01-24 09:15',
      status: 'delivered',
      recipient: 'attorney@estatewatch.co.za'
    }
  ] : []);
  const [toastNotification, setToastNotification] = useState<NotificationEvent | null>(null);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Sync with Neon DB on mount
  useEffect(() => {
    async function loadDataFromNeonDB() {
      // 1. Health check
      const health = await fetchHealthCheck();
      if (health && health.database === 'connected') {
        setDbConnected(true);
        console.log('⚡ Connected to Neon PostgreSQL database!');

        // Load Estates
        const dbEstates = await fetchEstates();
        if (dbEstates && dbEstates.length > 0) {
          setEstates(dbEstates);
        }

        // Load Alerts
        const dbAlerts = await fetchAlerts();
        if (dbAlerts && dbAlerts.length > 0) {
          setAlerts(dbAlerts);
        }

        // Load Pipeline
        const dbPipeline = await fetchPipeline();
        if (dbPipeline && dbPipeline.length > 0) {
          setPipeline(dbPipeline);
        }

        // Load Notifications
        const dbNotifs = await fetchNotifications();
        if (dbNotifs && dbNotifs.length > 0) {
          setNotifications(dbNotifs);
        }
      } else {
        setDbConnected(false);
      }
    }

    loadDataFromNeonDB();
  }, []);

  // Add Lead to Pipeline
  const handleAddToPipeline = async (
    estate: DeceasedEstate,
    stage: PipelineStage = 'new',
    notes: string = ''
  ) => {
    if (pipeline.some(p => p.estateId === estate.id)) return;

    const newItem: PipelineItem = {
      id: `pip-${Date.now()}`,
      estateId: estate.id,
      estate,
      stage,
      notes: notes || `Gazette lead added from ${estate.province} feed.`,
      valueEstimate: estate.valueBand.includes('R20,000,000') ? 150000 : 50000,
      updatedAt: new Date().toISOString().substring(0, 10),
      priority: 'high',
      tags: [estate.district, estate.province]
    };

    setPipeline(prev => [newItem, ...prev]);

    // Save to DB
    await addPipelineApi({
      id: newItem.id,
      estateId: estate.id,
      stage: newItem.stage,
      notes: newItem.notes,
      valueEstimate: newItem.valueEstimate,
      priority: newItem.priority,
      tags: newItem.tags,
      updatedAt: newItem.updatedAt,
    });
  };

  // Update Pipeline Item Stage
  const handleUpdatePipelineStage = async (itemId: string, newStage: PipelineStage) => {
    setPipeline(prev => prev.map(p => p.id === itemId ? { ...p, stage: newStage, updatedAt: new Date().toISOString().substring(0, 10) } : p));
    await updatePipelineStageApi(itemId, newStage);
  };

  // Update Pipeline Item Notes
  const handleUpdatePipelineNotes = async (itemId: string, notes: string, estimate?: number, followUpAt?: string | null) => {
    setPipeline(prev => prev.map(p => p.id === itemId ? { ...p, notes, valueEstimate: estimate !== undefined ? estimate : p.valueEstimate, followUpAt: followUpAt || undefined } : p));
    const targetItem = pipeline.find(p => p.id === itemId);
    if (targetItem) {
      await updatePipelineStageApi(itemId, targetItem.stage, notes, estimate, followUpAt);
    }
  };

  // Remove Pipeline Item
  const handleRemovePipelineItem = async (itemId: string) => {
    setPipeline(prev => prev.filter(p => p.id !== itemId));
    await removePipelineApi(itemId);
  };

  // Alert Rules Handlers
  const handleCreateAlert = async (newAlert: AlertCriteria) => {
    const saved = await createAlertApi(newAlert);
    if (saved) {
      setAlerts(prev => [saved, ...prev]);
      return true;
    }
    return false;
  };

  const handleUpdateAlert = async (updatedAlert: AlertCriteria) => {
    const saved = await updateAlertApi(updatedAlert);
    if (!saved) return false;
    setAlerts(prev => prev.map(alert => alert.id === saved.id ? saved : alert));
    return true;
  };

  const handleToggleAlert = async (id: string) => {
    const current = alerts.find(a => a.id === id);
    if (!current) return false;
    const ok = await toggleAlertApi(id);
    if (ok) setAlerts(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
    return ok;
  };

  const handleDeleteAlert = async (id: string) => {
    const ok = await deleteAlertApi(id);
    if (ok) setAlerts(prev => prev.filter(a => a.id !== id));
    return ok;
  };

  // Simulation Trigger Match Handler
  const handleSimulateMatch = async (newEstate: DeceasedEstate) => {
    setEstates(prev => [newEstate, ...prev]);
    setSimulateModalOpen(false);

    // Call API Endpoint for simulation + email alert dispatch
    const apiResult = await simulateMatchApi(newEstate);

    const newNotif: NotificationEvent = apiResult?.notification || {
      id: `notif-${Date.now()}`,
      alertId: 'alt-1',
      alertName: 'Gauteng High-Value Estate Alert',
      estateId: newEstate.id,
      deceasedName: newEstate.deceasedName,
      estateNumber: newEstate.estateNumber,
      channel: 'email',
      sentAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'delivered',
      recipient: newEstate.executorEmail || 'attorney@estatewatch.co.za'
    };

    setNotifications(prev => [newNotif, ...prev]);
    setToastNotification(newNotif);

    // Update alert match count
    setAlerts(prev => prev.map(a => a.id === 'alt-1' ? { ...a, matchCount: a.matchCount + 1 } : a));

    // Auto-open modal to inspect
    setSelectedEstate(newEstate);

    // Dismiss toast after 6s
    setTimeout(() => {
      setToastNotification(null);
    }, 6000);
  };

  const pipelineEstateIds = pipeline.map(p => p.estateId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <SeoHead />

      {/* Operational details are visible to administrators only. */}
      {currentUser?.role === 'admin' && <div className="bg-slate-900 border-b border-slate-800 px-4 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-slate-300">Data service:</span>
          {dbConnected === true && (
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          )}
          {dbConnected === false && (
            <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
              Service unavailable
            </span>
          )}
          {dbConnected === null && (
            <span className="text-slate-400 animate-pulse">Checking service...</span>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
          <span>Email alerts: <strong className="text-amber-400">Enabled</strong></span>
        </div>
      </div>}

      {/* Top Header */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onOpenSimulateModal={() => setSimulateModalOpen(true)}
        unreadCount={notifications.length}
        onOpenNotifications={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
        onOpenLoginModal={() => setShowLoginModal(true)}
        currentUser={currentUser}
      />

      {/* Main Container Layout */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-3 lg:p-6 gap-6">

        {/* Left Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          matchesCount={estates.length}
          pipelineCount={pipeline.length}
          isAdmin={currentUser?.role === 'admin'}
        />

        {/* Right Main Content Stage */}
        <main className="flex-1 min-w-0">
          {geoPage && <section className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Built for South Africa</p><h1 className="mt-1 text-xl font-bold text-white">Deceased estate alerts in {geoPage.name}</h1><p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-300">Find relevant Government Gazette estate notices and set a precise alert by South African identity number, surname or province. EstateWatch helps you take a clear next step.</p><button onClick={() => setActiveTab('alerts')} className="mt-3 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400">Start Alert</button></section>}

          {activeTab === 'dashboard' && (
            <DashboardView
              currentRole={currentRole}
              estates={estates}
              alerts={alerts}
              pipeline={pipeline}
              onSelectEstate={setSelectedEstate}
              onNavigateToTab={setActiveTab}
              onOpenSimulateModal={() => setSimulateModalOpen(true)}
              isAdmin={currentUser?.role === 'admin'}
            />
          )}

          {activeTab === 'estates' && (
            <EstatesFeedView
              estates={estates}
              onSelectEstate={setSelectedEstate}
              onAddToPipeline={handleAddToPipeline}
              pipelineEstateIds={pipelineEstateIds}
              isAdmin={currentUser?.role === 'admin'}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertBuilderView
              alerts={alerts}
              onCreateAlert={handleCreateAlert}
              onUpdateAlert={handleUpdateAlert}
              onToggleAlert={handleToggleAlert}
              onDeleteAlert={handleDeleteAlert}
              defaultRecipientEmail={currentUser?.email}
              defaultOwnerName={currentUser?.name}
            />
          )}

          {activeTab === 'pipeline' && (
            <PipelineCrmView
              pipeline={pipeline}
              onUpdateStage={handleUpdatePipelineStage}
              onUpdateNotes={handleUpdatePipelineNotes}
              onRemoveItem={handleRemovePipelineItem}
              onSelectEstateModal={setSelectedEstate}
            />
          )}

          {activeTab === 'ingestion' && (
            currentUser?.role === 'admin' ? <IngestionScannerView /> : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                <Bot className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Administrator access required</h3>
                <p className="text-slate-400 mb-6">Gazette ingestion and parser controls are restricted to administrators.</p>
                <button onClick={() => setShowLoginModal(true)} className="bg-amber-500 text-slate-950 px-6 py-2 rounded-xl font-semibold">Administrator sign in</button>
              </div>
            )
          )}

          {activeTab === 'admin' && (
            currentUser?.role === 'admin' ? (
              <AdminScraperView onPublishEstate={(estate) => {
                setEstates(prev => [estate, ...prev]);
              }} />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                <Bot className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Admin Access Required</h3>
                <p className="text-slate-400 mb-6">You need administrator privileges to access the scraper and ingestion tools.</p>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-amber-500 text-slate-950 px-6 py-2 rounded-xl font-semibold hover:bg-amber-400"
                >
                  Login as Admin
                </button>
              </div>
            )
          )}

          {activeTab === 'popia' && (
            <PopiaComplianceView />
          )}

          {activeTab === 'billing' && (
            <BillingView isAdmin={currentUser?.role === 'admin'} />
          )}

        </main>

      </div>

      {/* Detail Modal */}
      {selectedEstate && (
        <EstateDetailModal
          estate={selectedEstate}
          onClose={() => {
            setSelectedEstate(null);
            const url = new URL(window.location.href);
            if (url.searchParams.has('estate')) {
              url.searchParams.delete('estate');
              window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
            }
          }}
          onAddToPipeline={handleAddToPipeline}
          isInPipeline={pipelineEstateIds.includes(selectedEstate.id)}
          isSignedIn={Boolean(currentUser)}
          canViewOriginal={currentUser?.role === 'admin' || currentUser?.subscriptionActive === true}
          onViewPlans={() => { setSelectedEstate(null); setActiveTab('billing'); }}
        />
      )}

      {/* Simulation Trigger Modal */}
      {simulateModalOpen && (
        <SimulateMatchModal
          onClose={() => setSimulateModalOpen(false)}
          onSimulate={handleSimulateMatch}
        />
      )}

      {/* Live Email & WhatsApp Notification Toast */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-slate-900 border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl animate-bounce space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
            <span className="flex items-center gap-1.5">
              <Mail className="w-4 h-4" />
              Email Notification Alert Dispatched!
            </span>
            <button onClick={() => setToastNotification(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <p className="text-xs text-slate-200">
            <strong>NEW MATCH:</strong> {toastNotification.deceasedName} ({toastNotification.estateNumber}). Notice matched alert criteria <em>"{toastNotification.alertName}"</em>.
          </p>
          <div className="text-[10px] text-slate-400 font-mono">
            Dispatched via Email to {toastNotification.recipient} • Just Now
          </div>
        </div>
      )}

      {/* Notification Dropdown Panel */}
      {showNotificationsDropdown && (
        <div className="fixed top-16 right-6 z-40 w-80 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-amber-400" />
              Notification Dispatch History
            </h4>
            <button onClick={() => setShowNotificationsDropdown(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notifications.map((n) => (
              <div key={n.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-amber-400 text-[11px]">
                  <span className="truncate max-w-[170px]">{n.deceasedName}</span>
                  <span className="uppercase text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-800/40">{n.channel}</span>
                </div>
                <div className="text-[10px] text-slate-400">Alert: {n.alertName}</div>
                <div className="text-[10px] text-slate-500 font-mono flex justify-between">
                  <span>{n.recipient}</span>
                  <span>{n.sentAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        currentUser={currentUser}
        onLogin={(account) => {
          setCurrentUser(account);
          setCurrentRole(account.userPersona);
          setShowLoginModal(false);
        }}
        onLogout={async () => {
          await signOutFromNeon();
          setCurrentUser(null);
          setCurrentRole('attorney');
        }}
      />

    </div>
  );
}

export default App;
