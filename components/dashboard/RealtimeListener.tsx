'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function RealtimeListener() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to public.vendor_registrations insert
    const regChannel = supabase
      .channel('realtime_vendor_registrations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vendor_registrations' },
        (payload) => {
          toast.info(`New Vendor Registration: ${payload.new.company_name} submitted registration form!`, {
            description: 'Check Vendor Database -> Registration Requests tab.',
            duration: 8000,
          });
          router.refresh();
        }
      )
      .subscribe();

    // Subscribe to public.leads status change
    const leadChannel = supabase
      .channel('realtime_leads')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads' },
        (payload) => {
          if (payload.old.status !== payload.new.status) {
            toast.success(`Lead ${payload.new.lead_number} status updated to '${payload.new.status}'`);
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(regChannel);
      supabase.removeChannel(leadChannel);
    };
  }, [supabase, router]);

  return null;
}
