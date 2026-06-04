/**
 * TAG_COLORS — 10-color lookup table.
 * Each entry has fill, text, and dot colors for light and dark modes.
 * Used by TagBadge, ColorPicker, and Stats components.
 */
import type { ColorKey } from '$lib/types';

export interface TagColorEntry {
	light: { fill: string; text: string };
	dark: { fill: string; text: string };
	dot: string; // same in both modes
}

export const TAG_COLORS: Record<ColorKey, TagColorEntry> = {
	red: {
		light: { fill: '#FEE2E2', text: '#991B1B' },
		dark: { fill: '#3A1E1E', text: '#F7A8A8' },
		dot: '#DC2626'
	},
	orange: {
		light: { fill: '#FFEDD5', text: '#9A3412' },
		dark: { fill: '#3A2615', text: '#FBBF8F' },
		dot: '#EA580C'
	},
	amber: {
		light: { fill: '#FEF3C7', text: '#92400E' },
		dark: { fill: '#392E12', text: '#F8D27A' },
		dot: '#D97706'
	},
	green: {
		light: { fill: '#DCFCE7', text: '#166534' },
		dark: { fill: '#14301E', text: '#86E5A6' },
		dot: '#16A34A'
	},
	teal: {
		light: { fill: '#CCFBF1', text: '#115E59' },
		dark: { fill: '#103230', text: '#5FE3D0' },
		dot: '#0D9488'
	},
	blue: {
		light: { fill: '#DBEAFE', text: '#1E40AF' },
		dark: { fill: '#15294A', text: '#9AC0F7' },
		dot: '#2563EB'
	},
	indigo: {
		light: { fill: '#E0E7FF', text: '#3730A3' },
		dark: { fill: '#1E2150', text: '#ABB6F8' },
		dot: '#4F46E5'
	},
	purple: {
		light: { fill: '#F3E8FF', text: '#6B21A8' },
		dark: { fill: '#281B3E', text: '#D6B0F2' },
		dot: '#9333EA'
	},
	pink: {
		light: { fill: '#FCE7F3', text: '#9D174D' },
		dark: { fill: '#3A1B2B', text: '#F4A6CE' },
		dot: '#DB2777'
	},
	gray: {
		light: { fill: '#F3F4F6', text: '#374151' },
		dark: { fill: '#26272B', text: '#CBD2DC' },
		dot: '#6B7280'
	}
};
