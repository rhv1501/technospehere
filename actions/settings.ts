'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import nodemailer from 'nodemailer';

export interface SystemSettings {
  company_name: string;
  official_email: string;
  phone_number: string;
  office_address: string;
  gstin_number: string;
  default_gst_rate: number;
  available_gst_slabs: number[];
  delivery_terms_presets: string[];
  warranty_terms_presets: string[];
  email_subject_prefix: string;
  email_footer_note: string;
  whatsapp_header: string;

  // SMTP Email Configuration
  smtp_host?: string;
  smtp_port?: number;
  smtp_secure?: boolean;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_from_name?: string;
  smtp_from_email?: string;
  smtp_enabled?: boolean;
}

const DEFAULT_SETTINGS: SystemSettings = {
  company_name: 'TechnoSphere Business Solutions',
  official_email: 'sales@technosphere.in',
  phone_number: '+91 98765 43210',
  office_address: 'TechnoSphere Tower, Cyber Hub, Industrial Zone',
  gstin_number: '27AAAAA0000A1Z5',
  default_gst_rate: 18.0,
  available_gst_slabs: [0, 5, 12, 18, 28],
  delivery_terms_presets: [
    'Doorstep Delivery (5-7 Business Days)',
    'Doorstep Express Delivery (48 Hours)',
    'Ex-Works / Factory Pickup',
    'FOB Shipping',
  ],
  warranty_terms_presets: [
    '1 Year Standard Manufacturer Warranty',
    '2 Years Onsite Warranty',
    '3 Years Premier Support Warranty',
    '90 Days Limited Warranty',
  ],
  email_subject_prefix: 'Request for Quotation',
  email_footer_note: 'Please email your official quotation with price breakdown and lead time to sales@technosphere.in',
  whatsapp_header: 'QUOTATION REQUEST - TechnoSphere',

  smtp_host: '',
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: '',
  smtp_pass: '',
  smtp_from_name: 'TechnoSphere Procurement',
  smtp_from_email: '',
  smtp_enabled: false,
};

export async function getSystemSettings(): Promise<{ success: boolean; settings: SystemSettings; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'main_config')
      .maybeSingle();

    if (error) {
      console.error('Error querying system_settings table:', error);
      return {
        success: false,
        settings: DEFAULT_SETTINGS,
        error: error.message,
      };
    }

    if (data && data.value) {
      const storedValue = data.value as unknown as Partial<SystemSettings>;
      return {
        success: true,
        settings: {
          ...DEFAULT_SETTINGS,
          ...storedValue,
        },
      };
    }

    return {
      success: true,
      settings: DEFAULT_SETTINGS,
    };
  } catch (error: any) {
    console.error('Error fetching system settings:', error);
    return {
      success: false,
      settings: DEFAULT_SETTINGS,
      error: error.message || 'Failed to fetch system settings',
    };
  }
}

export async function updateSystemSettings(newSettings: Partial<SystemSettings>) {
  try {
    const supabase = createAdminClient();
    const currentRes = await getSystemSettings();
    const updated = {
      ...currentRes.settings,
      ...newSettings,
    };

    // Upsert into system_settings table
    const { error } = await supabase
      .from('system_settings')
      .upsert(
        {
          key: 'main_config',
          value: updated as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('Error updating system_settings table:', error);
      return { success: false, error: error.message || 'Failed to update system settings in database' };
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/leads');
    revalidatePath('/dashboard/vendors');
    revalidatePath('/dashboard/analytics');

    return { success: true, settings: updated };
  } catch (error: any) {
    console.error('Error updating system settings:', error);
    return { success: false, error: error.message || 'Failed to update system settings' };
  }
}

export async function testSmtpConnection(settings: {
  smtp_host?: string;
  smtp_port?: number;
  smtp_secure?: boolean;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_from_email?: string;
}) {
  try {
    if (!settings.smtp_host?.trim() || !settings.smtp_port) {
      return { success: false, error: 'SMTP Host and Port are required to test connection.' };
    }

    const host = settings.smtp_host.trim();
    const port = Number(settings.smtp_port) || 587;
    const secure = Boolean(settings.smtp_secure);
    const user = settings.smtp_user?.trim();
    const pass = settings.smtp_pass;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass: pass || '' } : undefined,
      connectionTimeout: 10000,
    });

    await transporter.verify();

    return {
      success: true,
      message: `SMTP connection to ${host}:${port} verified successfully!`,
    };
  } catch (error: any) {
    console.error('Error verifying SMTP connection:', error);
    return {
      success: false,
      error: error.message || 'Failed to establish SMTP connection',
    };
  }
}
