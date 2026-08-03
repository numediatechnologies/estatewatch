import React, { useState } from 'react';
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

import { Header } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { EstatesFeedView } from './components/EstatesFeedView';
import { AlertBuilderView } from './components/AlertBuilderView';
import { PipelineCrmView } from './components/PipelineCrmView';
import { IngestionScannerView } from './components/IngestionScannerView';
import { PopiaComplianceView } from './components/PopiaComplianceView';
import { BillingView } from './components/BillingView';
import { EstateDetailModal } from './components/EstateDetailModal';
import { SimulateMatchModal } from './components/SimulateMatchModal';

import { Check, X, Bell, MessageSquare, Zap } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('attorney');

  // Core Data State
  const [estates, setEstates] = useState<DeceasedEstate[]>(INITIAL_ESTATES);
  const [alerts, setAlerts] = useState<AlertCriteria[]>(INITIAL_ALERTS);
  const [pipeline, setPipeline] = useState<PipelineItem[]>(INITIAL_PIPELINE);

  // Modals & Notifications
  const [selectedEstate, setSelectedEstate] = useState<DeceasedEstate | null>(null);
  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([
    {
      id: 'notif-1',
      alertId: 'alt-1',
      alertName: 'Gauteng High-Value Estate Alert',
      estateId: 'est-101',
      deceasedName: 'Van Der Merwe, Hendrik Johannes',
      estateNumber: '01482/2025/JHB',
      channel: 'whatsapp',
      sentAt: '2025-01-24 09:15',
      status: 'delivered',
      recipient: '+27 82 491 1020'
    }
  ]);
  const [toastNotification, setToastNotification] = useState<NotificationEvent | null>(null);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Add Lead to Pipeline
  const handleAddToPipeline = (
    estate: DeceasedEstate, 
    stage: PipelineStage = 'new', 
    notes: string = ''
  ) => {
    // Prevent duplicate
    if (pipeline.some(p => p.estateId === estate.id)) return;

    const newItem: PipelineItem = {
      id: `pip-${Date.now()}`,
      estateId: estate.id,
      estate,
      stage,
      notes: notes || `Gazette lead added from ${estate.province} feed.`,
      valueEstimate: estate.valueBand.includes('R20,000,000') ? 150000 : 50000,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      priority: 'high',
      tags: [estate.district, estate.province]
    };

    setPipeline(prev => [newItem, ...prev]);
  };

  // Update Pipeline Item Stage
  const handleUpdatePipelineStage = (itemId: string, newStage: PipelineStage) => {
    setPipeline(prev => prev.map(p => p.id === itemId ? { ...p, stage: newStage, updatedAt: new Date().toISOString().substring(0, 10) } : p));
  };

  // Update Pipeline Item Notes
  const handleUpdatePipelineNotes = (itemId: string, notes: string, estimate?: number) => {
    setPipeline(prev => prev.map(p => p.id === itemId ? { ...p, notes, valueEstimate: estimate !== undefined ? estimate : p.valueEstimate } : p));
  };

  // Remove Pipeline Item
  const handleRemovePipelineItem = (itemId: string) => {
    setPipeline(prev => prev.filter(p => p.id !== itemId));
  };

  // Alert Rules Handlers
  const handleCreateAlert = (newAlert: AlertCriteria) => {
    setAlerts(prev => [newAlert, ...prev]);
  };

  const handleToggleAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  // Simulation Trigger Match Handler
  const handleSimulateMatch = (newEstate: DeceasedEstate) => {
    setEstates(prev => [newEstate, ...prev]);
    setSimulateModalOpen(false);

    // Create Notification Event
    const newNotif: NotificationEvent = {
      id: `notif-${Date.now()}`,
      alertId: 'alt-1',
      alertName: 'Gauteng High-Value Estate Alert',
      estateId: newEstate.id,
      deceasedName: newEstate.deceasedName,
      estateNumber: newEstate.estateNumber,
      channel: 'whatsapp',
      sentAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'delivered',
      recipient: '+27 82 *** 9120'
    };

    setNotifications(prev => [newNotif, ...prev]);
    setToastNotification(newNotif);

    // Update alert match count
    setAlerts(prev => prev.map(a => a.id === 'alt-1' ? { ...a, matchCount: a.matchCount + 1 } : a));

    // Auto-open modal to inspect
    setSelectedEstate(newEstate);

    // Dismiss toast after 5s
    setTimeout(() => {
      setToastNotification(null);
    }, 6000);
  };

  const pipelineEstateIds = pipeline.map(p => p.estateId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Header */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onOpenSimulateModal={() => setSimulateModalOpen(true)}
        unreadCount={notifications.length}
        onOpenNotifications={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
      />

      {/* Main Container Layout */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-3 lg:p-6 gap-6">
        
        {/* Left Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          matchesCount={estates.length}
          pipelineCount={pipeline.length}
        />

        {/* Right Main Content Stage */}
        <main className="flex-1 min-w-0">
          
          {activeTab === 'dashboard' && (
            <DashboardView
              currentRole={currentRole}
              estates={estates}
              alerts={alerts}
              pipeline={pipeline}
              onSelectEstate={setSelectedEstate}
              onNavigateToTab={setActiveTab}
              onOpenSimulateModal={() => setSimulateModalOpen(true)}
            />
          )}

          {activeTab === 'estates' && (
            <EstatesFeedView
              estates={estates}
              onSelectEstate={setSelectedEstate}
              onAddToPipeline={handleAddToPipeline}
              pipelineEstateIds={pipelineEstateIds}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertBuilderView
              alerts={alerts}
              onCreateAlert={handleCreateAlert}
              onToggleAlert={handleToggleAlert}
              onDeleteAlert={handleDeleteAlert}
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
            <IngestionScannerView />
          )}

          {activeTab === 'popia' && (
            <PopiaComplianceView />
          )}

          {activeTab === 'billing' && (
            <BillingView />
          )}

        </main>

      </div>

      {/* Detail Modal */}
      {selectedEstate && (
        <EstateDetailModal
          estate={selectedEstate}
          onClose={() => setSelectedEstate(null)}
          onAddToPipeline={handleAddToPipeline}
          isInPipeline={pipelineEstateIds.includes(selectedEstate.id)}
        />
      )}

      {/* Simulation Trigger Modal */}
      {simulateModalOpen && (
        <SimulateMatchModal
          onClose={() => setSimulateModalOpen(false)}
          onSimulate={handleSimulateMatch}
        />
      )}

      {/* Live WhatsApp Push Notification Toast */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-slate-900 border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl animate-bounce space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              WhatsApp Alert Delivered!
            </span>
            <button onClick={() => setToastNotification(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <p className="text-xs text-slate-200">
            <strong>NEW MATCH:</strong> {toastNotification.deceasedName} ({toastNotification.estateNumber}). Master gazette notice matched alert <em>"{toastNotification.alertName}"</em>.
          </p>
          <div className="text-[10px] text-slate-400 font-mono">
            Sent to WhatsApp +27 82 *** 9120 • Just Now
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
                  <span>{n.deceasedName}</span>
                  <span className="uppercase text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.2 rounded">{n.channel}</span>
                </div>
                <div className="text-[10px] text-slate-400">Alert: {n.alertName}</div>
                <div className="text-[10px] text-slate-500 font-mono">{n.sentAt}</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
