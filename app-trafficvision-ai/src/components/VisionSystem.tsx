import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '../lib/utils';
import { TrafficObject, OBJECT_CLASSES } from '../types';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

interface VideoViewerProps {
  isProcessing: boolean;
  onObjectsUpdate: (objects: TrafficObject[]) => void;
  showBoxes: boolean;
  showIds: boolean;
  showLabels: boolean;
}

export function VideoViewer({ isProcessing, onObjectsUpdate, showBoxes, showIds, showLabels }: VideoViewerProps) {
  const [objects, setObjects] = useState<TrafficObject[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isProcessing) {
      esRef.current?.close();
      esRef.current = null;
      return;
    }

    const es = new EventSource(`${API}/api/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const parsed: TrafficObject[] = (data.objects ?? []).map((o: any) => ({
          id:         o.id,
          class:      o.class in OBJECT_CLASSES ? o.class : 'car',
          confidence: o.confidence,
          bbox:       o.bbox,
          timestamp:  o.timestamp,
        }));
        setObjects(parsed);
        onObjectsUpdate(parsed);
      } catch {}
    };

    es.onerror = () => { es.close(); };

    return () => { es.close(); };
  }, [isProcessing]);

  return (
    <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-2xl group border border-slate-800">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1545147986-a9d6f210df77?q=80&w=2000')] bg-cover bg-center opacity-40 grayscale" />
      <div className="absolute inset-0 pointer-events-none z-10 opacity-20 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Detection overlays */}
      <div className="absolute inset-0 z-20 overflow-hidden">
        {objects.map((obj) => (
          <div
            key={obj.id}
            className="absolute transition-all duration-300"
            style={{
              left:   `${obj.bbox[0] * 100}%`,
              top:    `${obj.bbox[1] * 100}%`,
              width:  `${obj.bbox[2] * 100}%`,
              height: `${obj.bbox[3] * 100}%`,
            }}
          >
            {showBoxes && (
              <div
                className="absolute inset-0 border-2"
                style={{
                  borderColor:     OBJECT_CLASSES[obj.class]?.color ?? '#fff',
                  backgroundColor: `${OBJECT_CLASSES[obj.class]?.color ?? '#fff'}1a`,
                }}
              />
            )}
            {(showLabels || showIds) && (
              <div className="absolute top-0 left-0 -translate-y-full flex gap-1 p-0.5">
                {showLabels && (
                  <span
                    className="px-1.5 py-0.5 rounded-sm text-[10px] font-black text-white uppercase tracking-tight"
                    style={{ backgroundColor: OBJECT_CLASSES[obj.class]?.color ?? '#666' }}
                  >
                    {obj.class} {(obj.confidence * 100).toFixed(0)}%
                  </span>
                )}
                {showIds && (
                  <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-black text-white bg-black/60">
                    {obj.id}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* No objects message */}
      {isProcessing && objects.length === 0 && (
        <div className="absolute bottom-12 left-4 z-30 px-3 py-1.5 bg-yellow-500/80 rounded text-[11px] font-bold text-white">
          No objects detected in current frame
        </div>
      )}

      {!isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px] z-40">
          <div className="text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-white/20">
              <Pause className="w-6 h-6 text-white" />
            </div>
            <p className="text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-black/40 rounded border border-white/10">
              Signal Paused
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-30 flex gap-2">
        <div className="px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] font-bold text-white flex items-center gap-2 border border-white/10">
          <span className={cn('w-1.5 h-1.5 rounded-full', isProcessing ? 'bg-red-500 animate-pulse' : 'bg-slate-500')} />
          {isProcessing ? 'LIVE' : 'PAUSED'}
        </div>
      </div>
    </div>
  );
}

interface ControlsProps {
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  showBoxes: boolean;
  setShowBoxes: (v: boolean) => void;
  showIds: boolean;
  setShowIds: (v: boolean) => void;
  showLabels: boolean;
  setShowLabels: (v: boolean) => void;
}

export function ControlPanel({
  isProcessing, setIsProcessing,
  showBoxes, setShowBoxes,
  showIds, setShowIds,
  showLabels, setShowLabels,
}: ControlsProps) {

  const toggle = async () => {
    if (isProcessing) {
      await fetch(`${API}/api/detect/stop`, { method: 'POST' });
      setIsProcessing(false);
    } else {
      const res = await fetch(`${API}/api/detect/start`, { method: 'POST' });
      if (res.ok) setIsProcessing(true);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Detection Control</h3>
        <button
          onClick={toggle}
          className={cn(
            'p-1.5 rounded-md border transition-all duration-200',
            isProcessing
              ? 'bg-slate-100 border-slate-200 text-slate-600'
              : 'bg-blue-600 border-blue-500 text-white shadow shadow-blue-500/20'
          )}
        >
          {isProcessing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>
      </div>

      <div className="p-4 space-y-3">
        <Toggle label="Show Bounding Boxes"  active={showBoxes}  onClick={() => setShowBoxes(!showBoxes)} />
        <Toggle label="Show Tracking IDs"    active={showIds}    onClick={() => setShowIds(!showIds)} />
        <Toggle label="Display Class Labels" active={showLabels} onClick={() => setShowLabels(!showLabels)} />

        <div className="pt-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">Class Filter</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(OBJECT_CLASSES).map(([key, cfg]) => (
              <span key={key} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold rounded border border-blue-100 uppercase tracking-tight">
                {cfg.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center justify-between w-full group">
      <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">{label}</span>
      <div className={cn('w-8 h-4 rounded-full relative transition-colors', active ? 'bg-blue-600' : 'bg-slate-200')}>
        <div className={cn('absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm', active ? 'left-[17px]' : 'left-[3px]')} />
      </div>
    </button>
  );
}
