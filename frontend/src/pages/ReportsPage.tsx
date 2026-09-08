import React from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import { useFilterStore } from '../store/filterStore';
import { formatCurrency } from '../utils/formatters';

export const ReportsPage: React.FC = () => {
  const { currency } = useFilterStore();

  const reportRows = [
    {
      plant: 'PLANT-01 Pune',
      line: 'Line 01 (Extrusion)',
      sku: 'HDPE-PIPE-50MM',
      units: 45000,
      materialCost: 17.5,
      energyCost: 9.4,
      laborCost: 7.8,
      overhead: 3.8,
      totalUnitCost: 38.5,
      baselineCost: 38.5,
      variancePct: 0.0,
    },
    {
      plant: 'PLANT-01 Pune',
      line: 'Line 03 (Blow Molding)',
      sku: 'BLOW-CAN-20L',
      units: 100000,
      materialCost: 18.2,
      energyCost: 12.05,
      laborCost: 8.1,
      overhead: 4.5,
      totalUnitCost: 42.85,
      baselineCost: 39.1,
      variancePct: 9.59,
    },
    {
      plant: 'PLANT-02 Chennai',
      line: 'Line 02 (Injection)',
      sku: 'AUTO-HOUSING-B2',
      units: 62000,
      materialCost: 21.0,
      energyCost: 8.2,
      laborCost: 10.5,
      overhead: 4.3,
      totalUnitCost: 44.0,
      baselineCost: 44.0,
      variancePct: 0.0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 neu-card p-5">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-sky-700" />
            <h2 className="text-xl font-extrabold text-slate-800 font-sans">
              Activity-Based Cost (ABC) Variance Reports
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Plant-wide unit cost allocations computed across machine-hours, raw material, and energy sub-metering.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="neu-btn flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-mono font-bold text-slate-700 hover:text-slate-900"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>
          <button
            onClick={() => alert('Exporting ABC cost dataset as CSV...')}
            className="neu-btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="neu-card p-5 overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="border-b border-slate-300/80 bg-slate-200/50 text-[11px] text-slate-500 uppercase font-bold">
            <tr>
              <th className="py-3 px-3">Plant & Line</th>
              <th className="py-3 px-3">SKU / Product</th>
              <th className="py-3 px-3 text-right">Units</th>
              <th className="py-3 px-3 text-right">Material</th>
              <th className="py-3 px-3 text-right">Energy</th>
              <th className="py-3 px-3 text-right">Labor</th>
              <th className="py-3 px-3 text-right">Overhead</th>
              <th className="py-3 px-3 text-right font-extrabold text-slate-900">Unit Cost</th>
              <th className="py-3 px-3 text-right">Baseline</th>
              <th className="py-3 px-3 text-right font-extrabold">Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300/60">
            {reportRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-100/60">
                <td className="py-3.5 px-3">
                  <div className="font-sans font-bold text-slate-800">{row.line}</div>
                  <div className="text-[10px] text-slate-500">{row.plant}</div>
                </td>
                <td className="py-3.5 px-3 text-sky-800 font-extrabold">{row.sku}</td>
                <td className="py-3.5 px-3 text-right text-slate-800 font-semibold">
                  {row.units.toLocaleString()}
                </td>
                <td className="py-3.5 px-3 text-right text-slate-700">
                  {formatCurrency(row.materialCost, currency)}
                </td>
                <td
                  className={`py-3.5 px-3 text-right font-extrabold ${
                    row.variancePct > 0 ? 'text-rose-600' : 'text-slate-700'
                  }`}
                >
                  {formatCurrency(row.energyCost, currency)}
                </td>
                <td className="py-3.5 px-3 text-right text-slate-700">
                  {formatCurrency(row.laborCost, currency)}
                </td>
                <td className="py-3.5 px-3 text-right text-slate-500">
                  {formatCurrency(row.overhead, currency)}
                </td>
                <td className="py-3.5 px-3 text-right font-extrabold text-slate-900 text-sm">
                  {formatCurrency(row.totalUnitCost, currency)}
                </td>
                <td className="py-3.5 px-3 text-right text-slate-600">
                  {formatCurrency(row.baselineCost, currency)}
                </td>
                <td
                  className={`py-3.5 px-3 text-right font-extrabold ${
                    row.variancePct > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {row.variancePct > 0 ? `+${row.variancePct}%` : '0.0%'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
