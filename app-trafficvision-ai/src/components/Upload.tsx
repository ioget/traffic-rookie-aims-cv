import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileVideo, CheckCircle2, X, Loader2, Bell } from 'lucide-react';
import { cn } from '../lib/utils';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

type Status = 'idle' | 'uploading' | 'ready' | 'running' | 'done' | 'error';

interface Notif {
  id:      number;
  type:    'success' | 'error' | 'info';
  message: string;
}

let notifId = 0;

export function VideoUploadZone() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [file,   setFile]   = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error,  setError]  = useState('');
  const [notifs, setNotifs] = useState<Notif[]>([]);

  // Progress state polled from backend
  const [progress, setProgress] = useState({ total: 0, frames: 0, pct: 0 });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pushNotif = (message: string, type: Notif['type'] = 'info') => {
    const id = ++notifId;
    setNotifs(prev => [...prev, { id, type, message }]);
    setTimeout(() => setNotifs(prev => prev.filter(n => n.id !== id)), 4000);
  };

  // Poll /api/stats while running
  useEffect(() => {
    if (status !== 'running') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    // Get total frames from backend to compute progress
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${API}/api/stats`);
        const data = await res.json();

        setProgress({
          total:  data.total_frames ?? 0,
          frames: data.frames_done  ?? 0,
          pct:    data.progress_pct ?? 0,
        });

        if (!data.running && data.frames_done > 0) {
          clearInterval(pollRef.current!);
          setStatus('done');
          setProgress(prev => ({ ...prev, pct: 100 }));
          pushNotif('Detection complete — output is ready!', 'success');
        }
      } catch {}
    }, 800);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type.startsWith('video/')) pickFile(dropped);
  };

  const pickFile = (f: File) => {
    setFile(f);
    setStatus('idle');
    setError('');
    setProgress({ total: 0, frames: 0, pct: 0 });
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setError('');
    pushNotif('Uploading video…', 'info');

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(`${API}/api/upload`, { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Upload failed');
      setStatus('ready');
      pushNotif('Upload successful — ready to start detection.', 'success');
    } catch (e: any) {
      setError(e.message);
      setStatus('error');
      pushNotif(`Upload failed: ${e.message}`, 'error');
    }
  };

  const handleStart = async () => {
    try {
      // Get total frame count estimate from video duration (approximation)
      const res = await fetch(`${API}/api/detect/start`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Start failed');
      setStatus('running');
      setProgress({ total: 600, frames: 0, pct: 0 }); // default estimate
      pushNotif('Detection started…', 'info');
    } catch (e: any) {
      setError(e.message);
      setStatus('error');
      pushNotif(`Failed to start: ${e.message}`, 'error');
    }
  };

  const handleStop = async () => {
    await fetch(`${API}/api/detect/stop`, { method: 'POST' });
    setStatus('ready');
    setProgress(prev => ({ ...prev, pct: 0 }));
    pushNotif('Detection stopped.', 'info');
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setError('');
    setProgress({ total: 0, frames: 0, pct: 0 });
  };

  return (
    <div className="space-y-6">
      {/* Notification stack */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {notifs.map(n => (
          <div
            key={n.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white animate-in slide-in-from-right-4 duration-300 pointer-events-auto',
              n.type === 'success' && 'bg-emerald-500',
              n.type === 'error'   && 'bg-red-500',
              n.type === 'info'    && 'bg-blue-500',
            )}
          >
            <Bell className="w-4 h-4 shrink-0" />
            {n.message}
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-3xl border-2 border-dashed border-slate-200 transition-all duration-300">
        <div className="max-w-md mx-auto text-center">
          {file ? (
            <div className="space-y-4">
              {/* Icon */}
              <div className={cn(
                'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border shadow-sm transition-colors',
                status === 'done'    ? 'bg-emerald-50 border-emerald-100' :
                status === 'running' ? 'bg-blue-50 border-blue-100'       :
                                       'bg-slate-50 border-slate-100'
              )}>
                {status === 'done'
                  ? <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  : status === 'running' || status === 'uploading'
                  ? <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  : <FileVideo className="w-8 h-8 text-slate-500" />
                }
              </div>

              {/* File info */}
              <div>
                <h4 className="font-bold text-slate-900">{file.name}</h4>
                <p className="text-xs text-slate-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB &nbsp;·&nbsp;
                  {status === 'idle'      && 'Ready to upload'}
                  {status === 'uploading' && 'Uploading…'}
                  {status === 'ready'     && 'Ready to detect'}
                  {status === 'running'   && `Processing… ${progress.pct}%`}
                  {status === 'done'      && 'Output ready ✓'}
                  {status === 'error'     && `Error: ${error}`}
                </p>
              </div>

              {/* Progress bar (visible while running or done) */}
              {(status === 'running' || status === 'done') && (
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      status === 'done' ? 'bg-emerald-500' : 'bg-blue-500'
                    )}
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
              )}

              {/* Stats row while running */}
              {status === 'running' && (
                <div className="flex justify-center gap-6 text-xs text-slate-500">
                  <span>Detections: <strong className="text-slate-800">{progress.frames}</strong></span>
                  <span>Progress: <strong className="text-slate-800">{progress.pct}%</strong></span>
                </div>
              )}

              {/* Done banner */}
              {status === 'done' && (
                <div className="flex items-center gap-2 justify-center px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Output ready — check Dashboard & Logs
                </div>
              )}

              {error && <p className="text-xs text-red-500">{error}</p>}

              {/* Action buttons */}
              <div className="flex gap-3 justify-center pt-2">
                {status === 'idle' && (
                  <button onClick={handleUpload} className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 transition-all">
                    Upload & Initialize
                  </button>
                )}
                {status === 'uploading' && (
                  <span className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                  </span>
                )}
                {status === 'ready' && (
                  <button onClick={handleStart} className="px-6 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-200 hover:scale-105 active:scale-95 transition-all">
                    Start Detection
                  </button>
                )}
                {status === 'running' && (
                  <button onClick={handleStop} className="px-6 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:scale-105 active:scale-95 transition-all">
                    Stop
                  </button>
                )}
                {status !== 'running' && status !== 'uploading' && (
                  <button onClick={reset} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              onDragEnter={handleDrag} onDragOver={handleDrag}
              onDragLeave={handleDrag} onDrop={handleDrop}
              className={cn(
                'p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer group',
                isDragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-100 hover:border-slate-300'
              )}
            >
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Upload Traffic Feed</h3>
              <p className="text-sm text-slate-500 mb-6 px-10 leading-relaxed">
                Drag & drop your MP4/AVI or click to browse.
              </p>
              <label className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
                Select File
                <input type="file" accept="video/*" className="hidden"
                  onChange={e => e.target.files?.[0] && pickFile(e.target.files[0])} />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
