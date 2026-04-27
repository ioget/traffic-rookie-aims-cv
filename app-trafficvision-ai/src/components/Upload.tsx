import React, { useState } from 'react';
import { Upload, FileVideo, CheckCircle2, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

type Status = 'idle' | 'uploading' | 'ready' | 'running' | 'error';

export function VideoUploadZone() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile]     = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError]   = useState('');

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
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setError('');

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(`${API}/api/upload`, { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Upload failed');
      setStatus('ready');
    } catch (e: any) {
      setError(e.message);
      setStatus('error');
    }
  };

  const handleStart = async () => {
    setStatus('running');
    try {
      const res = await fetch(`${API}/api/detect/start`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Start failed');
    } catch (e: any) {
      setError(e.message);
      setStatus('error');
    }
  };

  const handleStop = async () => {
    await fetch(`${API}/api/detect/stop`, { method: 'POST' });
    setStatus('ready');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl border-2 border-dashed border-slate-200 transition-all duration-300">
        <div className="max-w-md mx-auto text-center">
          {file ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
                <FileVideo className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{file.name}</h4>
                <p className="text-xs text-slate-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB •{' '}
                  {status === 'idle'     && 'Ready to upload'}
                  {status === 'uploading'&& 'Uploading…'}
                  {status === 'ready'    && 'Uploaded — ready to detect'}
                  {status === 'running'  && 'Detection running…'}
                  {status === 'error'    && `Error: ${error}`}
                </p>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex gap-3 justify-center pt-2">
                {status === 'idle' && (
                  <button
                    onClick={handleUpload}
                    className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 transition-all"
                  >
                    Upload & Initialize
                  </button>
                )}
                {status === 'uploading' && (
                  <span className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                  </span>
                )}
                {status === 'ready' && (
                  <button
                    onClick={handleStart}
                    className="px-6 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-200 hover:scale-105 active:scale-95 transition-all"
                  >
                    Start Detection
                  </button>
                )}
                {status === 'running' && (
                  <button
                    onClick={handleStop}
                    className="px-6 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:scale-105 active:scale-95 transition-all"
                  >
                    Stop Detection
                  </button>
                )}
                <button
                  onClick={() => { setFile(null); setStatus('idle'); }}
                  className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
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
                Drag and drop your MP4/AVI files or click to browse.
              </p>
              <label className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
                Select File
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && pickFile(e.target.files[0])}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
