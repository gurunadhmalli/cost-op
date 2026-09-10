import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  GitFork,
  Sliders,
  Bot,
  CheckCircle2,
  FileBarChart2,
  Cpu,
} from 'lucide-react';
import { mockAnomalies, mockActionLogs } from '../../mock/mockData';
import { useAuthStore, canAct } from '../../store/authStore';

// The underlying engine info (broker/model/optimizer/etc.) is kept here for
// internal reference (e.g. a future admin/diagnostics panel) but is no longer
// rendered on the main dashboard — plant/ops users don't need implementation
// details to act on a cost recommendation.
const SHOW_ENGINE_ARCHITECTURE = false;
const ENGINE_ARCHITECTURE = [
  { label: 'Streaming Broker', value: 'Kafka 3.6', color: 'text-emerald-700' },
  { label: 'Anomaly Model', value: 'IsoForest (0.02)', color: 'text-sky-700' },
  { label: 'Explainability', value: 'SHAP Tree', color: 'text-violet-700' },
  { label: 'Optimizer', value: 'PuLP / OR-Tools', color: 'text-amber-700' },
  { label: 'Feedback Loop', value: 'Airflow 7-Day', color: 'text-emerald-700' },
];

export const Sidebar: React.FC = () => {
  const openAnomaliesCount = mockAnomalies.filter((a) => a.status === 'open').length;
  const pendingActionsCount = mockActionLogs.filter((a) => a.trackingStatus === 'pending_verification').length;
  const role = useAuthStore((s) => s.user?.role);

  // Short, plain labels — this is app navigation, not a marketing sitemap.
  // Only count badges (actionable state) survive; decorative tech/product
  // labels ("AI Insights", "Gemini 2.5", ...) were dropped.
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    {
      to: '/anomalies',
      label: 'Anomalies',
      icon: AlertTriangle,
      badge: openAnomaliesCount > 0 ? `${openAnomaliesCount}` : null,
      badgeColor: 'bg-rose-100 text-rose-700',
    },
    { to: '/rootcause', label: 'Root Cause', icon: GitFork, badge: null },
    // What-If runs a scenario, gated to Operator/Admin on the backend
    // (see backend/app/api/whatif.py) — hide the link for a Viewer rather
    // than let them land on a page whose only action always 403s.
    ...(canAct(role) ? [{ to: '/whatif', label: 'What-If', icon: Sliders, badge: null }] : []),
    { to: '/copilot', label: 'Co-Pilot', icon: Bot, badge: null },
    {
      to: '/actions',
      label: 'Actions',
      icon: CheckCircle2,
      badge: pendingActionsCount > 0 ? `${pendingActionsCount}` : null,
      badgeColor: 'bg-amber-100 text-amber-700',
    },
    { to: '/reports', label: 'Reports', icon: FileBarChart2, badge: null },
  ];

  return (
    <aside className="flex w-52 shrink-0 flex-col bg-[#EBF0F7] border-r border-slate-300/60 p-2.5">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-100 text-sky-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Internal engine details — hidden from the sidebar by design; see
          SHOW_ENGINE_ARCHITECTURE above. Kept in code, not the UI. */}
      {SHOW_ENGINE_ARCHITECTURE && (
        <div className="neu-card-sm mt-4 p-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-300/60">
            <span className="text-[11px] font-mono font-bold text-slate-700 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-sky-600" />
              Engine Architecture
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 space-y-1.5 text-[11px] font-mono">
            {ENGINE_ARCHITECTURE.map((row) => (
              <div key={row.label} className="flex justify-between text-slate-500">
                <span>{row.label}</span>
                <span className={`font-semibold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
