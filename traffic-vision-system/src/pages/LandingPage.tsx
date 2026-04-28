import { motion } from 'motion/react';
import { ArrowRight, Play, CheckCircle2, Shield, Zap, BarChart3, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

const API = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000';

interface Scene {
  filename: string;
  title: string;
  total_objects: number;
  dominant_class: string;
  size_mb: number;
  video_url: string;
  thumbnail_url: string;
}

export default function LandingPage() {
  const [scenes, setScenes] = useState<Scene[]>([]);

  useEffect(() => {
    fetch(`${API}/api/outputs`)
      .then(r => r.json())
      .then(setScenes)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-24 pb-16">
      {/* Hero Section */}
      <section className="relative pt-12 md:pt-20">
        <div className="text-center space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-5xl md:text-7xl leading-tight md:leading-[1.1] max-w-4xl mx-auto">
              Visionary <span className="text-accent-blue">Traffic Intelligence</span>.
            </h1>
            <p className="mt-6 text-lg text-slate-500 max-w-2xl mx-auto">
              High-precision vehicle tracking and behavioral analysis for smart city infrastructure.
              Processed in real-time using YOLOv11 fine-tuned on BDD100K.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/dashboard" className="btn-primary">
              Get Started — Analysis Mode <ArrowRight size={18} />
            </Link>
            <Link to="/analyze" className="px-6 py-3 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
              Live Stream <Play size={16} className="fill-slate-600" />
            </Link>
          </motion.div>
        </div>

        {/* Feature badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20">
          {[
            { icon: Shield,       label: 'mAP50 = 0.40',         sub: 'Fine-tuned on BDD100K' },
            { icon: Zap,          label: 'Frame Skip ×5',         sub: '~6fps detection on CPU' },
            { icon: Activity,     label: '10 Object Classes',     sub: 'BDD100K + VisDrone' },
            { icon: CheckCircle2, label: 'ByteTrack Tracking',    sub: 'Persistent IDs' },
          ].map((feature, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }}
              className="p-6 glass-panel flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                <feature.icon size={20} />
              </div>
              <div>
                <div className="font-bold text-sm">{feature.label}</div>
                <div className="text-xs text-slate-400">{feature.sub}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Performance Gallery — real output videos */}
      <section id="performance" className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-display font-bold">Model Performance Examples</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Output videos from our fine-tuned YOLOv11n model — real detections, real traffic scenes.
          </p>
          {scenes.length === 0 && (
            <p className="text-xs text-slate-400 font-mono">Connecting to backend…</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenes.map((scene, index) => (
            <motion.div
              key={scene.filename}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="group relative glass-panel overflow-hidden border-[#E2E8F0] shadow-sm hover:shadow-xl"
            >
              <div className="aspect-video relative overflow-hidden bg-slate-900">
                {/* Real thumbnail extracted from output video */}
                <img
                  src={`${API}${scene.thumbnail_url}`}
                  alt={scene.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={e => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225"><rect fill="%231e293b" width="400" height="225"/><text fill="%2394a3b8" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14">No preview</text></svg>';
                  }}
                />

                {/* Simulated detection overlay on hover */}
                <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="border-2 border-blue-400 bg-blue-400/10 rounded px-2 py-1">
                    <span className="bg-blue-500 text-white font-mono text-[9px] px-1 rounded">
                      {scene.dominant_class.toUpperCase()} #001
                    </span>
                  </div>
                </div>

                {/* Play overlay */}
                <a
                  href={`${API}${scene.video_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0 bg-primary-dark/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg scale-90 group-hover:scale-100 transition-transform">
                    <Play size={20} className="fill-primary-dark ml-1" />
                  </div>
                </a>

                <div className="absolute top-3 right-3">
                  <span className="status-tag status-processed">Processed</span>
                </div>
              </div>

              <div className="p-5 space-y-2 bg-white">
                <h3 className="text-[15px] font-bold truncate tracking-tight">{scene.title}</h3>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {scene.size_mb} MB &nbsp;·&nbsp; {scene.total_objects.toLocaleString()} objects
                  </span>
                  <span className="text-[10px] font-bold uppercase text-accent-blue font-mono capitalize">
                    {scene.dominant_class}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Fallback if no scenes yet */}
          {scenes.length === 0 && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-panel aspect-video animate-pulse bg-slate-100 rounded-2xl" />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-dark rounded-3xl text-white px-8 md:px-16 overflow-hidden relative">
        <div className="max-w-3xl space-y-6 relative z-10">
          <h2 className="text-4xl md:text-5xl font-display font-bold leading-tight">
            Ready to analyze your traffic footage?
          </h2>
          <p className="text-slate-300 text-lg">
            Upload a video or launch the live detection stream — YOLOv11n with ByteTrack,
            heatmaps, direction vectors and persistent tracking IDs.
          </p>
          <div className="flex gap-4 pt-4 flex-wrap">
            <Link to="/analyze"
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent-blue text-white rounded-xl font-bold hover:bg-blue-600 transition-all">
              Open Live Stream <ArrowRight size={20} />
            </Link>
            <Link to="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-all">
              View Dashboard <BarChart3 size={20} />
            </Link>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl -mr-48 -mb-48" />
      </section>
    </div>
  );
}
