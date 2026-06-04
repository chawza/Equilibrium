import { commands, type BudgetEntry } from '$lib/bindings';
import type { Budget } from '$lib/types';

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

class BudgetsStore {
	list = $state<Budget[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

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

	async create(name: string, startDate: string, endDate: string): Promise<Budget> {
		const b = asBudget(unwrap(await commands.createBudget(name, startDate, endDate)));
		this.list = [b, ...this.list];
		return b;
	}
}

export const budgetsStore = new BudgetsStore();
