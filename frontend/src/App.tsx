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
import { UsersPage } from './pages/UsersPage';
import { useAuthStore, canAct } from './store/authStore';

// Backend also enforces this (require_roles("operator", "admin") on
// POST /api/whatif) — this is the UI-side half, so a Viewer typing the URL
// directly gets redirected instead of landing on a page whose only action
// always fails.
const RequireCanAct: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const role = useAuthStore((s) => s.user?.role);
  return canAct(role) ? <>{children}</> : <Navigate to="/" replace />;
};

// Same idea, but for the admin-only user-management routes (backend:
// require_roles("admin") on /api/auth/users).
const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const role = useAuthStore((s) => s.user?.role);
  return role === 'admin' ? <>{children}</> : <Navigate to="/" replace />;
};

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
            <Route
              path="/whatif"
              element={
                <RequireCanAct>
                  <WhatIfPage />
                </RequireCanAct>
              }
            />
            <Route path="/copilot" element={<CoPilotPage />} />
            <Route path="/actions" element={<ActionTrackerPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route
              path="/users"
              element={
                <RequireAdmin>
                  <UsersPage />
                </RequireAdmin>
              }
            />
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
