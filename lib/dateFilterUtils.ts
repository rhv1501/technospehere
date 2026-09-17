export type DateRangePreset = 'all' | 'today' | 'yesterday' | 'weekly' | 'monthly' | 'custom';

export interface DateFilterState {
  preset: DateRangePreset;
  customFrom?: string; // YYYY-MM-DD
  customTo?: string;   // YYYY-MM-DD
}

/**
 * Calculates local start and end Date objects for a given preset or custom date range.
 */
export function getDateBounds(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string
): { start: Date | null; end: Date | null } {
  const now = new Date();

  if (preset === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end };
  }

  if (preset === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
    const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
    return { start, end };
  }

  if (preset === 'weekly') {
    // Past 7 days (including today)
    const past7 = new Date(now);
    past7.setDate(now.getDate() - 6);
    const start = new Date(past7.getFullYear(), past7.getMonth(), past7.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end };
  }

  if (preset === 'monthly') {
    // Current month (1st of month to end of today)
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end };
  }

  if (preset === 'custom' && customFrom && customTo) {
    const [fY, fM, fD] = customFrom.split('-').map(Number);
    const [tY, tM, tD] = customTo.split('-').map(Number);
    if (!isNaN(fY) && !isNaN(fM) && !isNaN(fD) && !isNaN(tY) && !isNaN(tM) && !isNaN(tD)) {
      const start = new Date(fY, fM - 1, fD, 0, 0, 0, 0);
      const end = new Date(tY, tM - 1, tD, 23, 59, 59, 999);
      return { start, end };
    }
  }

  // 'all' or default
  return { start: null, end: null };
}

/**
 * Checks if a timestamp ISO string falls within the start and end dates (inclusive).
 */
export function isWithinDateRange(
  createdAtString: string | null | undefined,
  start: Date | null,
  end: Date | null
): boolean {
  if (!start || !end) return true; // Unfiltered
  if (!createdAtString) return false;

  const itemDate = new Date(createdAtString);
  if (isNaN(itemDate.getTime())) return false;

  return itemDate >= start && itemDate <= end;
}

/**
 * Helper to format Date objects into readable strings (e.g. Sep 17, 2026).
 */
function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Returns a human-friendly string describing the currently selected date range.
 */
export function formatDateRangeLabel(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string
): string {
  const { start, end } = getDateBounds(preset, customFrom, customTo);

  if (preset === 'all' || !start || !end) {
    return 'All Time';
  }

  if (preset === 'today') {
    return `Today (${formatShortDate(start)})`;
  }

  if (preset === 'yesterday') {
    return `Yesterday (${formatShortDate(start)})`;
  }

  if (preset === 'weekly') {
    return `This Week (${formatShortDate(start)} – ${formatShortDate(end)})`;
  }

  if (preset === 'monthly') {
    return `This Month (${formatShortDate(start)} – ${formatShortDate(end)})`;
  }

  if (preset === 'custom' && customFrom && customTo) {
    return `Custom (${formatShortDate(start)} – ${formatShortDate(end)})`;
  }

  return 'Custom Date Range';
}
