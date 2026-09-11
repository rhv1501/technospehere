'use client';

import { Menu, RefreshCw, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { logoutAdmin } from '@/actions/auth';

interface AdminHeaderProps {
  title: string;
  onOpenMobileSidebar?: () => void;
}

export function AdminHeader({ title, onOpenMobileSidebar }: AdminHeaderProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    toast.success('Data refreshed');
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleLogout = async () => {
    await logoutAdmin();
    toast.info('Signed out');
    window.location.href = '/login';
  };

  return (
    <header className="h-16 bg-white/80 dark:bg-[#0d1322]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-200">
      <div className="flex items-center space-x-3 truncate mr-2">
        {onOpenMobileSidebar && (
          <button
            onClick={onOpenMobileSidebar}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden shrink-0"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <h2 className="text-xs sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
          {title}
        </h2>
      </div>

      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        <ThemeToggle />

        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        <button
          onClick={handleLogout}
          className="px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-500" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
