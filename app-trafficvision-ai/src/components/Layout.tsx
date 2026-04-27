import React from 'react';
import { LayoutDashboard, Upload, BarChart3, Settings, Shield, Bell, User } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Monitor', icon: LayoutDashboard },
    { id: 'upload', label: 'Source', icon: Upload },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'logs', label: 'Logs', icon: Settings },
  ];

  return (
    <div className="w-20 bg-[#0F172A] border-r border-slate-800 h-screen flex flex-col items-center py-6 fixed left-0 top-0 z-50">
      <div className="mb-8">
        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
          T
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            title={item.label}
            className={cn(
              "p-3 rounded-xl transition-all duration-200 group relative",
              activeTab === item.id 
                ? "bg-white/10 text-blue-400" 
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon className="w-6 h-6" />
            {activeTab === item.id && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-500 rounded-l-full" />
            )}
          </button>
        ))}
      </nav>

      <div className="mt-auto">
        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors">
          <User className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </div>
  );
}

export function Navbar() {
  return (
    <header className="h-14 bg-white border-b border-slate-200 fixed top-0 right-0 left-20 z-40 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-bold tracking-tight text-slate-800 uppercase">VisionTrack Pro</h1>
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Live Feed</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500 border border-slate-200 uppercase">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Cam_04_Intersection
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Station #042</span>
          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200" />
        </div>
      </div>
    </header>
  );
}
