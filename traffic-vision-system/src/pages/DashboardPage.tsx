import { motion } from 'motion/react';
import { Users, Car, BarChart3, Clock, ArrowUpRight, MoreHorizontal, ChevronRight, TrendingUp, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useState, useEffect } from 'react';

const API = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000';

const CLASS_COLORS: Record<string, string> = {
  car:          '#2563EB',
  bus:          '#F59E0B',
  truck:        '#7C3AED',
  motorcycle:   '#10B981',
  motorbike:    '#10B981',
  bicycle:      '#EC4899',
  pedestrian:   '#ef4444',
  'traffic light': '#f97316',
  'traffic sign':  '#64748b',
};

interface Scene {
  filename: string;
  title: string;
  total_objects: number;
  dominant_class: string;
  class_counts: Record<string, number>;
  size_mb: number;
  video_url: string;
  thumbnail_url: string;
}

interface Stats {
  live_count:   number;
  unique_count: number;
  total:        number;
  latency_ms:   number;
  running:      boolean;
  class_counts: Record<string, number>;
}

export default function DashboardPage() {
  const [scenes,  setScenes]  = useState<Scene[]>([]);
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [density, setDensity] = useState<{time: string; count: number}[]>([]);

  // Fetch output scenes once
  useEffect(() => {
    fetch(`${API}/api/outputs`)
      .then(r => r.json())
      .then(setScenes)
      .catch(() => {});
  }, []);

  // Poll stats every 2 s
  useEffect(() => {
    const poll = () =>
      fetch(`${API}/api/stats`).then(r => r.json()).then(setStats).catch(() => {});
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  // Poll analytics every 5 s
  useEffect(() => {
    const poll = () =>
      fetch(`${API}/api/analytics`)
        .then(r => r.json())
        .then((d: any) => setDensity(d.density ?? []))
        .catch(() => {});
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  const classCountEntries: [string, number][] = stats
    ? (Object.entries(stats.class_counts) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 6)
    : [];
  const maxCount = Math.max(...classCountEntries.map(([, v]) => v as number), 1);

  const statCards = [
    { label: 'Total Objects',   value: stats?.total        ?? 0, icon: Users,    trend: stats?.running ? '●LIVE' : '○ OFF' },
    { label: 'Unique Tracked',  value: stats?.unique_count ?? 0, icon: BarChart3, trend: 'No duplicates' },
    { label: 'Latency',         value: `${stats?.latency_ms ?? 0}ms`, icon: Clock, trend: 'Per YOLO frame' },
    { label: 'Scenes Analyzed', value: scenes.length,             icon: MapPin,   trend: 'Output videos' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl">Global Dashboard</h1>
          <p className="text-slate-500 font-medium">Live detection metrics and processed video library.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${stats?.running ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
          <span className="text-xs font-mono font-bold text-slate-500">
            {stats?.running ? 'DETECTION RUNNING' : 'STOPPED'}
          </span>
        </div>
      </header>

      {/* Live Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-panel p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
                <s.icon size={20} />
              </div>
              <span className="text-[10px] font-bold font-mono text-accent-blue">{s.trend}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">{s.label}</p>
              <h3 className="text-2xl font-mono font-bold">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Hourly Density Chart */}
        <div className="lg:col-span-2 glass-panel p-6 space-y-4">
          <h3 className="text-lg font-bold">Detection Density — Hourly</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={density}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Class Counts */}
        <div className="glass-panel p-6 space-y-4 bg-primary-dark text-white">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-accent-blue" />
            <h3 className="text-lg">Live Class Distribution</h3>
          </div>
          <div className="space-y-3">
            {classCountEntries.length === 0
              ? <p className="text-xs text-slate-400 font-mono">Waiting for detections…</p>
              : classCountEntries.map(([cls, cnt]) => (
                <div key={cls} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="capitalize text-slate-300">{cls}</span>
                    <span className="font-bold text-white">{cnt.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${((cnt as number) / maxCount) * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: CLASS_COLORS[cls] ?? '#94a3b8' }}
                    />
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* Processed Video Library */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Processed Video Library</h2>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-mono font-bold uppercase">
            {scenes.length} SCENES
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {scenes.map((scene, i) => (
            <motion.div key={scene.filename} whileHover={{ y: -4 }}
              className="glass-panel group overflow-hidden border-transparent hover:border-slate-200 transition-all">
              <div className="aspect-video relative overflow-hidden bg-slate-900">
                <img
                  src={`${API}${scene.thumbnail_url}`}
                  alt={scene.title}
                  className="w-full h-full object-cover opacity-90 transition-transform group-hover:scale-105"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/80 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="status-tag status-processed">Processed</span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                  <div>
                    <p className="text-white font-bold truncate">{scene.title}</p>
                    <p className="text-slate-300 text-[10px] uppercase font-mono">{scene.size_mb} MB</p>
                  </div>
                  <a
                    href={`${API}${scene.video_url}`}
                    target="_blank" rel="noreferrer"
                    className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-primary-dark transition-colors"
                  >
                    <ArrowUpRight size={16} />
                  </a>
                </div>
              </div>
              <div className="p-4 grid grid-cols-3 gap-4 border-t border-slate-100 bg-white/50">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Objects</p>
                  <p className="font-mono font-bold text-sm">{scene.total_objects.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Dominant</p>
                  <p className="font-mono font-bold text-sm capitalize text-accent-blue">{scene.dominant_class}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Size</p>
                  <p className="font-mono font-bold text-sm">{scene.size_mb} MB</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Inter-scene Summary Table */}
      {scenes.length > 0 && (
        <section className="glass-panel overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold">Inter-scene Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Scene', 'Size', 'Total Objects', 'Dominant Class', ''].map(h => (
                    <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scenes.map(scene => (
                  <tr key={scene.filename} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-7 rounded-md overflow-hidden bg-slate-200">
                          <img src={`${API}${scene.thumbnail_url}`} className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                        <span className="font-bold text-sm">{scene.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{scene.size_mb} MB</td>
                    <td className="px-6 py-4 font-mono font-bold text-sm">{scene.total_objects.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-medium capitalize text-slate-600">{scene.dominant_class}</td>
                    <td className="px-6 py-4">
                      <a href={`${API}${scene.video_url}`} target="_blank" rel="noreferrer"
                        className="text-slate-300 hover:text-primary-dark transition-colors">
                        <MoreHorizontal size={18} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
