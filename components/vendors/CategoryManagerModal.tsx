'use client';

import { useState, useEffect } from 'react';
import { X, Tag, Plus, Loader2, ChevronRight } from 'lucide-react';
import { createCategory } from '@/actions/categories';
import { toast } from 'sonner';

export function CategoryManagerModal({
  isOpen,
  onClose,
  categories,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Keyboard shortcut listener (ESC to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const res = await createCategory({ name, description });
    setLoading(false);

    if (res.success) {
      toast.success(`Category "${name}" added successfully!`);
      setName('');
      setDescription('');
      onSuccess();
    } else {
      toast.error(res.error || 'Failed to add category');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg flex flex-col max-h-[calc(100dvh-2.5rem)] shadow-2xl shadow-slate-950/50 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/80 dark:bg-[#0d1527] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">
                <span>System Configuration</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Category Management</h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-md">
              ESC
            </kbd>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
          {/* Add Form */}
          <form onSubmit={handleAdd} className="space-y-3 bg-slate-50/60 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
            <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Add New Product Category</h4>
            <div>
              <input
                type="text"
                required
                placeholder="Category Name (e.g. Lenovo Commercial)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Description (Optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 disabled:opacity-50 shadow-md shadow-indigo-600/30 transition-all active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Save Category</span>
            </button>
          </form>

          {/* Existing Categories */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Configured Categories ({categories.length})
              </h4>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-200 text-xs">{cat.name}</span>
                    {cat.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{cat.description}</p>
                    )}
                  </div>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-mono font-semibold">
                    ID: {cat.id.slice(0, 8)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
