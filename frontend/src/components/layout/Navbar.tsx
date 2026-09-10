import React from 'react';
import {
  Factory,
  Bot,
  LogOut,
} from 'lucide-react';
import { useFilterStore } from '../../store/filterStore';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { mockPlants } from '../../mock/mockData';
import { PlantId } from '../../types';

export const Navbar: React.FC = () => {
  const {
    plantId,
    lineId,
    dateRange,
    currency,
    liveSimulationActive,
    setPlantId,
    setLineId,
    setDateRange,
    toggleCurrency,
    toggleLiveSimulation,
  } = useFilterStore();

  const { toggleOpen: toggleChatOpen, isOpen: isChatOpen } = useChatStore();
  const { user, logout } = useAuthStore();

  const currentPlant = mockPlants.find((p) => p.id === plantId) || mockPlants[0];

  return (
    <header className="sticky top-0 z-30 flex min-h-12 w-full flex-wrap items-center justify-between gap-y-1.5 bg-[#EBF0F7] px-4 py-2 border-b border-slate-300/60">
      {/* Left: Brand + Facility Switcher */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-2">
          <img
            src="/aura-cost-logo.jpeg"
            alt="AURA.COST"
            className="h-7 w-7 rounded-md bg-white object-contain p-0.5 shadow-sm"
          />
          <span className="font-bold tracking-tight text-slate-800 text-sm">
            AURA<span className="text-sky-600 font-medium">.COST</span>
          </span>
        </div>

        <div className="hidden h-5 w-px bg-slate-300 md:block" />

        {/* Facility Dropdown */}
        <div className="hidden items-center gap-2 md:flex">
          <Factory className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={plantId}
            onChange={(e) => setPlantId(e.target.value as PlantId)}
            className="neu-btn rounded-md px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            {mockPlants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={lineId}
            onChange={(e) => setLineId(e.target.value)}
            className="neu-btn rounded-md px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Lines</option>
            {currentPlant?.lines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Date, Currency, Live status, Co-Pilot */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center rounded-md p-0.5 neu-inset text-xs">
          {(['7d', '30d', '90d', 'ytd'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`rounded px-2 py-0.5 font-mono uppercase transition-all ${
                dateRange === range
                  ? 'bg-white text-sky-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        <button
          onClick={toggleCurrency}
          className="neu-btn rounded-md px-2 py-1 text-xs font-mono font-bold text-slate-700 hover:text-sky-700"
          title="Toggle INR (₹) / USD ($)"
        >
          {currency === 'INR' ? '₹ INR' : '$ USD'}
        </button>

        {/* Real-time status — subtle, not flashing */}
        <button
          onClick={toggleLiveSimulation}
          className="neu-btn flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold"
          title="Click to toggle live telemetry ingestion"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${liveSimulationActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
          />
          <span className={liveSimulationActive ? 'text-emerald-700' : 'text-slate-500'}>
            {liveSimulationActive ? 'LIVE' : 'OFFLINE'}
          </span>
        </button>

        <button
          onClick={toggleChatOpen}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-colors ${
            isChatOpen ? 'bg-sky-700 text-white' : 'neu-btn-primary'
          }`}
        >
          <Bot className="h-3.5 w-3.5" />
          Co-Pilot
        </button>

        {user && (
          <>
            <span
              className="neu-inset hidden rounded-md px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wide text-slate-600 sm:inline-block"
              title={`Signed in as ${user.email}`}
            >
              {user.role}
            </span>
            <button
              onClick={logout}
              className="neu-btn flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:text-rose-700"
              title={`Signed in as ${user.email}`}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
