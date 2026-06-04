/**
 * Budgets store — stub.
 * Will be implemented in the Dashboard milestone (build-order step 6).
 */
import type { Budget } from '$lib/types';

class BudgetsStore {
	list = $state<Budget[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	// Populated in the Dashboard milestone via IPC commands
}

export const budgetsStore = new BudgetsStore();
