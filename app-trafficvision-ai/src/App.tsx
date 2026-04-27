import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, Navbar } from './components/Layout';
import { VideoViewer, ControlPanel } from './components/VisionSystem';
import { AnalyticsDashboard } from './components/Analytics';
import { LogsTable } from './components/LogsTable';
import { VideoUploadZone } from './components/Upload';
import { TrafficObject, OBJECT_CLASSES } from './types';
import { Users, Car, TrendingUp, RefreshCw, Hash } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export default function App() {
  const [activeTab, setActiveTab]       = useState('dashboard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentObjects, setCurrentObjects] = useState<TrafficObject[]>([]);
  const [logs, setLogs]                 = useState<TrafficObject[]>([]);

  const [showBoxes,  setShowBoxes]  = useState(true);
  const [showIds,    setShowIds]    = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  // Real stats from backend
  const [stats, setStats] = useState({
    live_count:   0,
    unique_count: 0,
    total:        0,
    latency_ms:   0,
    class_counts: {} as Record<string, number>,
  });

  // Poll /api/stats every second while processing
  useEffect(() => {
    if (!isProcessing) return;
    const id = setInterval(async () => {
      try {
        const res  = await fetch(`${API}/api/stats`);
        const data = await res.json();
        setStats(data);
        if (!data.running) setIsProcessing(false);
      } catch {}
    }, 1000);
    return () => clearInterval(id);
  }, [isProcessing]);

  // Poll /api/logs every 2 seconds
  useEffect(() => {
    if (!isProcessing) return;
    const id = setInterval(async () => {
      try {
        const res  = await fetch(`${API}/api/logs?limit=50`);
        const data: any[] = await res.json();
        const mapped: TrafficObject[] = data.map(d => ({
          id:         d.id,
          class:      d.class in OBJECT_CLASSES ? d.class : 'car',
          confidence: d.confidence,
          bbox:       d.bbox,
          timestamp:  d.timestamp,
        }));
        setLogs(mapped);
      } catch {}
    }, 2000);
    return () => clearInterval(id);
  }, [isProcessing]);

  const handleObjectsUpdate = useCallback((objects: TrafficObject[]) => {
    setCurrentObjects(objects);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <Navbar />

      <main className="pl-20 pt-14 h-screen overflow-y-auto transition-all duration-300">
        <div className="p-4 max-w-[1800px] mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-12 gap-4">
                <div className="col-span-12 xl:col-span-8 space-y-4">
                  <VideoViewer
                    isProcessing={isProcessing}
                    onObjectsUpdate={handleObjectsUpdate}
                    showBoxes={showBoxes}
                    showIds={showIds}
                    showLabels={showLabels}
                  />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Live Count"     value={currentObjects.length}   icon={Users}     trend="+live"         color="text-blue-600" />
                    <StatCard label="Unique Objects" value={stats.unique_count}       icon={Hash}      trend="No duplicates" color="text-indigo-600" />
                    <StatCard label="Total Detected" value={stats.total}              icon={Car}       trend="All frames"    color="text-emerald-600" />
                    <StatCard label="Latency"        value={stats.latency_ms} suffix="ms" icon={RefreshCw} trend="Per frame"  color="text-amber-600" />
                  </div>
                </div>

                <div className="col-span-12 xl:col-span-4 space-y-4">
                  <ControlPanel
                    isProcessing={isProcessing}
                    setIsProcessing={setIsProcessing}
                    showBoxes={showBoxes}   setShowBoxes={setShowBoxes}
                    showIds={showIds}       setShowIds={setShowIds}
                    showLabels={showLabels} setShowLabels={setShowLabels}
                  />

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4">Traffic Composition</h3>
                    <div className="space-y-2">
                      {Object.entries(OBJECT_CLASSES).map(([key, cfg]) => (
                        <div key={key} className="flex items-center justify-between group">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                            <span className="text-[10px] font-bold text-slate-600 uppercase">{cfg.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">{stats.class_counts[key] ?? 0}</span>
                            <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full transition-all"
                                style={{
                                  width: `${Math.min((stats.class_counts[key] ?? 0) / Math.max(...Object.values(stats.class_counts), 1) * 100, 100)}%`,
                                  backgroundColor: cfg.color,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="col-span-12">
                  <LogsTable logs={logs.slice(0, 15)} />
                </div>
              </motion.div>
            )}

            {activeTab === 'upload'    && (
              <motion.div key="upload" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto py-12">
                <div className="mb-10">
                  <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Vision Interface Source</h2>
                  <p className="text-slate-500">Upload a traffic video to start detection.</p>
                </div>
                <VideoUploadZone />
              </motion.div>
            )}

            {activeTab === 'analytics' && <AnalyticsDashboard />}
            {activeTab === 'logs'      && <LogsTable logs={logs} />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

interface StatCardProps {
  label: string; value: number; icon: any; trend: string; color: string;
  suffix?: string; showPercent?: boolean;
}
function StatCard({ label, value, icon: Icon, trend, color, suffix }: StatCardProps) {
  return (
    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col group transition-all">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
        <span className="text-[9px] font-black text-blue-600 uppercase">{trend}</span>
      </div>
      <div className="flex items-end justify-between">
        <h4 className="text-xl font-black text-slate-900 leading-none">{value.toLocaleString()}{suffix}</h4>
        <Icon className={cn('w-4 h-4 text-slate-300 group-hover:text-slate-900 transition-colors', color)} />
      </div>
    </div>
  );
}
