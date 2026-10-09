import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DemoTourModal } from './components/DemoTourModal';
import { LeadDetailModal } from './views/LeadDetailModal';

// Views
import { DashboardView } from './views/DashboardView';
import { LeadsView } from './views/LeadsView';
import { ConversationsView } from './views/ConversationsView';
import { VoiceAgentView } from './views/VoiceAgentView';
import { CRMView } from './views/CRMView';
import { KnowledgeBaseView } from './views/KnowledgeBaseView';
import { MeetingsView } from './views/MeetingsView';
import { FollowupsView } from './views/FollowupsView';
import { AnalyticsView } from './views/AnalyticsView';
import { AgentsWorkforceView } from './views/AgentsWorkforceView';
import { SettingsView } from './views/SettingsView';

// API & Types
import { api } from './services/api';
import { Lead, Meeting, FollowUp, DashboardMetrics, IndustryOption } from './types';

export function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [selectedLeadForModal, setSelectedLeadForModal] = useState<Lead | null>(null);
  const [activeLeadForChat, setActiveLeadForChat] = useState<number | undefined>(undefined);

  // Data States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [industries, setIndustries] = useState<IndustryOption[]>([
    {
      id: 'real_estate',
      name: 'Real Estate (Default)',
      lead_sample: 'Rahul Sharma (₹80 Lakh, 2 BHK Pune)',
      meeting_type: 'Site Visit',
      currency: 'INR (₹ Lakh / Crore)',
      description: 'Luxury residential township sales, RERA compliance, carpet area specifications, and site visits.'
    }
  ]);
  const [activeIndustry, setActiveIndustry] = useState('real_estate');
  const [isResetting, setIsResetting] = useState(false);

  const fetchAllData = async () => {
    try {
      const [leadsData, meetingsData, followupsData, metricsData, industriesData] = await Promise.all([
        api.getLeads(),
        api.getMeetings(),
        api.getFollowups(),
        api.getDashboardMetrics(),
        api.getIndustries(),
      ]);

      setLeads(leadsData);
      setMeetings(meetingsData);
      setFollowups(followupsData);
      setMetrics(metricsData);
      if (industriesData?.available_industries) {
        setIndustries(industriesData.available_industries);
        setActiveIndustry(industriesData.current_industry || 'real_estate');
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await api.resetDemoData();
      await fetchAllData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSelectIndustry = async (indId: string) => {
    setActiveIndustry(indId);
    try {
      await api.switchIndustry(indId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenLeadChat = (lead: Lead) => {
    setActiveLeadForChat(lead.id);
    setCurrentView('conversations');
  };

  const handleOpenLeadVoice = (lead: Lead) => {
    setCurrentView('voice');
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        activeIndustry={activeIndustry}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar
          currentView={currentView}
          onOpenTour={() => setIsTourOpen(true)}
          onResetDemo={handleResetDemo}
          industries={industries}
          activeIndustry={activeIndustry}
          onSelectIndustry={handleSelectIndustry}
          isResetting={isResetting}
        />

        <div className="view-scroll">
          {currentView === 'dashboard' && (
            <DashboardView
              metrics={metrics}
              leads={leads}
              meetings={meetings}
              followups={followups}
              onNavigate={setCurrentView}
              onOpenLead={setSelectedLeadForModal}
            />
          )}

          {currentView === 'leads' && (
            <LeadsView
              leads={leads}
              onOpenLead={setSelectedLeadForModal}
              onOpenChat={handleOpenLeadChat}
              onOpenVoice={handleOpenLeadVoice}
              onRefreshLeads={fetchAllData}
            />
          )}

          {currentView === 'conversations' && (
            <ConversationsView
              leads={leads}
              activeLeadId={activeLeadForChat}
              onRefreshLeads={fetchAllData}
            />
          )}

          {currentView === 'voice' && (
            <VoiceAgentView
              leads={leads}
              onRefreshLeads={fetchAllData}
            />
          )}

          {currentView === 'crm' && (
            <CRMView
              onOpenLead={setSelectedLeadForModal}
              onRefreshLeads={fetchAllData}
            />
          )}

          {currentView === 'knowledge' && (
            <KnowledgeBaseView />
          )}

          {currentView === 'meetings' && (
            <MeetingsView
              leads={leads}
              onRefreshLeads={fetchAllData}
            />
          )}

          {currentView === 'followups' && (
            <FollowupsView />
          )}

          {currentView === 'analytics' && (
            <AnalyticsView
              metrics={metrics}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'agents' && (
            <AgentsWorkforceView />
          )}

          {currentView === 'settings' && (
            <SettingsView
              industries={industries}
              activeIndustry={activeIndustry}
              onSelectIndustry={handleSelectIndustry}
              onResetDemo={handleResetDemo}
              isResetting={isResetting}
            />
          )}
        </div>
      </div>

      {/* 20-Step Demo Tour Walkthrough Modal */}
      <DemoTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigateToView={setCurrentView}
      />

      {/* 360-Degree Prospect Dossier Modal */}
      <LeadDetailModal
        lead={selectedLeadForModal}
        isOpen={!!selectedLeadForModal}
        onClose={() => setSelectedLeadForModal(null)}
        onLeadUpdated={(upd) => {
          setSelectedLeadForModal(upd);
          fetchAllData();
        }}
        onOpenChat={handleOpenLeadChat}
        onOpenVoice={handleOpenLeadVoice}
      />
    </div>
  );
}

export default App;
