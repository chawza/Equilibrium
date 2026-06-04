/**
 * STATUS_BADGE — unified blue-hue lifecycle palette.
 * Used by StatusBadge component (NOT the --status-* CSS tokens which are for the stepper).
 */
import type { BudgetStatus } from '$lib/types';

export interface StatusBadgeEntry {
	light: { bg: string; fg: string };
	dark: { bg: string; fg: string };
}

export const STATUS_BADGE: Record<BudgetStatus, StatusBadgeEntry> = {
	plan: {
		light: { bg: '#EFF4FE', fg: '#3B6FD4' },
		dark: { bg: '#172541', fg: '#9CBAF6' }
	},
	active: {
		light: { bg: '#DBE7FB', fg: '#1E47A8' },
		dark: { bg: '#1C3158', fg: '#B4CDF8' }
	},
	review: {
		light: { bg: '#C5D8F7', fg: '#1A3A86' },
		dark: { bg: '#243C66', fg: '#CADCFB' }
	},
	closed: {
		light: { bg: '#EEF1F6', fg: '#7A879C' },
		dark: { bg: '#27292F', fg: '#9BA5B3' }
	}
};

/**
 * "Needs review" amber badge colors.
 * Uses the amber tag fill/text — same as TAG_COLORS.amber.
 */
export const NEEDS_REVIEW_BADGE = {
	light: { bg: '#FEF3C7', fg: '#92400E' },
	dark: { bg: '#392E12', fg: '#F8D27A' }
};
