import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useFilterStore } from '../../store/filterStore';
import { formatCurrency } from '../../utils/formatters';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';

interface EvidenceCardProps {
  data: {
    type: 'anomaly' | 'root_cause' | 'recommendation' | 'whatif';
    title: string;
    confidence: number;
    projectedSavings?: number;
    driver?: string;
    recommendationId?: string;
  };
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ data }) => {
  const { currency } = useFilterStore();
  const navigate = useNavigate();

  const handleImplement = async () => {
    if (data.recommendationId) {
      await api.implementAction(data.recommendationId, 'AI Assistant Chat Action', 'Triggered from AI Co-Pilot');
      navigate('/actions');
    }
  };

  return (
    <div className="mt-3 rounded-2xl bg-[#EBF0F7] p-4 text-xs font-mono neu-card-sm border border-sky-200 shadow-[5px_5px_12px_#cad4e2,-5px_-5px_12px_#ffffff]">
      <div className="flex items-center justify-between border-b border-slate-300/60 pb-2">
        <span className="flex items-center gap-1.5 font-bold text-sky-800">
          <Sparkles className="h-3.5 w-3.5 text-sky-600" />
          Evidence & Prescriptive Output
        </span>
        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
          {(data.confidence * 100).toFixed(0)}% Confidence
        </span>
      </div>

      <div className="mt-2.5 space-y-1.5">
        <h5 className="font-sans font-bold text-slate-900 text-xs">{data.title}</h5>
        {data.driver && (
          <p className="text-slate-700 font-medium">
            Primary Driver: <span className="text-rose-600 font-bold">{data.driver}</span>
          </p>
        )}
        {data.projectedSavings && (
          <p className="text-slate-700 font-medium">
            Projected Savings:{' '}
            <span className="text-emerald-700 font-extrabold">
              {formatCurrency(data.projectedSavings, currency)} / Qtr
            </span>
          </p>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-300/60 flex justify-end">
        <button
          onClick={handleImplement}
          className="neu-btn-primary flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11px] font-bold"
        >
          <span>Implement Recommendation</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
