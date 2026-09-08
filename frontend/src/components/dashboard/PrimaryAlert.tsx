import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useFilterStore } from '../../store/filterStore';
import { formatCurrency } from '../../utils/formatters';
import { Recommendation } from '../../types';

interface PrimaryAlertProps {
  recommendations: Recommendation[];
}

// The one thing a plant manager needs to see first: what's wrong, what to do
// about it, and what it's worth — everything else on the dashboard is detail
// behind this. Reuses the same top-ranked recommendation QuickActionRadar
// already lists (fetched from the real backend, not mock data — recommendation
// IDs must be real for the "Implement Now" flow below to work).
//
// The headline used to hardcode "Energy cost is 28% above baseline" —
// correct only when the top open item happened to be that specific anomaly.
// Real recommendation categories are Maintenance/Environment/Process/Material
// (see backend/app/engines/rootcause_engine.py), never literally "Energy",
// so that hardcoded claim would misdescribe almost anything else. Building
// the headline from the actual top-open recommendation is correct regardless
// of which one that ends up being.
export const PrimaryAlert: React.FC<PrimaryAlertProps> = ({ recommendations }) => {
  const { currency } = useFilterStore();
  const topAction = recommendations.find((r) => r.status === 'open') ?? recommendations[0];

  if (!topAction) return null;

  return (
    <div className="neu-card flex flex-col gap-3 border-l-[3px] border-l-rose-500 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-100 text-rose-600">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wide text-rose-600">
            Action Required
          </span>
          <h2 className="text-sm font-bold text-slate-900">
            {topAction.category} issue on {topAction.assetName}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Recommended: <span className="text-slate-700">{topAction.title}</span>
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 pt-3 md:justify-end md:border-t-0 md:pt-0">
        <div className="font-mono">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Potential Savings
          </p>
          <p className="text-base font-bold text-emerald-700">
            {formatCurrency(topAction.projectedSavings, currency, true)}
            <span className="text-xs font-medium text-slate-500"> / qtr</span>
          </p>
        </div>
        <Link
          to="/whatif"
          className="neu-btn-primary flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-3.5 py-2 text-xs font-bold"
        >
          Review Action
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
};
