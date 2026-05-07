import React from 'react';
import { Bell, Search, User, Menu } from 'lucide-react';

const Header = ({ onMenuClick, user }) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-sky-200">
      <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">

        {/* Left Section: Mobile Menu & Search */}
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Right Section: Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-4">



          <div className="h-8 w-px bg-sky-200 mx-1 hidden sm:block"></div>

          {/* User Profile Summary */}
          <div className="flex items-center gap-3 pl-2 group cursor-pointer">
            <div className="text-right pr-2">
              <p className="text-sm font-semibold text-gray-900 group-hover:text-sky-600 transition-colors leading-tight">
                {user?.name || 'User'}
              </p>
              <p className="text-[11px] font-medium text-slate-500 leading-tight">
                ID: {user?.username || user?.employeeCode || '—'}
              </p>
              <p className="text-[10px] uppercase font-bold text-sky-600 tracking-wider mt-0.5">
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