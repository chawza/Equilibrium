/**
 * TypeScript types matching the SQLite schema and Rust models.
 * These mirror the types that tauri-specta will generate in bindings.ts.
 */

export type BudgetStatus = 'plan' | 'active' | 'review' | 'closed';
export type ColorKey =
	| 'red'
	| 'orange'
	| 'amber'
	| 'green'
	| 'teal'
	| 'blue'
	| 'indigo'
	| 'purple'
	| 'pink'
	| 'gray';
export type RecordType = 'inflow' | 'outflow';

export interface Budget {
	id: number;
	name: string;
	startDate: string; // ISO "2026-06-01" — use formatDate() to display
	endDate: string;   // ISO "2026-06-30" — use formatDate() to display
	status: BudgetStatus;
	createdAt: string;
	records: Record[];
}

export interface Record {
	id: number;
	budgetId: number;
	type: RecordType;
	emoji: string; // single emoji character
	label: string;
	amount: number; // integer Rupiah, no decimals
	notes?: string;
	/** True when this record was created while the budget was in "needs review" (active + past end_date). Immutable. */
	isAdjustment: boolean;
	tags: Tag[];
}

export interface Tag {
	id: number;
	name: string;
	color: ColorKey;
}
