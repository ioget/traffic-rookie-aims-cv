import React from 'react';
import { TrafficObject, OBJECT_CLASSES } from '../types';
import { cn } from '../lib/utils';
import { Clock, Activity } from 'lucide-react';

interface LogsTableProps {
  logs: TrafficObject[];
}

export function LogsTable({ logs }: LogsTableProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Live Event Protocol</h3>
        <span className="text-[10px] font-black text-blue-600 tracking-widest animate-pulse">STREAMING</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[10px]">
          <thead>
            <tr className="bg-white border-b border-slate-100">
              <th className="px-4 py-2 font-bold text-slate-400 uppercase">Time</th>
              <th className="px-4 py-2 font-bold text-slate-400 uppercase">Ref ID</th>
              <th className="px-4 py-2 font-bold text-slate-400 uppercase">Class</th>
              <th className="px-4 py-2 font-bold text-slate-400 uppercase">Conf.</th>
              <th className="px-4 py-2 font-bold text-slate-400 uppercase text-right">XY Coords</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                  Waiting for stream...
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={`${log.id}-${log.timestamp}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2 text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                  </td>
                  <td className="px-4 py-2">
                    <span className="font-mono font-bold text-slate-700">{log.id}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span 
                      className="px-2 py-0.5 rounded-full text-[9px] font-black text-white shadow-sm uppercase tracking-tighter"
                      style={{ backgroundColor: OBJECT_CLASSES[log.class].color }}
                    >
                      {log.class}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="font-mono font-black text-slate-900">{(log.confidence).toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-slate-400 text-[9px]">
                    [{log.bbox[0].toFixed(2)}, {log.bbox[1].toFixed(2)}]
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
