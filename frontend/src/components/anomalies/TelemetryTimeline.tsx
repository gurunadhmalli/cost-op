import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Anomaly } from '../../types';

interface TelemetryTimelineProps {
  anomaly: Anomaly;
}

export const TelemetryTimeline: React.FC<TelemetryTimelineProps> = ({ anomaly }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-md border border-slate-200 bg-white p-2.5 text-xs font-mono shadow-sm">
          <p className="font-bold text-slate-700">{label}</p>
          <p className="mt-0.5">
            Value:{' '}
            <span className={data.isAnomaly ? 'font-bold text-rose-600' : 'font-semibold text-slate-800'}>
              {data.value} {anomaly.unit}
            </span>
          </p>
          <p className="text-slate-500">
            Expected: {data.lowerBound}–{data.upperBound} {anomaly.unit}
          </p>
          {data.isAnomaly && <p className="mt-0.5 font-bold text-rose-600">&#9888; Anomaly</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={anomaly.telemetryHistory}
          margin={{ top: 6, right: 6, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="neuBandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0284C7" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#0284C7" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="timestamp" stroke="#94A3B8" tick={{ fill: '#94A3B8', fontSize: 10 }} />
          <YAxis
            domain={['auto', 'auto']}
            stroke="#94A3B8"
            tick={{ fill: '#94A3B8', fontSize: 10 }}
            tickFormatter={(v) => `${Math.round(v)}`}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="upperBound"
            stroke="none"
            fill="url(#neuBandGradient)"
          />
          <Line
            type="monotone"
            dataKey="baseline"
            stroke="#0284C7"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#E11D48"
            strokeWidth={2.5}
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              if (payload.isAnomaly) {
                return (
                  <circle
                    key={`dot-${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill="#E11D48"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    className="animate-pulse"
                  />
                );
              }
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill="#64748B"
                  stroke="#FFFFFF"
                  strokeWidth={1}
                />
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
