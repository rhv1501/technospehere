import { getAnalyticsData } from '@/actions/analytics';
import { AnalyticsPageClient } from './AnalyticsPageClient';
import { notFound } from 'next/navigation';

export const revalidate = 0;

export default async function AnalyticsPage() {
  const res = await getAnalyticsData();

  if (!res.success || !res.data) {
    notFound();
  }

  return <AnalyticsPageClient analytics={res.data} />;
}
