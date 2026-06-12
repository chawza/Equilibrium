/**
 * Shared formatting utilities.
 */
import type { Budget } from '$lib/types';

/**
 * Format an integer Rupiah amount as "Rp X.XXX.XXX" (dot as thousands separator, no decimals).
 */
export function formatCurrency(amount: number): string {
	return 'Rp ' + Math.abs(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parse an ISO date string like "2026-06-01" to a local-midnight Date object,
 * avoiding the UTC-midnight timezone skew of `new Date("2026-06-01")`.
 */
function parseISODate(iso: string): Date {
	const [yearStr, monthStr, dayStr] = iso.split('-');
	return new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10));
}

/**
 * Detect if a budget is "needs review":
 * an active budget that is strictly past its end date (the day after endDate, not on it).
 * Matches the is_adjustment flag logic in the Rust backend.
 */
export function needsReview(budget: Budget): boolean {
	if (budget.status !== 'active') return false;
	const end = parseISODate(budget.endDate);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	// Strictly past: today must be after endDate (not on it)
	return today > end;
}

/**
 * Days overdue for a "needs review" budget (for "ended X day(s) ago" display).
 */
export function daysOverdue(budget: Budget): number {
	const end = parseISODate(budget.endDate);
	const now = new Date();
	const diff = now.getTime() - end.getTime();
	return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// ── Amount field helpers ───────────────────────────────────────────────────────

/** Strip non-digit characters and return integer Rupiah value. */
export function parseAmount(str: string): number {
	const cleaned = str.replace(/[^\d]/g, '');
	return parseInt(cleaned, 10) || 0;
}

/** Format digits string with dot thousands separators for the amount input. */
export function groupDigits(str: string): string {
	const digits = str.replace(/[^\d]/g, '');
	return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ── Date display ─────────────────────────────────────────────────────────────

/**
 * How dates are rendered app-wide.
 *
 * - 'default'  → "Jun 1, 2026"   (abbreviated month — original rendering)
 * - 'iso'      → "2026-06-01"    (ISO 8601 — compact, unambiguous, sortable)
 * - 'long'     → "June 1, 2026"  (full month name, month-first)
 * - 'dayfirst' → "1 June 2026"   (full month name, day-first)
 *
 * Stored in localStorage('eq_dateFormat') by the dateFormatStore.
 * Pass `dateFormatStore.value` at call sites for reactive re-rendering.
 */
export type DateFormat = 'default' | 'iso' | 'long' | 'dayfirst';

const SHORT_MONTHS = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTHS = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Convert a stored ISO date like "2026-06-01" to a human-readable string.
 * Pass `dateFormatStore.value` as `fmt` in templates for reactive re-rendering.
 * Returns '' if the input is missing or malformed.
 */
export function formatDate(iso: string, fmt: DateFormat = 'default'): string {
	if (!iso) return '';
	const [yearStr, monthStr, dayStr] = iso.split('-');
	const year = parseInt(yearStr, 10);
	const month = parseInt(monthStr, 10) - 1; // 0-indexed
	const day = parseInt(dayStr, 10);
	if (isNaN(year) || isNaN(month) || isNaN(day) || month < 0 || month > 11) return '';
	switch (fmt) {
		case 'iso':      return `${yearStr}-${monthStr}-${dayStr}`;
		case 'long':     return `${FULL_MONTHS[month]} ${day}, ${year}`;
		case 'dayfirst': return `${day} ${FULL_MONTHS[month]} ${year}`;
		default:         return `${SHORT_MONTHS[month]} ${day}, ${year}`;
	}
}
