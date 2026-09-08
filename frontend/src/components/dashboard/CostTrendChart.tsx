import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { AlertCircle } from 'lucide-react';
import { CostSummary } from '../../types';
import { useFilterStore } from '../../store/filterStore';

interface CostTrendChartProps {
  data: CostSummary;
}

export const CostTrendChart: React.FC<CostTrendChartProps> = ({ data }) => {
  const { currency, currencyRate } = useFilterStore();

  const chartData = data.trend.map((item) => ({
    ...item,
    actualCostConverted: item.actualCost * currencyRate,
    baselineCostConverted: item.baselineCost * currencyRate,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const actual = payload.find((p: any) => p.dataKey === 'actualCostConverted')?.value;
      const baseline = payload.find((p: any) => p.dataKey === 'baselineCostConverted')?.value;
      const variance = actual && baseline ? (((actual - baseline) / baseline) * 100).toFixed(1) : '0';

      return (
        <div className="rounded-md border border-slate-200 bg-white p-2.5 text-xs shadow-sm">
          <p className="font-mono font-bold text-slate-700">{label}</p>
          <div className="mt-1 space-y-0.5 font-mono">
            <p>
              Actual: <span className="font-bold text-rose-600">{currency === 'INR' ? '₹' : '$'}{actual?.toFixed(2)}</span>
            </p>
            <p>
              Baseline: <span className="font-bold text-sky-700">{currency === 'INR' ? '₹' : '$'}{baseline?.toFixed(2)}</span>
            </p>
            <p className={Number(variance) > 5 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
              {Number(variance) > 0 ? `+${variance}%` : `${variance}%`} vs baseline
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="neu-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-800">Cost Trend</h3>
          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-rose-700">
            +9.6%
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-rose-600" /> Actual
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-sky-600" /> Baseline
          </span>
        </div>
      </div>

      {/*
        Two stacked single-axis charts sharing one time axis, instead of one
        chart with a dual y-axis. Cost (₹/unit) and Volume (units) are
        different quantities on different scales, so overlaying them on two
        y-axes in the same plot invites misreading distance-between-lines as
        meaningful — the classic dual-axis chart trap. Splitting them into an
        upper cost chart and a thin lower volume strip keeps each chart to a
        single, honestly-scaled y-axis while still showing both signals
        against the same timeline. Kept compact (h-36/h-9) since the chart is
        supporting detail, not the primary decision surface.
      */}
      <div className="mt-2 h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="timestamp" stroke="#94A3B8" tick={{ fill: '#94A3B8', fontSize: 10 }} hide />
            <YAxis
              domain={['auto', 'auto']}
              stroke="#94A3B8"
              tick={{ fill: '#94A3B8', fontSize: 10 }}
              tickFormatter={(v) => (currency === 'INR' ? `₹${v}` : `$${v}`)}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="baselineCostConverted"
              stroke="#0284C7"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="actualCostConverted"
              stroke="#E11D48"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: '#E11D48', stroke: '#FFFFFF', strokeWidth: 1.5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="h-9 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 6, left: -20, bottom: 0 }}>
            <XAxis dataKey="timestamp" stroke="#94A3B8" tick={{ fill: '#94A3B8', fontSize: 9 }} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="units" fill="#CBD5E1" radius={[2, 2, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-[11px]">
        <div className="flex min-w-0 items-center gap-1.5 text-slate-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span className="truncate">Cost rose after Aug 20 — Extruder 3A thermal choking</span>
        </div>
        <div className="shrink-0 whitespace-nowrap font-mono font-bold text-slate-500">
          Target: {currency === 'INR' ? '₹39.10' : '$0.47'}
        </div>
      </div>
    </div>
  );
};
