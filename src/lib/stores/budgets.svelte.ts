import { commands, type BudgetDetail, type BudgetRecord, type BudgetSummary as BindingsSummary } from '$lib/bindings';
import type { Budget, BudgetSummary, Record as BudgetRec, Tag } from '$lib/types';

// Re-export types consumers need
export type { Budget, BudgetSummary };

function unwrap<T>(result: { status: 'ok'; data: T } | { status: 'error'; error: string }): T {
	if (result.status === 'ok') return result.data;
	throw new Error(result.error);
}

// Cast BudgetSummary from bindings (status: string) → BudgetSummary (status: BudgetStatus)
function asSummary(entry: BindingsSummary): BudgetSummary {
	return entry as unknown as BudgetSummary;
}

// Cast BudgetDetail (status: string) → Budget (status: BudgetStatus) for better typing.
function asBudget(entry: BudgetDetail): Budget {
	return entry as unknown as Budget;
}

// Cast a BudgetRecord (from bindings, type: string, tags: BudgetTag[]) → BudgetRec
function asRecord(entry: BudgetRecord): BudgetRec {
	return {
		id: entry.id,
		budgetId: entry.budgetId,
		type: entry.type as BudgetRec['type'],
		emoji: entry.emoji,
		label: entry.label,
		amount: entry.amount,
		notes: entry.notes ?? undefined,
		isAdjustment: entry.isAdjustment,
		tags: entry.tags as Tag[],
	};
}

class BudgetsStore {
	/** Lightweight summaries — no records. Totals precomputed from SQL. */
	list = $state<BudgetSummary[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	/** Full budget with records — one at a time, only for the open Budget Form. */
	current = $state<Budget | null>(null);
	loadingCurrent = $state(false);
	currentError = $state<string | null>(null);

	async load() {
		this.loading = true;
		this.error = null;
		try {
			this.list = unwrap(await commands.listBudgets()).map(asSummary);
		} catch (e) {
			this.error = String(e);
		} finally {
			this.loading = false;
		}
	}

	async loadOne(id: number) {
		this.loadingCurrent = true;
		this.currentError = null;
		try {
			this.current = asBudget(unwrap(await commands.getBudget(id)));
		} catch (e) {
			this.currentError = String(e);
		} finally {
			this.loadingCurrent = false;
		}
	}

	/** After a record mutation on current, recompute list-entry totals from in-memory records. */
	private _syncSummaryTotals() {
		if (!this.current) return;
		const { id, records } = this.current;
		let totalInflow = 0;
		let totalOutflow = 0;
		for (const rec of records) {
			if (rec.type === 'inflow') totalInflow += rec.amount;
			else totalOutflow += rec.amount;
		}
		this.list = this.list.map((budget) =>
			budget.id === id ? { ...budget, totalInflow, totalOutflow } : budget
		);
	}

	async create(name: string, startDate: string, endDate: string): Promise<Budget> {
		const detail = asBudget(unwrap(await commands.createBudget(name, startDate, endDate)));
		// Add a summary entry at the front of the list (totals start at 0)
		const summary: BudgetSummary = {
			id: detail.id,
			name: detail.name,
			startDate: detail.startDate,
			endDate: detail.endDate,
			status: detail.status,
			createdAt: detail.createdAt,
			totalInflow: 0,
			totalOutflow: 0,
		};
		this.list = [summary, ...this.list];
		return detail;
	}

	// ── Budget-level mutations ──────────────────────────────────────────────────

	async delete(id: number): Promise<void> {
		unwrap(await commands.deleteBudget(id));
		this.list = this.list.filter((budget) => budget.id !== id);
		if (this.current?.id === id) this.current = null;
	}

	async updateMeta(
		id: number,
		name: string,
		startDate: string,
		endDate: string,
		status: string
	): Promise<Budget> {
		const detail = asBudget(
			unwrap(await commands.updateBudget(id, name, startDate, endDate, status))
		);
		// Update current (keep its records)
		if (this.current?.id === id) {
			this.current = { ...detail, records: this.current.records };
		}
		// Update the matching summary entry (preserve totals)
		this.list = this.list.map((budget) =>
			budget.id === id
				? {
					...budget,
					name: detail.name,
					startDate: detail.startDate,
					endDate: detail.endDate,
					status: detail.status,
				  }
				: budget
		);
		return detail;
	}

	// ── Record mutations ────────────────────────────────────────────────────────

	private _replaceRecord(rec: BudgetRec) {
		if (!this.current) return;
		this.current = {
			...this.current,
			records: this.current.records.map((record) => (record.id === rec.id ? rec : record)),
		};
	}

	async addRecord(budgetId: number, type: 'inflow' | 'outflow'): Promise<BudgetRec> {
		const rec = asRecord(
			unwrap(await commands.createRecord(budgetId, type, '📝', '', 0, null))
		);
		if (this.current?.id === budgetId) {
			this.current = {
				...this.current,
				records: [...this.current.records, rec],
			};
			this._syncSummaryTotals();
		}
		return rec;
	}

	async editRecord(
		id: number,
		emoji: string,
		label: string,
		amount: number,
		notes: string | null
	): Promise<BudgetRec> {
		const rec = asRecord(unwrap(await commands.updateRecord(id, emoji, label, amount, notes)));
		this._replaceRecord(rec);
		this._syncSummaryTotals();
		return rec;
	}

	async removeRecord(id: number): Promise<void> {
		unwrap(await commands.deleteRecord(id));
		if (!this.current) return;
		this.current = {
			...this.current,
			records: this.current.records.filter((record) => record.id !== id),
		};
		this._syncSummaryTotals();
	}

	async setRecordTags(recordId: number, tagIds: number[]): Promise<BudgetRec> {
		const rec = asRecord(unwrap(await commands.setRecordTags(recordId, tagIds)));
		this._replaceRecord(rec);
		// Tag changes don't affect totals, but keep in sync for consistency
		this._syncSummaryTotals();
		return rec;
	}
}

export const budgetsStore = new BudgetsStore();
