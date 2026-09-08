import React, { useCallback, useEffect, useState } from 'react';
import { Sliders, Sparkles, Play } from 'lucide-react';
import { OptimizationMatrix } from '../components/whatif/OptimizationMatrix';
import { mockWhatIfScenarios } from '../mock/mockData';
import { WhatIfCandidateAction } from '../types';
import { api } from '../services/api';
import { useFilterStore } from '../store/filterStore';

export const WhatIfPage: React.FC = () => {
  const { lineId } = useFilterStore();
  const [tempTrim, setTempTrim] = useState<number>(-4);
  const [offPeakShift, setOffPeakShift] = useState<boolean>(true);
  const [filterSwap, setFilterSwap] = useState<boolean>(true);
  const [scenarios, setScenarios] = useState<WhatIfCandidateAction[]>(mockWhatIfScenarios);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [solverError, setSolverError] = useState<string | null>(null);

  const handleRunSolver = useCallback(async () => {
    setIsSolving(true);
    setSolverError(null);

    // Only candidate actions the user has actually enabled go to the LP solver.
    const candidateActions: Partial<WhatIfCandidateAction>[] = [
      {
        action: `Barrel Zone Temperature Profile Trim (${tempTrim}°C)`,
        estimatedCost: 0,
        downtimeHours: 0,
      },
    ];
    if (offPeakShift) {
      candidateActions.push({
        action: 'Shift Rescheduling (Off-Peak TOU Tariff)',
        estimatedCost: 3500,
        downtimeHours: 4.0,
      });
    }
    if (filterSwap) {
      candidateActions.push({
        action: 'Chiller Filter Cartridge Swap',
        estimatedCost: 1200,
        downtimeHours: 0.25,
      });
    }

    try {
      const { rankedScenarios } = await api.runWhatIf(lineId, candidateActions);
      setScenarios(rankedScenarios);
    } catch (err) {
      setSolverError(err instanceof Error ? err.message : 'Solver request failed');
    } finally {
      setIsSolving(false);
    }
  }, [lineId, tempTrim, offPeakShift, filterSwap]);

  useEffect(() => {
    handleRunSolver();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="neu-card p-5">
        <div className="flex items-center gap-2 text-sky-700">
          <Sliders className="h-5 w-5" />
          <h2 className="text-xl font-extrabold text-slate-800 font-sans">
            What-If Scenario Sandbox & Optimization Studio
          </h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Constraint-based optimization to find the best combination of actions within your cost, downtime, and risk limits.
        </p>
      </div>

      {/* Interactive Controls & Solver Settings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4 neu-card p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-300/60 pb-3">
            <h3 className="text-sm font-extrabold text-slate-800 font-sans">
              Parameter Adjustment Sliders
            </h3>
            <span className="text-[10px] font-mono text-sky-800 font-bold">AUTO-OPTIMIZED</span>
          </div>

          {/* Slider 1: Temperature Trim */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5 font-bold">
              <span className="text-slate-700">Extruder Temperature Trim:</span>
              <span className="text-sky-700">{tempTrim}°C</span>
            </div>
            <input
              type="range"
              min="-10"
              max="0"
              step="1"
              value={tempTrim}
              onChange={(e) => setTempTrim(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 mt-1 font-mono font-medium">
              Reduces heater band energy by approx 1.8% per °C
            </p>
          </div>

          {/* Toggle 2: Off-Peak TOU Tariff */}
          <div className="flex items-center justify-between p-3 rounded-2xl neu-inset">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Off-Peak Shift Tariff
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-medium">
                Reschedule heavy runs to 10PM - 6AM
              </span>
            </div>
            <input
              type="checkbox"
              checked={offPeakShift}
              onChange={(e) => setOffPeakShift(e.target.checked)}
              className="h-4 w-4 accent-sky-600 rounded cursor-pointer"
            />
          </div>

          {/* Toggle 3: Filter Swap */}
          <div className="flex items-center justify-between p-3 rounded-2xl neu-inset">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Chiller Filter Cartridge Swap
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-medium">
                15-min shift break replacement (₹1,200)
              </span>
            </div>
            <input
              type="checkbox"
              checked={filterSwap}
              onChange={(e) => setFilterSwap(e.target.checked)}
              className="h-4 w-4 accent-sky-600 rounded cursor-pointer"
            />
          </div>

          <button
            onClick={handleRunSolver}
            disabled={isSolving}
            className="w-full neu-btn-primary flex items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-bold transition-transform active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Play className={`h-4 w-4 ${isSolving ? 'animate-spin' : ''}`} />
            <span>{isSolving ? 'Re-Solving Linear Program...' : 'Re-Run Optimization Solver'}</span>
          </button>
          {solverError && (
            <p className="text-[11px] font-mono font-semibold text-rose-600">
              Solver error: {solverError}
            </p>
          )}
        </div>

        {/* Results Matrix */}
        <div className="lg:col-span-8 neu-card p-5">
          <div className="flex items-center justify-between border-b border-slate-300/60 pb-3 mb-4">
            <h3 className="text-sm font-extrabold text-slate-800 font-sans">
              Ranked Optimization Scenarios (Payback & Feasibility)
            </h3>
            <span className="text-xs font-mono text-emerald-700 font-extrabold">
              Minimizing: Total Operating Cost
            </span>
          </div>

          <OptimizationMatrix scenarios={scenarios} />

          <div className="mt-4 rounded-2xl neu-inset p-3.5 text-xs font-mono text-slate-700 flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 font-bold">Optimization Recommendation:</strong> Scenario #1 (Chiller Filter Replacement) yields highest quarterly ROI (₹5.50 Lakh) with minimal downtime (15 min) and fastest payback period (2 days).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
