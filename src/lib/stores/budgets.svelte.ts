import { commands, type BudgetEntry, type BudgetRecord } from '$lib/bindings';
import type { Budget, Record as BudgetRec, Tag } from '$lib/types';

// Re-export the native type for consumers who need it
export type { Budget };

function unwrap<T>(result: { status: 'ok'; data: T } | { status: 'error'; error: string }): T {
	if (result.status === 'ok') return result.data;
	throw new Error(result.error);
}

// Cast BudgetEntry (status: string) → Budget (status: BudgetStatus) for better typing.
function asBudget(entry: BudgetEntry): Budget {
	return entry as unknown as Budget;
}

// Cast a BudgetRecord (from bindings, type: string, tags: BudgetTag[]) → BudgetRec
function asRecord(r: BudgetRecord): BudgetRec {
	return {
		id: r.id,
		budgetId: r.budgetId,
		type: r.type as BudgetRec['type'],
		emoji: r.emoji,
		label: r.label,
		amount: r.amount,
		notes: r.notes ?? undefined,
		tags: r.tags as Tag[],
	};
}

class BudgetsStore {
	list = $state<Budget[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	// Single budget loaded for the form view
	current = $state<Budget | null>(null);
	loadingCurrent = $state(false);
	currentError = $state<string | null>(null);

	async load() {
		this.loading = true;
		this.error = null;
		try {
			this.list = unwrap(await commands.listBudgets()).map(asBudget);
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

	async create(name: string, startDate: string, endDate: string): Promise<Budget> {
		const b = asBudget(unwrap(await commands.createBudget(name, startDate, endDate)));
		this.list = [b, ...this.list];
		return b;
	}

	// ── Budget-level mutations ──────────────────────────────────────────────────

	async delete(id: number): Promise<void> {
		unwrap(await commands.deleteBudget(id));
		this.list = this.list.filter((b) => b.id !== id);
		if (this.current?.id === id) this.current = null;
	}

	async updateMeta(
		id: number,
		name: string,
		startDate: string,
		endDate: string,
		status: string
	): Promise<Budget> {
		const updated = asBudget(
			unwrap(await commands.updateBudget(id, name, startDate, endDate, status))
		);
		if (this.current?.id === id) {
			this.current = { ...updated, records: this.current.records };
		}
		this.list = this.list.map((b) => (b.id === id ? { ...updated, records: b.records } : b));
		return updated;
	}

	// ── Record mutations ────────────────────────────────────────────────────────

	private _replaceRecord(rec: BudgetRec) {
		if (!this.current) return;
		this.current = {
			...this.current,
			records: this.current.records.map((r) => (r.id === rec.id ? rec : r)),
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
		return rec;
	}

	async removeRecord(id: number): Promise<void> {
		unwrap(await commands.deleteRecord(id));
		if (!this.current) return;
		this.current = {
			...this.current,
			records: this.current.records.filter((r) => r.id !== id),
		};
	}

	async setRecordTags(recordId: number, tagIds: number[]): Promise<BudgetRec> {
		const rec = asRecord(unwrap(await commands.setRecordTags(recordId, tagIds)));
		this._replaceRecord(rec);
		return rec;
	}
}

export const budgetsStore = new BudgetsStore();
