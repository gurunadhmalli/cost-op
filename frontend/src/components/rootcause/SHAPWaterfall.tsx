import React from 'react';
import { SHAPDriver } from '../../types';
import { Wrench, CloudSun, Box, Activity } from 'lucide-react';

interface SHAPWaterfallProps {
  drivers: SHAPDriver[];
}

export const SHAPWaterfall: React.FC<SHAPWaterfallProps> = ({ drivers }) => {
  const categoryIcon = (category: string) => {
    switch (category) {
      case 'Maintenance':
        return <Wrench className="h-4 w-4 text-rose-600" />;
      case 'Environment':
        return <CloudSun className="h-4 w-4 text-amber-600" />;
      case 'Material':
        return <Box className="h-4 w-4 text-sky-600" />;
      default:
        return <Activity className="h-4 w-4 text-violet-600" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-mono text-slate-500 pb-2 border-b border-slate-300/60 font-bold">
        <span>Identified Driver / Operational Feature</span>
        <div className="flex items-center gap-6">
          <span>Correlation</span>
          <span>Impact Contribution</span>
        </div>
      </div>

      {drivers.map((d, index) => {
        return (
          <div
            key={index}
            className="neu-card-sm p-4.5 transition-all hover:shadow-[7px_7px_16px_#cad4e2,-7px_-7px_16px_#ffffff]"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl neu-inset-sm">
                  {categoryIcon(d.category)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700">
                      {d.category}
                    </span>
                    <span className="text-xs font-mono text-rose-600 font-extrabold">
                      +{d.contributionPct}% Total Impact
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 mt-1">{d.driver}</h4>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">{d.description}</p>
                </div>
              </div>

              <div className="text-right font-mono shrink-0">
                <div className="text-sm font-extrabold text-slate-800">
                  r = {d.correlationStrength.toFixed(2)}
                </div>
                <div className="text-xs text-rose-600 font-bold">
                  &Delta; {d.shapValue > 0 ? `+${d.shapValue}` : d.shapValue} Impact
                </div>
              </div>
            </div>

            {/* Visual Contribution Bar */}
            <div className="mt-3.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 font-bold mb-1">
                <span>Variance Attribution</span>
                <span>{d.contributionPct}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full neu-inset overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-600 rounded-full"
                  style={{ width: `${d.contributionPct}%` }}
                />
              </div>
            </div>

            {/* Prescriptive Recommendation Callout */}
            <div className="mt-3.5 rounded-xl bg-sky-50/80 p-3 text-xs font-mono text-sky-900 border border-sky-200 flex items-start gap-2">
              <span className="font-bold text-sky-700 uppercase text-[10px] shrink-0 mt-0.5">
                Prescribed Fix:
              </span>
              <span className="font-medium">{d.recommendedFix}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
