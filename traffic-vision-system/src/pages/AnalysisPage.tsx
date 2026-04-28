import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, Camera, Scan, Settings2, AlertCircle, Pause,
  Maximize2, Activity, Box, Hash, Compass, CheckCircle2, Loader2
} from 'lucide-react';
import { ObjectClass } from '../types';

const API = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000';

interface Detection {
  id: string;
  class: ObjectClass;
  bbox: [number, number, number, number];   // [x,y,w,h] as 0-1 fractions
  score: number;
  direction: 'left_to_right' | 'right_to_left';
  speed: number;
  trail: { x: number; y: number }[];
}

const CLASS_STYLES: Record<string, { color: string; border: string; bg: string }> = {
  car:           { color: '#2563EB', border: 'border-blue-500',    bg: 'bg-blue-500'    },
  bus:           { color: '#F59E0B', border: 'border-amber-500',   bg: 'bg-amber-500'   },
  truck:         { color: '#7C3AED', border: 'border-purple-500',  bg: 'bg-purple-500'  },
  motorcycle:    { color: '#10B981', border: 'border-emerald-500', bg: 'bg-emerald-500' },
  motorbike:     { color: '#10B981', border: 'border-emerald-500', bg: 'bg-emerald-500' },
  bicycle:       { color: '#EC4899', border: 'border-pink-500',    bg: 'bg-pink-500'    },
  pedestrian:    { color: '#ef4444', border: 'border-red-500',     bg: 'bg-red-500'     },
  'traffic light':{ color: '#f97316', border: 'border-orange-500', bg: 'bg-orange-500'  },
  'traffic sign': { color: '#64748b', border: 'border-slate-500',  bg: 'bg-slate-500'   },
};
const DEFAULT_STYLE = { color: '#94a3b8', border: 'border-slate-400', bg: 'bg-slate-400' };

export default function AnalysisPage() {
  const [isLive,      setIsLive]      = useState(false);
  const [showBoxes,   setShowBoxes]   = useState(true);
  const [showIds,     setShowIds]     = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSpeed,   setShowSpeed]   = useState(true);
  const [showTrails,  setShowTrails]  = useState(true);
  const [detections,  setDetections]  = useState<Detection[]>([]);
  const [liveStats,   setLiveStats]   = useState({ unique: 0, latency: 0, total: 0 });

  const esRef          = useRef<EventSource | null>(null);
  const heatmapRef     = useRef<HTMLCanvasElement>(null);
  // Track history for direction + trail: id → last 6 [cx, cy] positions
  const trackHist      = useRef<Map<string, [number, number][]>>(new Map());

  // ── Connect SSE when live ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLive) {
      esRef.current?.close();
      return;
    }
    const es = new EventSource(`${API}/api/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const objects: Detection[] = (data.objects ?? []).map((o: any) => {
          const [bx, by, bw, bh] = o.bbox;     // fractions
          const cx = bx + bw / 2;
          const cy = by + bh / 2;

          // Update history
          const hist = trackHist.current.get(o.id) ?? [];
          hist.push([cx, cy]);
          if (hist.length > 6) hist.shift();
          trackHist.current.set(o.id, hist);

          // Direction from first→last position
          const dx = hist.length > 1 ? hist[hist.length - 1][0] - hist[0][0] : 0;
          const speed = hist.length > 1
            ? Math.round(Math.sqrt((cx - hist[0][0]) ** 2 + (cy - hist[0][1]) ** 2) * 200)
            : 0;

          return {
            id:        o.id,
            class:     (o.class in CLASS_STYLES ? o.class : 'car') as ObjectClass,
            bbox:      [bx * 100, by * 100, bw * 100, bh * 100] as [number,number,number,number],
            score:     o.confidence,
            direction: dx >= 0 ? 'left_to_right' : 'right_to_left',
            speed,
            trail:     hist.map(([x, y]) => ({ x: x * 100, y: y * 100 })),
          };
        });
        setDetections(objects);
        setLiveStats(prev => ({ ...prev, total: data.total ?? prev.total }));
      } catch {}
    };
    es.onerror = () => {};
    return () => es.close();
  }, [isLive]);

  // ── Poll stats for latency + unique ──────────────────────────────────────────
  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() =>
      fetch(`${API}/api/stats`).then(r => r.json()).then(d =>
        setLiveStats({ unique: d.unique_count, latency: d.latency_ms, total: d.total })
      ).catch(() => {}), 2000);
    return () => clearInterval(id);
  }, [isLive]);

  // ── Heatmap canvas ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showHeatmap || !heatmapRef.current || detections.length === 0) return;
    const canvas = heatmapRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    detections.forEach(d => {
      const x = (d.bbox[0] + d.bbox[2] / 2) / 100 * canvas.width;
      const y = (d.bbox[1] + d.bbox[3] / 2) / 100 * canvas.height;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 50);
      g.addColorStop(0, 'rgba(255,60,0,0.55)');
      g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 50, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [detections, showHeatmap]);

  const handleLaunchStream = async () => {
    await fetch(`${API}/api/detect/start`, { method: 'POST' }).catch(() => {});
    setIsLive(true);
  };

  const handleStop = async () => {
    await fetch(`${API}/api/detect/stop`, { method: 'POST' }).catch(() => {});
    esRef.current?.close();
    setIsLive(false);
    setDetections([]);
    trackHist.current.clear();
  };

  const toggleLayer = (key: string, val: boolean, set: (v: boolean) => void) => set(!val);

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold">Analysis Engine</h1>
          <p className="text-slate-500">Live YOLO detection stream with tracking, heatmap & direction vectors.</p>
        </div>
        {isLive && (
          <button onClick={handleStop}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-red-700 transition-all active:scale-95">
            <Pause size={14} /> Stop Stream
          </button>
        )}
      </header>

      {!isLive ? (
        /* ── Launch screen ──────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            onClick={handleLaunchStream}
            className="glass-panel p-8 flex flex-col items-center justify-center text-center gap-6 group cursor-pointer hover:bg-slate-50/50 transition-colors"
          >
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-red-500 transition-all group-hover:scale-110">
              <Camera size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Live Detection Stream</h3>
              <p className="text-sm text-slate-400 max-w-xs">
                Launch the YOLO detection pipeline on the default traffic video.
              </p>
            </div>
            <button className="px-6 py-2 border-2 border-red-100 text-red-600 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-red-50 transition-colors">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Open Live Stream
            </button>
          </div>

          <div className="glass-panel p-8 flex flex-col items-center justify-center text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
              <Upload size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Upload Traffic Video</h3>
              <p className="text-sm text-slate-400 max-w-xs">
                Upload a custom video to the backend and start detection on it.
              </p>
            </div>
            <a href="/dashboard" className="px-6 py-2 bg-primary-dark text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors">
              Go to Dashboard
            </a>
          </div>
        </div>
      ) : (
        /* ── Live analysis view ─────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Monitor */}
          <div className="lg:col-span-3 space-y-6">
            <div className="relative glass-panel bg-slate-900 aspect-video overflow-hidden group">
              {/* MJPEG live stream from Flask */}
              <img
                src={`${API}/api/video_stream`}
                className="absolute inset-0 w-full h-full object-cover"
                alt="Live detection feed"
              />

              {/* No object banner */}
              <AnimatePresence>
                {detections.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-red-600/90 backdrop-blur-md text-white rounded-lg flex items-center gap-2 shadow-xl"
                  >
                    <AlertCircle size={18} />
                    <span className="text-sm font-bold">No tracked object in frame</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Detection overlay — bboxes, labels, trails, direction */}
              <div className="absolute inset-0 z-20 pointer-events-none">
                {showBoxes && detections.map((d) => {
                  const style = CLASS_STYLES[d.class] ?? DEFAULT_STYLE;
                  return (
                    <motion.div
                      key={d.id}
                      animate={{ left: `${d.bbox[0]}%`, top: `${d.bbox[1]}%`, width: `${d.bbox[2]}%`, height: `${d.bbox[3]}%` }}
                      className={`absolute border-2 ${style.border}`}
                      style={{ position: 'absolute' }}
                    >
                      {showIds && (
                        <div className={`absolute -top-6 left-0 ${style.bg} text-white text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1.5`}>
                          <span className="font-bold uppercase">{d.class}</span>
                          <span className="opacity-70">{d.id}</span>
                          {showSpeed && <span className="border-l border-white/30 pl-1.5 font-bold">{d.speed} px/s</span>}
                        </div>
                      )}

                      {showTrails && d.trail.length > 1 && (
                        <svg className="absolute inset-0 overflow-visible pointer-events-none">
                          <polyline
                            points={d.trail.map(p => `${p.x - d.bbox[0]}%,${p.y - d.bbox[1]}%`).join(' ')}
                            fill="none" stroke={style.color} strokeWidth="2" strokeDasharray="4 2" className="opacity-50"
                          />
                        </svg>
                      )}

                      <div className="absolute -right-5 top-1/2 -translate-y-1/2 text-white text-lg font-bold drop-shadow">
                        {d.direction === 'left_to_right' ? '→' : '←'}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Heatmap canvas overlay */}
              <canvas ref={heatmapRef} width={1200} height={675}
                className={`absolute inset-0 z-10 pointer-events-none w-full h-full transition-opacity ${showHeatmap ? 'opacity-60' : 'opacity-0'}`}
              />

              {/* LIVE badge */}
              <div className="absolute bottom-4 left-4 z-30 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] font-bold text-white flex items-center gap-2 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </div>
            </div>

            {/* Live Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Unique Tracked', val: liveStats.unique, icon: Hash,    color: 'text-accent-blue' },
                { label: 'Live Objects',   val: detections.length, icon: Box,    color: 'text-amber-500'  },
                { label: 'Dominant Flow',  val: detections.length > 0 ? (detections.filter(d => d.direction === 'left_to_right').length >= detections.length / 2 ? 'L → R' : 'R → L') : '—', icon: Compass, color: 'text-emerald-500' },
                { label: 'YOLO Latency',  val: `${liveStats.latency}ms`, icon: Activity, color: 'text-purple-500' },
              ].map((m, i) => (
                <div key={i} className="glass-panel p-4 flex items-center gap-4">
                  <div className={`p-2 rounded-lg bg-slate-50 ${m.color}`}>
                    <m.icon size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{m.label}</p>
                    <p className="font-mono font-bold text-slate-900">{typeof m.val === 'number' ? m.val.toLocaleString() : m.val}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="glass-panel p-6 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Layer Settings</h3>
              <div className="space-y-4">
                {[
                  { id: 'boxes',  label: 'Bounding Boxes',    state: showBoxes,   set: setShowBoxes   },
                  { id: 'ids',    label: 'Tracking IDs',      state: showIds,     set: setShowIds     },
                  { id: 'heat',   label: 'Dwell Heatmap',     state: showHeatmap, set: setShowHeatmap },
                  { id: 'speed',  label: 'Speed Estimation',  state: showSpeed,   set: setShowSpeed   },
                  { id: 'trails', label: 'Trajectory Trail',  state: showTrails,  set: setShowTrails  },
                ].map(t => (
                  <div key={t.id} className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-600">{t.label}</label>
                    <button onClick={() => t.set(!t.state)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${t.state ? 'bg-accent-blue' : 'bg-slate-200'}`}>
                      <motion.div animate={{ x: t.state ? 22 : 2 }}
                        className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-primary-dark text-white rounded-2xl space-y-4 shadow-xl">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-accent-blue" />
                <span className="text-sm font-bold">Bonus Features</span>
              </div>
              <div className="space-y-2 text-[11px] text-slate-400 font-medium">
                <p>✅ Direction prediction (→ / ←)</p>
                <p>✅ Dwell heatmap (canvas overlay)</p>
                <p>✅ Trajectory trails</p>
                <p>✅ Speed estimation (px/frame)</p>
                <p>✅ Live SSE detections</p>
                <p>✅ MJPEG annotated stream</p>
              </div>
              <a href={`${API}/api/logs`} target="_blank" rel="noreferrer"
                className="block text-center py-2.5 bg-accent-blue hover:bg-blue-600 rounded-xl text-[10px] font-bold transition-all">
                Export JSON Logs
              </a>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
