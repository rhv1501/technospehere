'use client';

import { useState, useEffect } from 'react';
import { Calendar, Filter, X, Check, ChevronDown } from 'lucide-react';
import { DateRangePreset, formatDateRangeLabel } from '@/lib/dateFilterUtils';

interface DateFilterBarProps {
  selectedPreset: DateRangePreset;
  customFrom?: string;
  customTo?: string;
  onFilterChange: (preset: DateRangePreset, customFrom?: string, customTo?: string) => void;
  className?: string;
}

export function DateFilterBar({
  selectedPreset,
  customFrom = '',
  customTo = '',
  onFilterChange,
  className = '',
}: DateFilterBarProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(selectedPreset === 'custom');
  const [tempFrom, setTempFrom] = useState(customFrom);
  const [tempTo, setTempTo] = useState(customTo);
  const [errorMsg, setErrorMsg] = useState('');

  // Synchronize internal state when props change
  useEffect(() => {
    if (selectedPreset === 'custom') {
      setShowCustomPicker(true);
    }
    setTempFrom(customFrom);
    setTempTo(customTo);
  }, [selectedPreset, customFrom, customTo]);

  const presets: { id: DateRangePreset; label: string }[] = [
    { id: 'all', label: 'All Time' },
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'weekly', label: 'Weekly (7D)' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'custom', label: 'Custom' },
  ];

  const handlePresetSelect = (preset: DateRangePreset) => {
    setErrorMsg('');
    if (preset === 'custom') {
      setShowCustomPicker(true);
      // Default temp dates if empty: today
      const todayStr = new Date().toISOString().split('T')[0];
      if (!tempFrom) setTempFrom(todayStr);
      if (!tempTo) setTempTo(todayStr);
    } else {
      setShowCustomPicker(false);
      onFilterChange(preset);
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempFrom || !tempTo) {
      setErrorMsg('Please select both Start and End dates.');
      return;
    }
    if (new Date(tempFrom) > new Date(tempTo)) {
      setErrorMsg('Start Date cannot be later than End Date.');
      return;
    }

    setErrorMsg('');
    onFilterChange('custom', tempFrom, tempTo);
  };

  const activeLabel = formatDateRangeLabel(selectedPreset, customFrom, customTo);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Primary Filter Bar Container */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-sm transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Active Date Range Indicator Badge */}
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
              <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                Date Range:
              </span>
              <span className="font-extrabold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-200/60 dark:border-slate-700/60 font-mono text-[11px] sm:text-xs">
                {activeLabel}
              </span>
            </div>
          </div>

          {/* Responsive Preset Chips (Mobile Horizontal Scroll / Flex Wrap) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none max-w-full">
            {presets.map((p) => {
              const isActive = selectedPreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center space-x-1 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30 ring-2 ring-indigo-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span>{p.label}</span>
                  {p.id === 'custom' && (
                    <ChevronDown className={`w-3 h-3 transition-transform ${showCustomPicker && isActive ? 'rotate-180' : ''}`} />
                  )}
                </button>
              );
            })}

            {selectedPreset !== 'all' && (
              <button
                onClick={() => {
                  setShowCustomPicker(false);
                  onFilterChange('all');
                }}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 transition-colors"
                title="Clear date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Expandable Drawer */}
        {showCustomPicker && selectedPreset === 'custom' && (
          <form
            onSubmit={handleApplyCustom}
            className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 animate-fade-in"
          >
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  From (Start Date)
                </label>
                <input
                  type="date"
                  value={tempFrom}
                  onChange={(e) => setTempFrom(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  To (End Date)
                </label>
                <input
                  type="date"
                  value={tempTo}
                  onChange={(e) => setTempTo(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply Filter</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowCustomPicker(false);
                    onFilterChange('all');
                  }}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-all text-center"
                >
                  Cancel
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-2">
                {errorMsg}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
