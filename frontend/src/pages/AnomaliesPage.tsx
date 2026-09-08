import React, { useState, useEffect } from 'react';
import { AnomalyTable } from '../components/anomalies/AnomalyTable';
import { TelemetryTimeline } from '../components/anomalies/TelemetryTimeline';
import { api } from '../services/api';
import { Anomaly } from '../types';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLiveFeed } from '../hooks/useLiveFeed';

export const AnomaliesPage: React.FC = () => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    api.getAnomalies(severityFilter, statusFilter).then((data) => {
      setAnomalies(data);
      if (data.length > 0 && !selectedAnomaly) {
        setSelectedAnomaly(data[0]);
      }
    });
  }, [severityFilter, statusFilter]);

  // Back the live indicator with a real refresh whenever the simulator
  // (backend/app/simulator/live_feed.py) reports a new anomaly over /ws/live.
  const { isLive } = useLiveFeed((event) => {
    if (event.type === 'tick' && event.new_anomalies?.length) {
      api.getAnomalies(severityFilter, statusFilter).then(setAnomalies);
    }
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 neu-card p-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-800">Anomalies</h2>
          <span
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
              isLive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {isLive ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="neu-btn rounded-md px-2 py-1 text-xs font-medium text-slate-700 cursor-pointer focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="neu-btn rounded-md px-2 py-1 text-xs font-medium text-slate-700 cursor-pointer focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Table (Left) + Detail (Right) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7 neu-card p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Active ({anomalies.length})
          </h3>
          <AnomalyTable
            anomalies={anomalies}
            selectedAnomaly={selectedAnomaly}
            onSelectAnomaly={setSelectedAnomaly}
          />
        </div>

        <div className="lg:col-span-5 neu-card space-y-3 p-3">
          {selectedAnomaly ? (
            <>
              <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-bold text-slate-800">
                    {selectedAnomaly.assetName}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {selectedAnomaly.metric} &bull; Score {selectedAnomaly.anomalyScore.toFixed(2)}
                  </p>
                </div>
                <Link
                  to={`/rootcause?anomalyId=${selectedAnomaly.anomalyId}`}
                  className="neu-btn-primary flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-bold"
                >
                  View Cause
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div>
                <h5 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Sensor Reading vs Expected Range
                </h5>
                <TelemetryTimeline anomaly={selectedAnomaly} />
              </div>

              <div className="rounded-md neu-inset p-2.5 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current</span>
                  <span className="font-bold text-rose-600">
                    {selectedAnomaly.currentValue} {selectedAnomaly.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expected</span>
                  <span className="font-bold text-slate-700">
                    {selectedAnomaly.baselineValue} {selectedAnomaly.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cost impact</span>
                  <span className="font-bold text-rose-600">
                    ₹{selectedAnomaly.estimatedCostImpactPerDay.toLocaleString()} / day
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-10 text-center text-xs text-slate-400">
              Select an anomaly to inspect
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
