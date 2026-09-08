import React from 'react';
import { WhatIfCandidateAction } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useFilterStore } from '../../store/filterStore';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';

interface OptimizationMatrixProps {
  scenarios: WhatIfCandidateAction[];
}

export const OptimizationMatrix: React.FC<OptimizationMatrixProps> = ({ scenarios }) => {
  const { currency } = useFilterStore();
  const navigate = useNavigate();

  const handleImplement = async (scenario: WhatIfCandidateAction) => {
    await api.implementAction(
      `REC-OPT-${scenario.id}`,
      'Optimization Sandbox Committal',
      `Implemented ${scenario.action}`
    );
    navigate('/actions');
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs font-mono">
        <thead className="border-b border-slate-300/80 bg-slate-200/50 text-[11px] text-slate-500 uppercase font-bold">
          <tr>
            <th className="py-3 px-4">Rank</th>
            <th className="py-3 px-4">Candidate Action</th>
            <th className="py-3 px-4">Est. Cost</th>
            <th className="py-3 px-4">Downtime</th>
            <th className="py-3 px-4">Energy &Delta;</th>
            <th className="py-3 px-4">Projected Savings</th>
            <th className="py-3 px-4">Payback</th>
            <th className="py-3 px-4">Feasibility</th>
            <th className="py-3 px-4 text-right">Commit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-300/60">
          {scenarios.map((s) => (
            <tr key={s.id} className="hover:bg-slate-100/60 transition-colors">
              <td className="py-3.5 px-4 font-extrabold text-sky-700">#{s.rank}</td>
              <td className="py-3.5 px-4">
                <div className="font-sans font-bold text-slate-800 text-xs">{s.action}</div>
                <div className="text-[11px] text-slate-500 max-w-xs truncate">{s.description}</div>
              </td>
              <td className="py-3.5 px-4 text-slate-800 font-semibold">
                {s.estimatedCost === 0 ? '₹0 (Free)' : formatCurrency(s.estimatedCost, currency)}
              </td>
              <td className="py-3.5 px-4 text-slate-700">{s.downtimeHours}h</td>
              <td className="py-3.5 px-4 text-emerald-700 font-extrabold">-{s.energyReductionPct}%</td>
              <td className="py-3.5 px-4 text-emerald-700 font-extrabold">
                {formatCurrency(s.projectedSavingsQuarter, currency, true)} / Qtr
              </td>
              <td className="py-3.5 px-4 font-bold text-slate-800">
                {s.paybackDays === 0 ? 'Immediate' : `${s.paybackDays} days`}
              </td>
              <td className="py-3.5 px-4">
                {s.feasible ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    Feasible
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-300" title={s.constraintViolations?.[0]}>
                    <XCircle className="h-3 w-3" />
                    Constraint Breach
                  </span>
                )}
              </td>
              <td className="py-3.5 px-4 text-right">
                {s.feasible && (
                  <button
                    onClick={() => handleImplement(s)}
                    className="neu-btn-primary rounded-xl px-3.5 py-1.5 text-[11px] font-bold transition-transform active:scale-95"
                  >
                    Select Action
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
