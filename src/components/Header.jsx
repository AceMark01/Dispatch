import React from 'react';
import { Bell, Search, User, Menu, RefreshCw } from 'lucide-react';
import { useDispatchStore } from '../store/dispatchStore';

const Header = ({ onMenuClick, user }) => {
  const { fetchFromSheet, isLoading } = useDispatchStore();

  return (
    <header className="sticky top-0 z-30 glass border-b border-white/40">
      {/* Slimmer on mobile so the page content keeps the screen */}
      <div className="flex justify-between items-center h-12 md:h-16 px-3 sm:px-6 lg:px-8">

        {/* Left Section: Mobile Menu & Search */}
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
          >
            <Menu size={22} />
          </button>
        </div>

        {/* Right Section: Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-4">

          {/* Sync Button */}
          <button
            onClick={fetchFromSheet}
            disabled={isLoading}
            className={`px-3 py-1.5 border border-sky-200 rounded-lg text-sky-700 bg-sky-50/50 hover:bg-sky-100 hover:text-sky-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm ${isLoading ? 'animate-pulse' : ''}`}
            title="Sync with Google Sheets"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Syncing...' : <><span className="md:hidden">Sync</span><span className="hidden md:inline">Sync Sheet</span></>}</span>
          </button>

          <div className="h-8 w-px bg-sky-200 mx-1 hidden sm:block"></div>

          {/* User Profile Summary — name only on mobile, full details on desktop */}
          <div className="flex items-center gap-3 pl-1 md:pl-2 group cursor-pointer">
            <div className="text-right md:pr-2">
              <p className="text-xs md:text-sm font-semibold text-gray-900 group-hover:text-sky-600 transition-colors leading-tight">
                {user?.name || 'User'}
              </p>
              <p className="hidden md:block text-[11px] font-medium text-slate-500 leading-tight">
                ID: {user?.username || user?.employeeCode || '—'}
              </p>
              <p className="hidden md:block text-[10px] uppercase font-bold text-sky-600 tracking-wider mt-0.5">
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;