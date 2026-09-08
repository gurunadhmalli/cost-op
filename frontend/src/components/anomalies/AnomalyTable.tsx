import React from 'react';
import { Anomaly, Severity, AnomalyStatus } from '../../types';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFilterStore } from '../../store/filterStore';
import { formatCurrency, timeAgo } from '../../utils/formatters';

interface AnomalyTableProps {
  anomalies: Anomaly[];
  selectedAnomaly: Anomaly | null;
  onSelectAnomaly: (anomaly: Anomaly) => void;
}

export const AnomalyTable: React.FC<AnomalyTableProps> = ({
  anomalies,
  selectedAnomaly,
  onSelectAnomaly,
}) => {
  const { currency } = useFilterStore();

  const severityBadge = (sev: Severity) => {
    switch (sev) {
      case 'high':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'low':
        return 'bg-sky-100 text-sky-800 border-sky-300';
    }
  };

  const statusBadge = (st: AnomalyStatus) => {
    switch (st) {
      case 'open':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'investigating':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="overflow-x-auto">
      {/*
        min-w keeps every column readable on one line; below that width the
        wrapper scrolls horizontally within this panel instead of squeezing
        asset names into 3-line wraps — a page never scrolls sideways, but a
        dense data table scrolling within its own panel is normal, expected
        behavior on narrow screens.
      */}
      <table className="w-full min-w-[720px] text-left text-xs font-mono">
        <thead className="border-b border-slate-300/80 text-[10px] text-slate-400 uppercase font-bold">
          <tr>
            <th className="py-2 px-2">Asset</th>
            <th className="py-2 px-2">Deviation</th>
            <th className="py-2 px-2">AI Score</th>
            <th className="py-2 px-2">Cost/day</th>
            <th className="py-2 px-2">Severity</th>
            <th className="py-2 px-2">Status</th>
            <th className="py-2 px-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {anomalies.map((anom) => {
            const isSelected = selectedAnomaly?.anomalyId === anom.anomalyId;
            const deviationPct = (
              ((anom.currentValue - anom.baselineValue) / anom.baselineValue) *
              100
            ).toFixed(1);

            return (
              <tr
                key={anom.anomalyId}
                onClick={() => onSelectAnomaly(anom)}
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'bg-sky-50 border-l-2 border-sky-600' : 'hover:bg-slate-100/60'
                }`}
              >
                <td className="py-2 px-2">
                  <div className="font-sans font-bold text-slate-800 text-xs">
                    {anom.assetName}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {anom.assetId} &bull; Line {anom.lineId}
                  </div>
                </td>

                <td className="py-2 px-2">
                  <div className="font-bold text-slate-900">
                    {anom.currentValue} {anom.unit}
                  </div>
                  <div className="text-[10px] text-rose-600 font-semibold">
                    +{deviationPct}% vs {anom.baselineValue} {anom.unit}
                  </div>
                </td>

                <td className="py-2 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800">{anom.anomalyScore.toFixed(2)}</span>
                    <div className="h-1.5 w-10 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-rose-500"
                        style={{ width: `${anom.anomalyScore * 100}%` }}
                      />
                    </div>
                  </div>
                </td>

                <td className="py-2 px-2">
                  <div className="font-bold text-rose-600">
                    {formatCurrency(anom.estimatedCostImpactPerDay, currency)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {timeAgo(anom.detectedAt)}
                  </div>
                </td>

                <td className="py-2 px-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] uppercase font-bold border ${severityBadge(
                      anom.severity
                    )}`}
                  >
                    {anom.severity}
                  </span>
                </td>

                <td className="py-2 px-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] uppercase font-bold border ${statusBadge(
                      anom.status
                    )}`}
                  >
                    {anom.status}
                  </span>
                </td>

                <td className="py-2 px-2 text-right">
                  <Link
                    to={`/rootcause?anomalyId=${anom.anomalyId}`}
                    className="inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-50"
                  >
                    View
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
