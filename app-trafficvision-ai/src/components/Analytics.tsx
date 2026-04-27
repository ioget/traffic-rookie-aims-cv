import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

interface DensityPoint { time: string; count: number; }
interface DistItem     { name: string; value: number; color: string; }

export function AnalyticsDashboard() {
  const [density, setDensity]   = useState<DensityPoint[]>([]);
  const [dist, setDist]         = useState<DistItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res  = await fetch(`${API}/api/analytics`);
        const data = await res.json();
        setDensity(data.density ?? []);
        setDist(data.distribution ?? []);
      } catch {}
    };
    fetchData();
    const id = setInterval(fetchData, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      {/* Traffic Density */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="mb-6">
          <h3 className="font-bold text-slate-900">Traffic Density</h3>
          <p className="text-xs text-slate-500">Hourly object frequency trends</p>
        </div>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={density}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {density.length === 0 && (
          <p className="text-center text-xs text-slate-400 mt-4">No data yet — start detection first.</p>
        )}
      </div>

      {/* Class Distribution */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="mb-6">
          <h3 className="font-bold text-slate-900">Class Composition</h3>
          <p className="text-xs text-slate-500">Breakdown of detected object types</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-[240px] w-[50%]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dist} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {dist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-3">
            {dist.length === 0
              ? <p className="text-xs text-slate-400">No data yet.</p>
              : dist.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">{item.value}%</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
