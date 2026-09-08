import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  ArrowRight,
  BrainCircuit,
} from 'lucide-react';
import { SHAPWaterfall } from '../components/rootcause/SHAPWaterfall';
import { api } from '../services/api';
import { RootCauseAnalysis } from '../types';

export const RootCausePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const anomalyId = searchParams.get('anomalyId') || 'AN-20260830-0134';
  const [rca, setRca] = useState<RootCauseAnalysis | null>(null);

  useEffect(() => {
    api.getRootCause(anomalyId).then(setRca);
  }, [anomalyId]);

  if (!rca) return null;

  return (
    <div className="space-y-6">
      {/* 4-Level Drilldown Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl neu-inset p-3.5 text-xs font-mono">
        <span className="text-slate-400 font-bold">HIERARCHICAL PATH:</span>
        {rca.drillDownPath.map((step, idx) => (
          <React.Fragment key={idx}>
            <span
              className={`rounded-lg px-2.5 py-1 ${
                idx === rca.drillDownPath.length - 1
                  ? 'bg-rose-100 text-rose-800 font-bold border border-rose-300'
                  : 'neu-btn text-slate-700 font-medium'
              }`}
            >
              {step}
            </span>
            {idx < rca.drillDownPath.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Confidence Header & Diagnostic Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 neu-card p-5">
          <div className="flex items-center gap-2 text-violet-700">
            <BrainCircuit className="h-5 w-5" />
            <h3 className="text-base font-extrabold text-slate-800">
              Explainable AI Diagnostic Summary
            </h3>
          </div>
          <p className="mt-3 text-sm text-slate-700 leading-relaxed neu-inset p-4 rounded-2xl font-medium">
            {rca.llmSummary}
          </p>

          <div className="mt-6">
            <h4 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider mb-3">
              AI Feature Attribution Analysis
            </h4>
            <SHAPWaterfall drivers={rca.rankedDrivers} />
          </div>
        </div>

        {/* Confidence Scoring Dial & Verification Trail */}
        <div className="lg:col-span-4 space-y-6">
          <div className="neu-card p-5 text-center">
            <h4 className="text-xs font-mono uppercase text-slate-500 font-bold">
              Confidence Score
            </h4>
            <div className="mt-3 text-4xl font-extrabold font-mono text-sky-700">
              {(rca.confidence * 100).toFixed(1)}%
            </div>
            <div className="mt-4 space-y-2 text-left text-xs font-mono text-slate-600 border-t border-slate-300/60 pt-3">
              <div className="flex justify-between">
                <span>Correlation Strength (50%)</span>
                <span className="text-slate-900 font-bold">r = {rca.correlationStrength.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Historical Accuracy (30%)</span>
                <span className="text-slate-900 font-bold">{(rca.historicalAccuracy * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Sensor Data Completeness (20%)</span>
                <span className="text-slate-900 font-bold">{(rca.dataCompleteness * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <div className="neu-card p-5">
            <h4 className="text-xs font-mono font-bold text-slate-800 uppercase mb-2">
              Next Prescriptive Step
            </h4>
            <p className="text-xs text-slate-600 mb-4 font-medium">
              Evaluate alternative operational scenarios in the What-If Sandbox or implement the recommended chiller filter swap.
            </p>
            <Link
              to="/whatif"
              className="neu-btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold"
            >
              <span>Launch What-If Sandbox</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
