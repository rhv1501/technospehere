'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  ExternalLink,
  Layers,
  Send,
  Settings,
  X,
} from 'lucide-react';
import { logoutAdmin } from '@/actions/auth';
import { toast } from 'sonner';

interface AdminSidebarProps {
  pendingCount?: number;
  isMobile?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ pendingCount = 0, isMobile = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: Layers,
    },
    {
      name: 'Vendors',
      href: '/dashboard/vendors',
      icon: Building2,
      count: pendingCount > 0 ? pendingCount : null,
    },
    {
      name: 'Leads & Quotations',
      href: '/dashboard/leads',
      icon: FileText,
    },
    {
      name: 'Communication Logs',
      href: '/dashboard/logs',
      icon: Send,
    },
    {
      name: 'Settings & Categories',
      href: '/dashboard/settings',
      icon: Settings,
    },
  ];

  const handleCopyPublicLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const publicUrl = `${origin}/vendor-register`;
    navigator.clipboard.writeText(publicUrl);
    toast.success('Public Vendor Registration link copied');
    if (isMobile && onClose) onClose();
  };

  return (
    <aside className={`w-64 bg-white dark:bg-[#0d1322] border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col h-full sticky top-0 z-30 shrink-0 select-none ${isMobile ? 'w-full' : ''}`}>
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
        <Link
          href="/dashboard"
          onClick={() => isMobile && onClose && onClose()}
          className="flex items-center space-x-2.5"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-slate-100 tracking-tight text-sm">
              TechnoSphere
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Enterprise Portal</p>
          </div>
        </Link>

        {isMobile && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Navigation
        </div>

        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => isMobile && onClose && onClose()}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`}
                />
                <span>{item.name}</span>
              </div>

              {item.count !== null && item.count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}

        {/* Quick Actions Header */}
        <div className="pt-5 px-3 mb-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Actions
        </div>

        <button
          onClick={handleCopyPublicLink}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-colors text-left"
        >
          <ExternalLink className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <span>Copy Public Register Link</span>
        </button>

        <Link
          href="/dashboard/leads/new"
          onClick={() => isMobile && onClose && onClose()}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-colors"
        >
          <PlusCircle className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <span>Create New Lead</span>
        </Link>
      </nav>

      {/* Footer / Auth User Profile */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0a0f1b]/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 truncate">
            <div className="w-7 h-7 rounded-md bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 text-[11px] font-semibold shrink-0">
              AD
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-slate-900 dark:text-slate-200 truncate">
                Admin User
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                admin@admin.com
              </p>
            </div>
          </div>

          <button
            onClick={async () => {
              await logoutAdmin();
              toast.info('Signed out');
              window.location.href = '/login';
            }}
            title="Sign Out"
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
