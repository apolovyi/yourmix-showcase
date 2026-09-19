/**
 * Date-only format for tables and history rows.
 * Output: "1 Mar 2026"
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Date + time for proposal cards and recent uploads.
 * Output: "1 Mar 2026, 14:37"
 */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Compact date format for configuration tables.
 * Output: "01/03/2026"
 */
export function formatDateCompact(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
