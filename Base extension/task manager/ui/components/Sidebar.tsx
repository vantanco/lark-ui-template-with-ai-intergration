import React from 'react';
import { LayoutDashboard, FolderKanban, Settings, Users, Command } from 'lucide-react';

interface SidebarProps {
  activeTab: 'overview' | 'workspace';
  setActiveTab: (tab: 'overview' | 'workspace') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'workspace', label: 'Workspace', icon: FolderKanban },
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 z-30 hidden md:flex">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white mr-3 shadow-lg shadow-indigo-900/20">
          <Command className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg tracking-tight">NovaBoard</h1>
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Agency OS</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-200' : 'text-slate-500 group-hover:text-slate-300'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
          <Users className="w-5 h-5 text-slate-500" />
          Team
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
          <Settings className="w-5 h-5 text-slate-500" />
          Settings
        </button>
      </div>

      {/* User Profile Stub */}
      <div className="p-4 border-t border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
          PM
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">Project Manager</p>
          <p className="text-xs text-slate-500 truncate">admin@sunrise.agency</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;