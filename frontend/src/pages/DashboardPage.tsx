import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingDown,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { KPICard } from '../components/dashboard/KPICard';
import { PrimaryAlert } from '../components/dashboard/PrimaryAlert';
import { CostTrendChart } from '../components/dashboard/CostTrendChart';
import { ABCBreakdownChart } from '../components/dashboard/ABCBreakdownChart';
import { AssetLiveGrid } from '../components/dashboard/AssetLiveGrid';
import { QuickActionRadar } from '../components/dashboard/QuickActionRadar';
import { api } from '../services/api';
import { CostSummary, Anomaly, Recommendation } from '../types';
import { useFilterStore } from '../store/filterStore';
import { formatCurrency } from '../utils/formatters';
import { useLiveFeed } from '../hooks/useLiveFeed';

export const DashboardPage: React.FC = () => {
  const { plantId, lineId, dateRange, currency } = useFilterStore();
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const refetchRecommendations = () => api.getRecommendations().then(setRecommendations);

  useEffect(() => {
    api.getCostSummary(plantId, lineId, dateRange).then(setCostSummary);
    api.getAnomalies().then(setAnomalies);
    refetchRecommendations();
  }, [plantId, lineId, dateRange]);

  // Every live-simulator tick (backend/app/simulator/live_feed.py, pushed
  // over /ws/live) may have appended new cost/telemetry data or opened a
  // fresh anomaly — refetch so the dashboard reflects an actually-live feed,
  // not a one-time snapshot. A new anomaly always comes with a new
  // recommendation (see live_feed.py tick()), so the same trigger covers both.
  useLiveFeed((event) => {
    if (event.type !== 'tick') return;
    api.getCostSummary(plantId, lineId, dateRange).then(setCostSummary);
    if (event.new_anomalies?.length) {
      api.getAnomalies().then(setAnomalies);
      refetchRecommendations();
    }
  });

  if (!costSummary) return null;

  return (
    <div className="space-y-4">
      {/* STATUS: one compact metric strip instead of four large cards */}
      <div className="neu-card grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-4 sm:divide-y-0">
        <KPICard
          title="Cost / Unit"
          value={formatCurrency(costSummary.costPerUnit, currency)}
          subtitle={`Target ${formatCurrency(costSummary.baselineCostPerUnit, currency)}`}
          change="+9.6%"
          changeType="negative"
          icon={DollarSign}
          color="rose"
        />
        <KPICard
          title="Savings Available"
          value={formatCurrency(550000, currency, true)}
          subtitle="Top 3 actions"
          change="2-6 day payback"
          changeType="positive"
          icon={TrendingDown}
          color="emerald"
        />
        <KPICard
          title="Open Anomalies"
          value={`${anomalies.filter((a) => a.status === 'open').length}`}
          subtitle="AI detection active"
          change="₹27.6k/day"
          changeType="negative"
          icon={AlertTriangle}
          color="amber"
        />
        <KPICard
          title="Plant OEE"
          value="84.2%"
          subtitle="Target 88.0%"
          change="-3.8%"
          changeType="negative"
          icon={Activity}
          color="cyan"
        />
      </div>

      {/* PROBLEM -> ACTION -> SAVINGS, in one glance */}
      <PrimaryAlert recommendations={recommendations} />

      {/* Supporting detail: cost trend + cost breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <CostTrendChart data={costSummary} />
        </div>
        <div className="lg:col-span-5">
          <ABCBreakdownChart data={costSummary} />
        </div>
      </div>

      {/* Supporting detail: live assets + full recommendation list */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <AssetLiveGrid />
        </div>
        <div className="lg:col-span-5">
          <QuickActionRadar recommendations={recommendations} onImplemented={refetchRecommendations} />
        </div>
      </div>
    </div>
  );
};
