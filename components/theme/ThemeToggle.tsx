'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 transition-all hover:scale-105 active:scale-95 shadow-sm flex items-center justify-center gap-1.5 text-xs font-bold"
        title="Toggle Theme"
        aria-label="Toggle Light or Dark Theme"
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="w-4 h-4 text-indigo-400 animate-fade-in" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500 animate-fade-in" />
        )}
        <span className="hidden sm:inline capitalize text-[11px] font-extrabold">
          {theme === 'system' ? 'System' : theme}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xl py-1.5 z-50 animate-fade-in backdrop-blur-lg">
          <button
            onClick={() => {
              setTheme('light');
              setIsOpen(false);
            }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold transition-colors ${
              theme === 'light'
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Light</span>
          </button>

          <button
            onClick={() => {
              setTheme('dark');
              setIsOpen(false);
            }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold transition-colors ${
              theme === 'dark'
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Moon className="w-4 h-4 text-indigo-400" />
            <span>Dark</span>
          </button>

          <button
            onClick={() => {
              setTheme('system');
              setIsOpen(false);
            }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold transition-colors ${
              theme === 'system'
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Laptop className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>System</span>
          </button>
        </div>
      )}
    </div>
  );
}
