import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { ChatDrawer } from './components/copilot/ChatDrawer';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnomaliesPage } from './pages/AnomaliesPage';
import { RootCausePage } from './pages/RootCausePage';
import { WhatIfPage } from './pages/WhatIfPage';
import { CoPilotPage } from './pages/CoPilotPage';
import { ActionTrackerPage } from './pages/ActionTrackerPage';
import { ReportsPage } from './pages/ReportsPage';
import { useAuthStore } from './store/authStore';

const AppShell: React.FC = () => (
  <div className="flex min-h-screen flex-col bg-[#EBF0F7] text-slate-800 antialiased">
    {/* Top Sticky Neumorphic Navbar */}
    <Navbar />

    {/* Body Layout: Sidebar + Scrollable View */}
    <div className="flex flex-1 overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 lg:p-5 bg-[#EBF0F7]">
        <div className="mx-auto max-w-7xl">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/anomalies" element={<AnomaliesPage />} />
            <Route path="/rootcause" element={<RootCausePage />} />
            <Route path="/whatif" element={<WhatIfPage />} />
            <Route path="/copilot" element={<CoPilotPage />} />
            <Route path="/actions" element={<ActionTrackerPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>

    {/* Global Floating AI Co-Pilot Slide Drawer */}
    <ChatDrawer />
  </div>
);

export const App: React.FC = () => {
  const user = useAuthStore((s) => s.user);

  return (
    <BrowserRouter>
      {user ? (
        <AppShell />
      ) : (
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      )}
    </BrowserRouter>
  );
};

export default App;
