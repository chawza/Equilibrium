import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Budget } from '$lib/types';
import {
	formatCurrency,
	needsReview,
	daysOverdue,
	parseAmount,
	groupDigits,
	formatDate,
} from './format';

// ── formatCurrency ────────────────────────────────────────────────────────────

describe('formatCurrency', () => {
	it('formats thousands with dots', () => {
		expect(formatCurrency(1_000_000)).toBe('Rp 1.000.000');
		expect(formatCurrency(5_000)).toBe('Rp 5.000');
		expect(formatCurrency(500)).toBe('Rp 500');
	});

	it('strips the sign for negative amounts', () => {
		expect(formatCurrency(-5_000)).toBe('Rp 5.000');
		expect(formatCurrency(-1_000_000)).toBe('Rp 1.000.000');
	});

	it('handles zero', () => {
		expect(formatCurrency(0)).toBe('Rp 0');
	});

	it('handles large amounts', () => {
		expect(formatCurrency(1_234_567_890)).toBe('Rp 1.234.567.890');
	});
});

// ── parseAmount ───────────────────────────────────────────────────────────────

describe('parseAmount', () => {
	it('parses plain integers', () => {
		expect(parseAmount('5000')).toBe(5000);
		expect(parseAmount('1000000')).toBe(1_000_000);
	});

	it('strips dot separators', () => {
		expect(parseAmount('5.000')).toBe(5000);
		expect(parseAmount('1.000.000')).toBe(1_000_000);
	});

	it('strips "Rp " prefix', () => {
		expect(parseAmount('Rp 5.000')).toBe(5000);
	});

	it('returns 0 for empty or non-digit strings', () => {
		expect(parseAmount('')).toBe(0);
		expect(parseAmount('abc')).toBe(0);
		expect(parseAmount('---')).toBe(0);
	});
});

// ── groupDigits ───────────────────────────────────────────────────────────────

describe('groupDigits', () => {
	it('adds dot separators', () => {
		expect(groupDigits('5000')).toBe('5.000');
		expect(groupDigits('1000000')).toBe('1.000.000');
	});

	it('strips non-digit characters first', () => {
		expect(groupDigits('5.000')).toBe('5.000');
		expect(groupDigits('Rp 5000')).toBe('5.000');
	});

	it('handles small numbers without separators', () => {
		expect(groupDigits('500')).toBe('500');
		expect(groupDigits('50')).toBe('50');
	});

	it('handles empty string', () => {
		expect(groupDigits('')).toBe('');
	});
});

// ── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
	it('converts ISO date to display format', () => {
		expect(formatDate('2026-06-01')).toBe('Jun 1, 2026');
		expect(formatDate('2026-01-15')).toBe('Jan 15, 2026');
		expect(formatDate('2025-12-31')).toBe('Dec 31, 2025');
	});

	it('returns empty string for empty input', () => {
		expect(formatDate('')).toBe('');
	});

	it('returns empty string for malformed input', () => {
		expect(formatDate('not-a-date')).toBe('');
		expect(formatDate('2026-13-01')).toBe(''); // month out of range
	});
});

// ── needsReview ───────────────────────────────────────────────────────────────

function budget(overrides: Partial<Budget>): Budget {
	return {
		id: 1,
		name: 'Test',
		startDate: '2026-01-01',
		endDate: '2026-12-31',
		status: 'plan',
		createdAt: '2026-01-01T00:00:00',
		records: [],
		...overrides,
	};
}

describe('needsReview', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns false for non-active budgets', () => {
		const statuses = ['plan', 'review', 'closed'] as const;
		for (const status of statuses) {
			// end date in the past but status is not active
			expect(needsReview(budget({ status, endDate: '2020-01-01' }))).toBe(false);
		}
	});

	it('returns false when end date is today (not strictly past)', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-07T12:00:00'));
		expect(needsReview(budget({ status: 'active', endDate: '2026-06-07' }))).toBe(false);
	});

	it('returns false when end date is in the future', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-07T12:00:00'));
		expect(needsReview(budget({ status: 'active', endDate: '2026-12-31' }))).toBe(false);
	});

	it('returns true when active budget is strictly past end date', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-07T12:00:00'));
		expect(needsReview(budget({ status: 'active', endDate: '2026-06-06' }))).toBe(true);
		expect(needsReview(budget({ status: 'active', endDate: '2020-01-01' }))).toBe(true);
	});

	it('uses midnight normalisation — same calendar day is not overdue', () => {
		vi.useFakeTimers();
		// 11:59 PM on end date: midnight today == midnight end → not overdue
		vi.setSystemTime(new Date('2026-06-07T23:59:59'));
		expect(needsReview(budget({ status: 'active', endDate: '2026-06-07' }))).toBe(false);
	});
});

// ── daysOverdue ───────────────────────────────────────────────────────────────

describe('daysOverdue', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns 0 when end date is today or in the future', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-07T12:00:00'));
		expect(daysOverdue(budget({ endDate: '2026-06-07' }))).toBe(0);
		expect(daysOverdue(budget({ endDate: '2026-12-31' }))).toBe(0);
	});

	it('returns the number of full days past end date', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-10T12:00:00'));
		// 3 full days after Jun 7
		expect(daysOverdue(budget({ endDate: '2026-06-07' }))).toBe(3);
	});

	it('floors partial days', () => {
		vi.useFakeTimers();
		// 1.5 days after — should floor to 1
		vi.setSystemTime(new Date('2026-06-08T12:00:00'));
		expect(daysOverdue(budget({ endDate: '2026-06-07' }))).toBe(1);
	});
});
