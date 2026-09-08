import React, { useEffect, useState } from 'react';
import {
  Clock,
} from 'lucide-react';
import { api } from '../services/api';
import { ActionLog } from '../types';
import { formatCurrency, timeAgo } from '../utils/formatters';
import { useFilterStore } from '../store/filterStore';

export const ActionTrackerPage: React.FC = () => {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const { currency } = useFilterStore();

  useEffect(() => {
    api.getActionLogs().then(setLogs);
  }, []);

  const totalVerifiedSavings = logs
    .filter((l) => l.trackingStatus === 'verified' && l.verifiedSavings)
    .reduce((acc, l) => acc + (l.verifiedSavings || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 neu-card p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-800 font-sans">
              Closed-Loop Action Tracker & Continuous Learning Hub
            </h2>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-mono font-bold text-emerald-800 border border-emerald-300">
              Layer 6 Closed Feedback Loop
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tracks implemented optimizations, automated 7-day KPI re-measurement, and baseline recalibration.
          </p>
        </div>

        <div className="neu-inset rounded-2xl px-5 py-3 text-right">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">
            Total Verified ROI (QTD)
          </span>
          <p className="text-xl font-extrabold font-mono text-emerald-700">
            {formatCurrency(totalVerifiedSavings, currency)}
          </p>
        </div>
      </div>

      {/* Action Logs List */}
      <div className="space-y-4">
        {logs.map((log) => {
          const isPending = log.trackingStatus === 'pending_verification';

          return (
            <div
              key={log.actionId}
              className={`rounded-2xl p-5 transition-all ${
                isPending
                  ? 'neu-card border-2 border-amber-300 bg-amber-50/30 shadow-[6px_6px_18px_rgba(217,119,6,0.18),-6px_-6px_18px_#ffffff]'
                  : 'neu-card'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-sky-800 font-bold">{log.actionId}</span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${
                        isPending
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {isPending ? '7-Day Verification Clock Running' : 'Savings Verified & Model Recalibrated'}
                    </span>
                    <span className="text-xs font-mono text-slate-500 font-semibold">{log.assetId}</span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-800 font-sans mt-1.5">
                    {log.recommendationTitle}
                  </h3>

                  <p className="text-xs text-slate-600 mt-1 font-medium">
                    Implemented by <strong className="text-slate-900 font-bold">{log.implementedBy}</strong> &bull; {timeAgo(log.implementedAt)}
                  </p>

                  <p className="text-xs text-slate-700 mt-2.5 neu-inset p-3 rounded-xl font-mono">
                    Notes: {log.notes}
                  </p>
                </div>

                {/* Savings & Timer Metric */}
                <div className="text-right font-mono shrink-0">
                  {isPending ? (
                    <div className="rounded-2xl neu-inset p-3.5 text-center min-w-[190px]">
                      <div className="flex items-center justify-center gap-1.5 text-xs text-amber-700 font-bold">
                        <Clock className="h-4 w-4 animate-spin text-amber-600" />
                        <span>7-Day Re-Measure Clock</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                        Due: {new Date(log.verificationDue).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slate-800 mt-1 font-bold">
                        Projected: {formatCurrency(log.projectedSavings, currency, true)}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl neu-inset p-3.5 text-right min-w-[190px]">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">
                        Verified Actual Savings
                      </span>
                      <p className="text-base font-extrabold text-emerald-700">
                        {formatCurrency(log.verifiedSavings || 0, currency)}
                      </p>
                      <p className="text-[10px] text-emerald-800 mt-0.5 font-bold">
                        +{log.variancePct}% vs Projection
                      </p>
                      <span className="mt-1 inline-block text-[9px] text-slate-500 font-medium">
                        Model: {log.recalibrationModelId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
