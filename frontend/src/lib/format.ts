/** Backend timestamps are naive UTC (datetime.utcnow); mark them as UTC before formatting. */
export function toDate(iso?: string | null): Date | null {
  if (!iso) return null;
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
}

export function timeAgo(iso?: string | null): string {
  const d = toDate(iso);
  if (!d) return '';
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export const inr = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;
