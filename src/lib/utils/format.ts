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
 * an active budget whose endDate has passed.
 */
export function needsReview(budget: Budget): boolean {
	if (budget.status !== 'active') return false;
	// endDate is stored as "Jun 30, 2026" — parse it
	const end = new Date(budget.endDate);
	return end < new Date();
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
