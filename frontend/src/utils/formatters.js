/**
 * Reusable text & number formatters for dynamic pluralization and display
 */

/**
 * Returns singular or plural word based on count
 * Example: pluralizeWord(1, 'account', 'accounts') -> 'account'
 * Example: pluralizeWord(2, 'account', 'accounts') -> 'accounts'
 */
export function pluralizeWord(count, singular, plural = null) {
  const n = Math.abs(Number(count) || 0);
  const pluralForm = plural || `${singular}s`;
  return n === 1 ? singular : pluralForm;
}

/**
 * Formats a count with its appropriate singular/plural label
 * Example: pluralize(1, 'lead') -> '1 lead'
 * Example: pluralize(5, 'candidate') -> '5 candidates'
 */
export function pluralize(count, singular, plural = null) {
  const n = Number(count) || 0;
  return `${n} ${pluralizeWord(n, singular, plural)}`;
}

/**
 * Formats minutes into clean talk time string
 * Example: 0 -> '0h'
 * Example: 45 -> '45m'
 * Example: 90 -> '1h 30m'
 */
export function formatTalkTime(minutes = 0) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(m / 60);
  const remainingMinutes = m % 60;

  if (hours === 0 && remainingMinutes === 0) return '0h';
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}
