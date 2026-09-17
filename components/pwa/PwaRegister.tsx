'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // 1. Check if app is ALREADY installed / running in Standalone Mode
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://'));

    const isInstalledAlready =
      typeof window !== 'undefined' &&
      localStorage.getItem('technosphere-pwa-installed') === 'true';

    // If app is already installed or running in standalone mode, DO NOT register install listeners or popups
    if (isStandalone || isInstalledAlready) {
      // Still register Service Worker silently for offline capabilities
      if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
      return;
    }

    // 2. Register Service Worker in production
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('TechnoSphere PWA ServiceWorker registered:', registration.scope);
          })
          .catch((error) => {
            console.error('TechnoSphere PWA ServiceWorker registration failed:', error);
          });
      });
    }

    // 3. Listen for BeforeInstallPrompt event only if not dismissed in session
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();

      const isDismissed = sessionStorage.getItem('technosphere-pwa-dismissed') === 'true';
      if (isDismissed) return;

      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    const handleAppInstalled = () => {
      localStorage.setItem('technosphere-pwa-installed', 'true');
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      toast.success('TechnoSphere App Installed Successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('technosphere-pwa-dismissed', 'true');
    setShowInstallBanner(false);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      localStorage.setItem('technosphere-pwa-installed', 'true');
      toast.success('Installing TechnoSphere App...');
    } else {
      sessionStorage.setItem('technosphere-pwa-dismissed', 'true');
    }

    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  if (!showInstallBanner) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900/95 dark:bg-[#0f172a]/95 text-white border border-indigo-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/40">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-white">Install TechnoSphere App</h4>
            <p className="text-[11px] text-slate-300 font-medium">Download to launch directly from desktop or mobile screen.</p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          title="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-end space-x-2">
        <button
          onClick={handleDismiss}
          className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          Dismiss
        </button>
        <button
          onClick={handleInstallClick}
          className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install Now</span>
        </button>
      </div>
    </div>
  );
}
