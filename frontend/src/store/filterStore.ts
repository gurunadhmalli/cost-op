import { create } from 'zustand';
import { PlantId } from '../types';

interface FilterStore {
  plantId: PlantId;
  lineId: string;
  dateRange: '7d' | '30d' | '90d' | 'ytd';
  currency: 'INR' | 'USD';
  currencySymbol: '₹' | '$';
  currencyRate: number;
  liveSimulationActive: boolean;
  
  setPlantId: (plantId: PlantId) => void;
  setLineId: (lineId: string) => void;
  setDateRange: (range: '7d' | '30d' | '90d' | 'ytd') => void;
  toggleCurrency: () => void;
  toggleLiveSimulation: () => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
  plantId: 'PLANT-01',
  lineId: 'LINE-03',
  dateRange: '30d',
  currency: 'INR',
  currencySymbol: '₹',
  currencyRate: 1.0,
  liveSimulationActive: true,

  setPlantId: (plantId) => set({ plantId, lineId: 'ALL' }),
  setLineId: (lineId) => set({ lineId }),
  setDateRange: (dateRange) => set({ dateRange }),
  toggleCurrency: () =>
    set((state) => ({
      currency: state.currency === 'INR' ? 'USD' : 'INR',
      currencySymbol: state.currency === 'INR' ? '$' : '₹',
      currencyRate: state.currency === 'INR' ? 0.012 : 1.0,
    })),
  toggleLiveSimulation: () =>
    set((state) => ({ liveSimulationActive: !state.liveSimulationActive })),
}));
