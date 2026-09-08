import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockPlants } from '../../mock/mockData';
import { useFilterStore } from '../../store/filterStore';

export const AssetLiveGrid: React.FC = () => {
  const { plantId } = useFilterStore();
  const currentPlant = mockPlants.find((p) => p.id === plantId) || mockPlants[0];
  const allMachines = currentPlant.lines.flatMap((line) => line.machines);

  const statusConfig = {
    optimal: { label: 'Optimal', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    warning: { label: 'Warning', text: 'text-amber-700', dot: 'bg-amber-500' },
    critical: { label: 'Anomaly', text: 'text-rose-700', dot: 'bg-rose-500' },
    maintenance: { label: 'Scheduled PM', text: 'text-sky-700', dot: 'bg-sky-500' },
  };

  return (
    <div className="neu-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">Live Assets</h3>
        <Link
          to="/anomalies"
          className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold text-sky-700 hover:text-sky-900"
        >
          View all
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {allMachines.map((machine) => {
          const config = statusConfig[machine.status];
          const isCritical = machine.status === 'critical';

          return (
            <div
              key={machine.id}
              className={`neu-card-sm p-3 ${isCritical ? 'border-rose-300 bg-rose-50/50' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-800">{machine.name}</p>
                  <p className="truncate text-[11px] text-slate-400">{machine.id} &bull; Line {machine.lineId}</p>
                </div>
                <span className={`flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] font-semibold ${config.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                  {config.label}
                </span>
              </div>

              {/*
                Label stacked above value (not side-by-side) — this card sits
                two-per-row inside an already-narrow dashboard column, and a
                label+value pair fighting for width on one line was the thing
                that squeezed and wrapped mid-word at 1024px/tablet widths.
              */}
              <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5 font-mono text-[11px]">
                <div className="min-w-0">
                  <p className="truncate text-slate-400">Energy</p>
                  <p className={`truncate font-semibold ${isCritical ? 'text-rose-600' : 'text-slate-700'}`}>
                    {machine.currentTelemetry.energyKwh.toFixed(0)} kWh
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-slate-400">Temp</p>
                  <p className="truncate font-semibold text-slate-700">{machine.currentTelemetry.temperatureC.toFixed(0)}°C</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-slate-400">Pressure</p>
                  <p className="truncate font-semibold text-slate-700">{machine.currentTelemetry.pressureBar.toFixed(1)} bar</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-slate-400">Efficiency</p>
                  <p className="truncate font-semibold text-emerald-700">{machine.currentTelemetry.oeePct.toFixed(0)}%</p>
                </div>
              </div>

              {isCritical && (
                <Link
                  to="/rootcause?anomalyId=AN-20260830-0134"
                  className="mt-2 flex items-center justify-between rounded border border-rose-200 bg-rose-100/60 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <span>Energy above expected range</span>
                  <span>View cause &rarr;</span>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
