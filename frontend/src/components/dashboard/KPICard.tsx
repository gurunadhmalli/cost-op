import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  color?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet';
}

const colorMap = {
  cyan: 'text-sky-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
  violet: 'text-violet-600',
};

// Compact metric-row cell — one item inside the dashboard's status strip.
// Deliberately not a standalone floating card: a plant operator scans a row
// of numbers, not four separate boxes.
export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeType = 'neutral',
  icon: Icon,
  color = 'cyan',
}) => {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-3">
      <Icon className={`h-4 w-4 shrink-0 ${colorMap[color]}`} />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg font-bold font-mono leading-tight text-slate-900">{value}</span>
          {change && (
            <span
              className={`flex items-center gap-0.5 text-[11px] font-semibold whitespace-nowrap ${
                changeType === 'positive'
                  ? 'text-emerald-600'
                  : changeType === 'negative'
                  ? 'text-rose-600'
                  : 'text-slate-500'
              }`}
            >
              {changeType === 'positive' ? (
                <TrendingDown className="h-3 w-3" />
              ) : changeType === 'negative' ? (
                <TrendingUp className="h-3 w-3" />
              ) : null}
              {change}
            </span>
          )}
        </div>
        {subtitle && <p className="truncate text-[11px] text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
};
