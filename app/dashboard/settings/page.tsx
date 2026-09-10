import { getCategoriesWithStats } from '@/actions/categories';
import { getSystemSettings } from '@/actions/settings';
import { SettingsPageClient } from './SettingsPageClient';
import { notFound } from 'next/navigation';

export const revalidate = 0;

export default async function SettingsPage() {
  const [catRes, settingsRes] = await Promise.all([
    getCategoriesWithStats(),
    getSystemSettings(),
  ]);

  if (!catRes.success || !catRes.categories) {
    notFound();
  }

  return (
    <SettingsPageClient
      categories={catRes.categories}
      initialSettings={settingsRes.settings}
    />
  );
}
