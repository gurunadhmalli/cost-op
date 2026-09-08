import React from 'react';
import { Zap, Users, Box, Building, AlertTriangle } from 'lucide-react';
import { CostSummary } from '../../types';
import { useFilterStore } from '../../store/filterStore';
import { formatCurrency } from '../../utils/formatters';

interface ABCBreakdownChartProps {
  data: CostSummary;
}

// Single source of truth for the "Energy is over baseline" figure so the
// Cost Breakdown row and the dashboard's PrimaryAlert headline never show
// two different numbers for the same claim.
export const ENERGY_BASELINE_OVERAGE_PCT = 28;

export const ABCBreakdownChart: React.FC<ABCBreakdownChartProps> = ({ data }) => {
  const { currency } = useFilterStore();
  const { breakdown, costPerUnit } = data;

  // `breakdown.*` fields are totals for the selected date range (same basis as
  // totalMonthlyCost), while `costPerUnit` is a per-unit figure — dividing a
  // range total by a per-unit value produced nonsensical percentages (e.g.
  // "1250953.7%"). A category's share of cost must be computed against the
  // sum of the other categories on the SAME basis, so it always lands in 0-100%.
  const totalBreakdown =
    breakdown.materialCost + breakdown.energyCost + breakdown.laborCost + breakdown.allocatedOverhead;
  const shareOfTotal = (categoryCost: number) =>
    totalBreakdown > 0 ? ((categoryCost / totalBreakdown) * 100).toFixed(1) : '0.0';

  const items = [
    {
      name: 'Raw Materials',
      rawINR: breakdown.materialCost,
      color: '#0284C7',
      icon: Box,
      pct: shareOfTotal(breakdown.materialCost),
      status: 'Normal',
    },
    {
      name: 'Energy',
      rawINR: breakdown.energyCost,
      color: '#E11D48',
      icon: Zap,
      pct: shareOfTotal(breakdown.energyCost),
      status: `${ENERGY_BASELINE_OVERAGE_PCT}% above baseline`,
      isWarning: true,
    },
    {
      name: 'Direct Labor',
      rawINR: breakdown.laborCost,
      color: '#059669',
      icon: Users,
      pct: shareOfTotal(breakdown.laborCost),
      status: 'Normal',
    },
    {
      name: 'Overhead',
      rawINR: breakdown.allocatedOverhead,
      color: '#7C3AED',
      icon: Building,
      pct: shareOfTotal(breakdown.allocatedOverhead),
      status: 'Normal',
    },
  ];

  return (
    <div className="neu-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">Cost Breakdown</h3>
        <span className="shrink-0 whitespace-nowrap font-mono text-xs font-semibold text-slate-500">
          {formatCurrency(costPerUnit, currency)} / unit
        </span>
      </div>

      {/* Proportion bar — quick visual read, no chart real estate wasted */}
      <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        {items.map((item) => (
          <div
            key={item.name}
            style={{ width: `${item.pct}%`, backgroundColor: item.color }}
            title={`${item.name}: ${item.pct}%`}
          />
        ))}
      </div>

      <div className="mt-1 divide-y divide-slate-200">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.name} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: item.color }} />
                <span className="truncate font-semibold text-slate-700">{item.name}</span>
                <span className="shrink-0 font-mono text-[11px] text-slate-400">{item.pct}%</span>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-3 font-mono">
                <span className="font-bold text-slate-900 whitespace-nowrap">
                  {formatCurrency(item.rawINR, currency, true)}
                </span>
                <span
                  className={`flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold ${
                    item.isWarning ? 'text-rose-600' : 'text-slate-400'
                  }`}
                >
                  {item.isWarning && <AlertTriangle className="h-3 w-3 shrink-0" />}
                  {item.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
