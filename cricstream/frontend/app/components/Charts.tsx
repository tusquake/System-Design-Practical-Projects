'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { MatchUpdate } from '../page';

interface ChartsProps {
  data: MatchUpdate[];
}

export function RunRateChart({ data }: ChartsProps) {
  // Process data for the chart: we want chronological order (data is currently newest first)
  const chartData = [...data].reverse().map(d => ({
    over: d.overs,
    runs: d.total_runs,
    runRate: (d.total_runs / Math.max(d.overs, 0.1)).toFixed(2)
  }));

  if (chartData.length === 0) return <div className="h-48 flex items-center justify-center text-slate-500">Waiting for data...</div>;

  return (
    <div className="h-48 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRuns" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="over" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem' }}
            itemStyle={{ color: '#e2e8f0' }}
          />
          <Area type="monotone" dataKey="runs" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRuns)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OverByOverChart({ data }: ChartsProps) {
  // Calculate runs scored in each completed over
  const oversData = new Map();
  
  [...data].reverse().forEach(d => {
    const overInt = Math.floor(d.overs);
    // Keep tracking the max runs at that over
    oversData.set(overInt, d.total_runs);
  });

  const chartData = [];
  let prevRuns = 0;
  for (let [over, totalRuns] of oversData.entries()) {
    chartData.push({
      over: `Ov ${over}`,
      runs: totalRuns - prevRuns
    });
    prevRuns = totalRuns;
  }

  if (chartData.length === 0) return <div className="h-48 flex items-center justify-center text-slate-500">Waiting for over completion...</div>;

  return (
    <div className="h-48 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="over" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            cursor={{fill: '#1e293b'}}
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem' }}
          />
          <Bar dataKey="runs" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
