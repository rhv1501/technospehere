'use client';

import { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { RealtimeListener } from '@/components/dashboard/RealtimeListener';

interface DashboardShellProps {
  pendingCount: number;
  children: React.ReactNode;
}

export function DashboardShell({ pendingCount, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      <RealtimeListener />

      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <AdminSidebar pendingCount={pendingCount} />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative flex-1 max-w-xs w-full bg-white dark:bg-[#0d1322] h-full shadow-2xl flex flex-col z-10">
            <AdminSidebar
              pendingCount={pendingCount}
              isMobile
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <AdminHeader
          title="Vendor Quotation Management"
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
