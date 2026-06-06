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
 * Detect if a budget is "needs review":
 * an active budget that is strictly past its end date (the day after endDate, not on it).
 * Matches the is_adjustment flag logic in the Rust backend.
 */
export function needsReview(budget: Budget): boolean {
	if (budget.status !== 'active') return false;
	// Compare date-only (midnight both sides) to avoid same-day false positives
	const end = new Date(budget.endDate);
	end.setHours(0, 0, 0, 0);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	// Strictly past: today must be after endDate (not on it)
	return today > end;
}

/**
 * Days overdue for a "needs review" budget (for "ended X day(s) ago" display).
 */
export function daysOverdue(budget: Budget): number {
	const end = new Date(budget.endDate);
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

// ── Date display ↔ ISO conversion ────────────────────────────────────────────

const SHORT_MONTHS = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Convert a display date like "Jun 1, 2026" → ISO "2026-06-01" for <input type="date">.
 * Returns '' if the input can't be parsed.
 */
export function toInputDate(display: string): string {
	if (!display) return '';
	const d = new Date(display);
	if (isNaN(d.getTime())) return '';
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Convert an ISO date like "2026-06-01" → display "Jun 1, 2026".
 * Returns '' if the input can't be parsed.
 */
export function fromInputDate(iso: string): string {
	if (!iso) return '';
	// Parse as UTC date components to avoid timezone shifts
	const [yearStr, monthStr, dayStr] = iso.split('-');
	const year = parseInt(yearStr, 10);
	const month = parseInt(monthStr, 10) - 1; // 0-indexed
	const day = parseInt(dayStr, 10);
	if (isNaN(year) || isNaN(month) || isNaN(day)) return '';
	return `${SHORT_MONTHS[month]} ${day}, ${year}`;
}
