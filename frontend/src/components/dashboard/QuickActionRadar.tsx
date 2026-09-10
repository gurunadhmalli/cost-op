import React, { useState } from 'react';
import { ArrowRight, Lock, ShieldCheck, Zap, Wrench } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useFilterStore } from '../../store/filterStore';
import { useAuthStore, canAct } from '../../store/authStore';
import { formatCurrency } from '../../utils/formatters';
import { api } from '../../services/api';
import { Recommendation } from '../../types';

interface QuickActionRadarProps {
  recommendations: Recommendation[];
  onImplemented: () => void;
}

export const QuickActionRadar: React.FC<QuickActionRadarProps> = ({ recommendations, onImplemented }) => {
  const { currency } = useFilterStore();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canImplement = canAct(role);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const handleImplement = async (recId: string) => {
    setPendingId(recId);
    setErrorId(null);
    try {
      await api.implementAction(recId, 'Plant Ops Manager (Quick Action)', 'Implemented via Command Center Radar');
      onImplemented();
      navigate('/actions');
    } catch {
      // Surface the failure instead of silently navigating as if it worked —
      // this was the actual cause of "Implement Now doesn't do anything":
      // fetch() doesn't throw on a 404/409, so a failed implement used to be
      // treated as a success.
      setErrorId(recId);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="neu-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">Recommendations</h3>
        <Link
          to="/whatif"
          className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold text-sky-700 hover:text-sky-900"
        >
          What-If Sandbox
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {recommendations.length === 0 && (
        <p className="py-6 text-center text-xs text-slate-400">No recommendations yet</p>
      )}

      {/*
        Compact rows, not stacked cards — the top recommendation is already
        surfaced prominently in the PrimaryAlert panel above; this list is
        supporting detail, so it stays quiet and scannable.
      */}
      <div className="mt-1 divide-y divide-slate-200">
        {recommendations.map((rec) => {
          const isEnergy = rec.category === 'Energy';
          return (
            <div key={rec.recommendationId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md neu-inset-sm ${
                    isEnergy ? 'text-amber-600' : 'text-sky-600'
                  }`}
                >
                  {isEnergy ? <Zap className="h-3.5 w-3.5" /> : <Wrench className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">{rec.title}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {rec.assetId} &middot; {rec.category} &middot; {(rec.confidence * 100).toFixed(0)}% confidence
                  </p>
                  {errorId === rec.recommendationId && (
                    <p className="text-[11px] font-semibold text-rose-600">Couldn't implement — try again</p>
                  )}
                </div>
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-3">
                <div className="text-right font-mono whitespace-nowrap">
                  <p className="text-xs font-bold text-emerald-700">
                    {formatCurrency(rec.projectedSavings, currency, true)}
                  </p>
                  <p className="text-[10px] text-slate-400">{rec.paybackDays}d payback</p>
                </div>

                {rec.status === 'open' && !canImplement ? (
                  <span
                    className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded bg-slate-100 border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-500"
                    title="Viewer access is read-only — an Operator or Admin can implement this"
                  >
                    <Lock className="h-3 w-3 shrink-0" />
                    View only
                  </span>
                ) : rec.status === 'open' ? (
                  <button
                    onClick={() => handleImplement(rec.recommendationId)}
                    disabled={pendingId === rec.recommendationId}
                    className="neu-btn-primary shrink-0 whitespace-nowrap rounded px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-60"
                  >
                    {pendingId === rec.recommendationId ? 'Implementing…' : 'Implement'}
                  </button>
                ) : rec.status === 'implemented' ? (
                  <span className="shrink-0 whitespace-nowrap rounded bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] font-semibold text-amber-700">
                    7-Day Verification
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded bg-emerald-50 border border-emerald-200 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                    <ShieldCheck className="h-3 w-3 shrink-0" />
                    Verified
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
