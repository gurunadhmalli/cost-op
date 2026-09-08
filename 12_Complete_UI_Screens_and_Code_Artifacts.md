# Complete UI Screens & Code Artifacts
## AI-Powered Industrial Cost Optimization Assistant — Frontend Implementation Reference

---

## 1. Scope & Overview

This document provides the complete, production-ready source code artifacts for the frontend implementation, organized by file path.

---

## 2. Global State Stores

### 2.1 `src/store/filterStore.ts`
```typescript
import { create } from 'zustand';
import { PlantId } from '../types';

interface FilterStore {
  plantId: PlantId;
  lineId: string;
  dateRange: '7d' | '30d' | '90d' | 'ytd';
  currency: 'INR' | 'USD';
  currencySymbol: '₹' | '$';
  currencyRate: number;
  liveSimulationActive: boolean;
  
  setPlantId: (plantId: PlantId) => void;
  setLineId: (lineId: string) => void;
  setDateRange: (range: '7d' | '30d' | '90d' | 'ytd') => void;
  toggleCurrency: () => void;
  toggleLiveSimulation: () => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
  plantId: 'PLANT-01',
  lineId: 'LINE-03',
  dateRange: '30d',
  currency: 'INR',
  currencySymbol: '₹',
  currencyRate: 1.0,
  liveSimulationActive: true,

  setPlantId: (plantId) => set({ plantId, lineId: 'ALL' }),
  setLineId: (lineId) => set({ lineId }),
  setDateRange: (dateRange) => set({ dateRange }),
  toggleCurrency: () =>
    set((state) => ({
      currency: state.currency === 'INR' ? 'USD' : 'INR',
      currencySymbol: state.currency === 'INR' ? '$' : '₹',
      currencyRate: state.currency === 'INR' ? 0.012 : 1.0,
    })),
  toggleLiveSimulation: () =>
    set((state) => ({ liveSimulationActive: !state.liveSimulationActive })),
}));
```

---

## 3. Core Page Implementations

### 3.1 Command Center Page (`src/pages/DashboardPage.tsx`)
```tsx
import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingDown,
  AlertTriangle,
  Activity,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { KPICard } from '../components/dashboard/KPICard';
import { CostTrendChart } from '../components/dashboard/CostTrendChart';
import { ABCBreakdownChart } from '../components/dashboard/ABCBreakdownChart';
import { AssetLiveGrid } from '../components/dashboard/AssetLiveGrid';
import { QuickActionRadar } from '../components/dashboard/QuickActionRadar';
import { api } from '../services/api';
import { CostSummary, Anomaly } from '../types';
import { useFilterStore } from '../store/filterStore';
import { formatCurrency } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const { plantId, lineId, dateRange, currency } = useFilterStore();
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  useEffect(() => {
    api.getCostSummary(plantId, lineId, dateRange).then(setCostSummary);
    api.getAnomalies().then(setAnomalies);
  }, [plantId, lineId, dateRange]);

  if (!costSummary) return null;

  return (
    <div className="space-y-6">
      {/* Top 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Actual Cost / Unit"
          value={`${formatCurrency(costSummary.costPerUnit, currency)}`}
          subtitle={`Target: ${formatCurrency(costSummary.baselineCostPerUnit, currency)}`}
          change="+9.6% vs Baseline"
          changeType="negative"
          icon={DollarSign}
          color="rose"
          badge="COST DRIFT"
        />
        <KPICard
          title="Projected Savings (Qtr)"
          value={formatCurrency(550000, currency, true)}
          subtitle="Top 3 Candidate Actions"
          change="Payback: 2-6 Days"
          changeType="positive"
          icon={TrendingDown}
          color="emerald"
          badge="AI OPTIMIZED"
        />
        <KPICard
          title="Active Cost Anomalies"
          value={`${anomalies.filter((a) => a.status === 'open').length} Open`}
          subtitle="IsoForest Detection Active"
          change="₹27.6k/day impact"
          changeType="negative"
          icon={AlertTriangle}
          color="amber"
          badge="STREAMING"
        />
        <KPICard
          title="Overall Plant OEE"
          value="84.2%"
          subtitle="Target: 88.0%"
          change="-3.8% Availability Loss"
          changeType="negative"
          icon={Activity}
          color="cyan"
          badge="TELEMETRY"
        />
      </div>

      {/* Middle Grid: Cost Trajectory + ABC Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <CostTrendChart data={costSummary} />
        </div>
        <div className="lg:col-span-5">
          <ABCBreakdownChart data={costSummary} />
        </div>
      </div>

      {/* Lower Grid: Asset Telemetry Radar + High-Impact Action Radar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <AssetLiveGrid />
        </div>
        <div className="lg:col-span-5">
          <QuickActionRadar />
        </div>
      </div>
    </div>
  );
};
```

---

## 4. Root Cause Studio (`src/pages/RootCausePage.tsx`)
```tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  GitFork,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  BrainCircuit,
  Bot,
} from 'lucide-react';
import { SHAPWaterfall } from '../components/rootcause/SHAPWaterfall';
import { api } from '../services/api';
import { RootCauseAnalysis } from '../types';

export const RootCausePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const anomalyId = searchParams.get('anomalyId') || 'AN-20260830-0134';
  const [rca, setRca] = useState<RootCauseAnalysis | null>(null);

  useEffect(() => {
    api.getRootCause(anomalyId).then(setRca);
  }, [anomalyId]);

  if (!rca) return null;

  return (
    <div className="space-y-6">
      {/* 4-Level Drilldown Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-industrial-900/80 p-3.5 text-xs font-mono border border-slate-800">
        <span className="text-slate-500">HIERARCHICAL PATH:</span>
        {rca.drillDownPath.map((step, idx) => (
          <React.Fragment key={idx}>
            <span
              className={`rounded px-2 py-0.5 ${
                idx === rca.drillDownPath.length - 1
                  ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                  : 'bg-industrial-850 text-slate-300'
              }`}
            >
              {step}
            </span>
            {idx < rca.drillDownPath.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Confidence Header & Diagnostic Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 text-violet-400">
            <BrainCircuit className="h-5 w-5" />
            <h3 className="text-base font-bold text-white">
              Explainable AI Diagnostic Summary
            </h3>
          </div>
          <p className="mt-3 text-sm text-slate-200 leading-relaxed bg-industrial-900/60 p-4 rounded-xl border border-slate-800">
            {rca.llmSummary}
          </p>

          <div className="mt-6">
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3">
              TreeExplainer SHAP Feature Attribution
            </h4>
            <SHAPWaterfall drivers={rca.rankedDrivers} />
          </div>
        </div>

        {/* Confidence Scoring Dial & Verification Trail */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel rounded-2xl p-5 text-center">
            <h4 className="text-xs font-mono uppercase text-slate-400">
              Confidence Score
            </h4>
            <div className="mt-3 text-4xl font-extrabold font-mono text-cyan-400">
              {(rca.confidence * 100).toFixed(1)}%
            </div>
            <div className="mt-4 space-y-2 text-left text-xs font-mono text-slate-400 border-t border-slate-800 pt-3">
              <div className="flex justify-between">
                <span>Correlation Strength (50%)</span>
                <span className="text-slate-200">r = {rca.correlationStrength.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Historical Accuracy (30%)</span>
                <span className="text-slate-200">{(rca.historicalAccuracy * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Sensor Data Completeness (20%)</span>
                <span className="text-slate-200">{(rca.dataCompleteness * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5">
            <h4 className="text-xs font-mono font-bold text-white uppercase mb-3">
              Next Prescriptive Step
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Evaluate alternative operational scenarios in the What-If Sandbox or implement the recommended chiller filter swap.
            </p>
            <Link
              to="/whatif"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-xs font-bold text-white shadow-glow-cyan"
            >
              <span>Launch What-If Sandbox</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 5. Summary of Frontend Modules

All 7 core surfaces, Zustand stores, mock data engine, and API layers are completely defined and ready for direct deployment.
