import React from 'react';
import { IconBook, IconSun, IconMoon } from './Icon';

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, toggleTheme }) => {
  return (
    <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-green-600 p-2 rounded-lg">
            <IconBook className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              OQF Compliance Auditor
            </h1>
            <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-[0.2em]">
              AI-Powered Academic Standard Audit & Compliance Platform
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Draft Auto-Saved</span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-green-500 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <IconMoon className="h-6 w-6" />
            ) : (
              <IconSun className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};