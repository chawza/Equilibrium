<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ChevronLeft, Pencil, Check, X, Calendar, Trash2, Plus, Upload, ArrowRight } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { budgetsStore } from '$lib/stores/budgets.svelte';
	import { tagsStore } from '$lib/stores/tags.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import TAccountColumn from '$lib/components/TAccountColumn.svelte';
	import StatusStepper from '$lib/components/StatusStepper.svelte';
	import ConfirmPopover from '$lib/components/ConfirmPopover.svelte';
	import BudgetTagSummary from '$lib/components/BudgetTagSummary.svelte';
	import BudgetNotes from '$lib/components/BudgetNotes.svelte';
	import { formatCurrency, formatDate } from '$lib/utils/format';
	import { dateFormatStore } from '$lib/stores/dateformat.svelte';
	import type { BudgetStatus, RecordType, Tag, Record as BudgetRec } from '$lib/types';
	import { onboardingStore } from '$lib/stores/onboarding.svelte';

	const budgetId = $derived(parseInt($page.params.id ?? '0', 10));

	// ── Lifecycle ──────────────────────────────────────────────────────────────
	onMount(() => {
		budgetsStore.loadOne(budgetId);
		tagsStore.load();
	});

	// ── Derived T-account values ───────────────────────────────────────────────
	let inflowRecords = $derived(budgetsStore.current?.records.filter((record) => record.type === 'inflow') ?? []);
	let outflowRecords = $derived(budgetsStore.current?.records.filter((record) => record.type === 'outflow') ?? []);
	let totalInflow = $derived(inflowRecords.reduce((sum, record) => sum + record.amount, 0));
	let totalOutflow = $derived(outflowRecords.reduce((sum, record) => sum + record.amount, 0));
	let balanceGap = $derived(totalOutflow - totalInflow);
	let balanceEmpty = $derived(totalInflow === 0 && totalOutflow === 0);
	let balanceBalanced = $derived(!balanceEmpty && balanceGap === 0);
	let balanceOver = $derived(balanceGap > 0);
	let balanceUnder = $derived(balanceGap < 0);
	let balanceNeedlePct = $derived.by(() => {
		const denom = totalInflow > 0 ? totalInflow : totalOutflow;
		const ratio = denom > 0 ? Math.max(-1, Math.min(1, balanceGap / denom)) : 0;
		return balanceEmpty ? 50 : 50 + ratio * 50;
	});

	// ── First-budget guide: show once when an empty budget first loads ───────────
	// Uses $effect (not onMount) because records arrive async via the store.
	let guideChecked = $state(false);
	$effect(() => {
		if (guideChecked || budgetsStore.loadingCurrent || !budgetsStore.current) return;
		guideChecked = true;
		onboardingStore.maybeShowBudgetGuide(budgetsStore.current.records.length === 0);
	});

	// ── Record editing state ────────────────────────────────────────────────────
	const DRAFT_ID = -1;
	let editingId = $state<number | null>(null);

	// Local-only draft row — not persisted until the user saves.
	let draftType = $state<RecordType | null>(null);
	let draftTags = $state<Tag[]>([]);
	let draftRecord = $derived<BudgetRec | null>(
		draftType
			? {
					id: DRAFT_ID,
					budgetId,
					type: draftType,
					emoji: '📝',
					label: '',
					amount: 0,
					notes: undefined,
					isAdjustment: false,
					tags: draftTags
				}
			: null
	);

	function handleAdd(type: RecordType) {
		draftType = type;
		draftTags = [];
		editingId = DRAFT_ID;
	}

	function handleStopEdit() {
		draftType = null;
		editingId = null;
	}

	async function handleSave(id: number, payload: { emoji: string; label: string; amount: number; notes: string | null }) {
		try {
			if (id === DRAFT_ID) {
				// Persist the draft for the first time.
				const rec = await budgetsStore.addRecord(
					budgetId,
					draftType!,
					payload.emoji,
					payload.label,
					payload.amount,
					payload.notes
				);
				if (draftTags.length) {
					await budgetsStore.setRecordTags(rec.id, draftTags.map((t) => t.id));
				}
				draftType = null;
				editingId = null;
				return;
			}
			await budgetsStore.editRecord(id, payload.emoji, payload.label, payload.amount, payload.notes);
		} catch (e) {
			toast.error(`Failed to save record: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	async function handleDelete(id: number) {
		try {
			await budgetsStore.removeRecord(id);
			if (editingId === id) editingId = null;
			toast.success('Record deleted');
		} catch (e) {
			toast.error(`Failed to delete record: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	async function handleSetTags(recordId: number, tagIds: number[]) {
		if (recordId === DRAFT_ID) {
			// Buffer tags locally — the draft hasn't been persisted yet.
			draftTags = tagIds
				.map((tid) => tagsStore.list.find((t) => t.id === tid))
				.filter(Boolean) as Tag[];
			return;
		}
		try {
			await budgetsStore.setRecordTags(recordId, tagIds);
		} catch (e) {
			toast.error(`Failed to update tags: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	// ── Budget name inline editing ─────────────────────────────────────────────
	let editingName = $state(false);
	let draftName = $state('');

	function startEditName() {
		draftName = budgetsStore.current?.name ?? '';
		editingName = true;
	}

	function cancelEditName() {
		editingName = false;
	}

	async function saveEditName() {
		const budget = budgetsStore.current;
		if (!budget || !draftName.trim()) { editingName = false; return; }
		try {
			await budgetsStore.updateMeta(budget.id, draftName.trim(), budget.startDate, budget.endDate, budget.status);
		} catch (e) {
			toast.error(`Failed to rename budget: ${e instanceof Error ? e.message : String(e)}`);
		}
		editingName = false;
	}

	function handleNameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') { e.preventDefault(); saveEditName(); }
		if (e.key === 'Escape') cancelEditName();
	}

	// ── Budget date inline editing ─────────────────────────────────────────────
	let editingDates = $state(false);
	let draftStart = $state('');
	let draftEnd = $state('');

	function startEditDates() {
		const budget = budgetsStore.current;
		if (!budget) return;
		draftStart = budget.startDate;
		draftEnd = budget.endDate;
		editingDates = true;
	}

	function cancelEditDates() {
		editingDates = false;
	}

	async function saveEditDates() {
		const budget = budgetsStore.current;
		if (!budget || !draftStart || !draftEnd) { editingDates = false; return; }
		try {
			await budgetsStore.updateMeta(budget.id, budget.name, draftStart, draftEnd, budget.status);
		} catch (e) {
			toast.error(`Failed to update dates: ${e instanceof Error ? e.message : String(e)}`);
		}
		editingDates = false;
	}

	// ── Status change ─────────────────────────────────────────────────────────
	async function handleStatusChange(newStatus: BudgetStatus) {
		const budget = budgetsStore.current;
		if (!budget) return;
		try {
			await budgetsStore.updateMeta(budget.id, budget.name, budget.startDate, budget.endDate, newStatus);
			toast.success(`Status changed to ${newStatus}`);
		} catch (e) {
			toast.error(`Failed to change status: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	// ── Budget delete ─────────────────────────────────────────────────────────
	async function handleDeleteBudget() {
		const budget = budgetsStore.current;
		if (!budget) return;
		try {
			await budgetsStore.delete(budget.id);
			toast.success('Budget deleted');
			await goto('/');
		} catch (e) {
			toast.error(`Failed to delete budget: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	// ── Balance summary colors ─────────────────────────────────────────────────
	const BAL_GREEN = 'hsl(var(--inflow))';
	const BAL_AMBER = '#E0A02E';
	const BAL_OVER = '#D98A52';
	let balanceAccent = $derived(
		balanceEmpty ? 'hsl(var(--muted-foreground))' :
		balanceBalanced ? BAL_GREEN :
		balanceOver ? BAL_OVER :
		BAL_AMBER
	);

	// ── Keyboard: Escape → back (only when nothing is in edit mode) ────────────
	function handleBudgetFormKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			// Skip if another handler (e.g. the global shortcut modal) already claimed this event.
			if (e.defaultPrevented) return;
			// Defer to active editors — their input-level handlers fire first.
			if (editingId !== null || editingName || editingDates) return;
			const target = e.target as HTMLElement;
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
			goto('/');
		}
	}
</script>

<svelte:window onkeydown={handleBudgetFormKeydown} />

<div class="page-enter" style="max-width: 800px; margin: 0 auto;">

	{#if budgetsStore.loadingCurrent}
		<div class="text-caption" style="text-align: center; padding: 40px 0;">Loading…</div>

	{:else if budgetsStore.currentError}
		<div class="text-caption" style="color: hsl(var(--destructive)); padding: 40px 0; text-align: center;">
			{budgetsStore.currentError}
		</div>

	{:else if !budgetsStore.current}
		<div class="text-caption" style="text-align: center; padding: 40px 0;">Budget not found.</div>

	{:else}
		{@const budget = budgetsStore.current}

		<!-- ── Header ────────────────────────────────────────────────────────── -->
		<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
			<!-- Back button -->
			<button
				onclick={() => goto('/')}
				aria-label="Back to budgets"
				style="
					display: flex; align-items: center; justify-content: center;
					width: 32px; height: 32px; border-radius: 8px;
					border: none; background: transparent; cursor: pointer;
					color: hsl(var(--muted-foreground)); flex-shrink: 0;
					transition: background 0.12s;
				"
				onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))'; }}
				onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
			>
				<ChevronLeft size={18} />
			</button>

			<!-- Budget name (inline-editable) -->
			{#if editingName}
				<input
					type="text"
					autofocus
					bind:value={draftName}
					onkeydown={handleNameKeydown}
					style="
						flex: 1; min-width: 0; height: 36px; padding: 0 8px;
						font-size: 24px; font-weight: 600; letter-spacing: -0.025em;
						border: 1px solid hsl(var(--ring)); border-radius: var(--radius);
						background: hsl(var(--background)); color: hsl(var(--foreground));
						outline: none;
					"
				/>
				<button
					onclick={cancelEditName}
					style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:6px;border:none;background:transparent;cursor:pointer;color:hsl(var(--muted-foreground));"
					onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background='hsl(var(--secondary))';}}
					onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background='transparent';}}
				><X size={14} /></button>
				<button
					onclick={saveEditName}
					style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:6px;border:none;background:hsl(var(--secondary));cursor:pointer;color:hsl(var(--secondary-foreground));"
				><Check size={14} /></button>
			{:else}
				<h1
					class="text-page-title"
					style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: text;"
					onclick={startEditName}
					title="Click to rename"
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && startEditName()}
				>
					{budget.name}
				</h1>
				<button
					onclick={startEditName}
					aria-label="Rename budget"
					style="
						width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
						border-radius: 6px; border: none; background: transparent; cursor: pointer;
						color: hsl(var(--muted-foreground)); flex-shrink: 0;
					"
					onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--secondary))'; }}
					onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
				>
					<Pencil size={14} />
				</button>
			{/if}

			<!-- Status stepper -->
			<StatusStepper status={budget.status as BudgetStatus} onchange={handleStatusChange} />

			<!-- Delete budget -->
			<ConfirmPopover message="Delete this budget and all its records?" onconfirm={handleDeleteBudget}>
				<button
					aria-label="Delete budget"
					style="
						width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
						border-radius: 6px; border: none; background: transparent;
						color: hsl(var(--muted-foreground)); cursor: pointer; flex-shrink: 0;
					"
					onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.color = 'hsl(var(--destructive))'; (e.currentTarget as HTMLElement).style.background = 'hsl(var(--destructive) / 0.08)'; }}
					onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.color = 'hsl(var(--muted-foreground))'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
				>
					<Trash2 size={14} />
				</button>
			</ConfirmPopover>
		</div>

		<!-- ── Date range caption ─────────────────────────────────────────────── -->
		<div style="padding-left: 44px; margin-bottom: 28px;">
			{#if editingDates}
				<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
					<input
						type="date"
						bind:value={draftStart}
						style="
							height: 28px; padding: 0 8px; font-size: 12px;
							border: 1px solid hsl(var(--ring)); border-radius: 6px;
							background: hsl(var(--background)); color: hsl(var(--foreground));
							outline: none;
						"
					/>
					<span class="text-caption">–</span>
					<input
						type="date"
						bind:value={draftEnd}
						style="
							height: 28px; padding: 0 8px; font-size: 12px;
							border: 1px solid hsl(var(--ring)); border-radius: 6px;
							background: hsl(var(--background)); color: hsl(var(--foreground));
							outline: none;
						"
					/>
					<button
						onclick={cancelEditDates}
						style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:5px;border:none;background:transparent;cursor:pointer;color:hsl(var(--muted-foreground));"
					><X size={12} /></button>
					<button
						onclick={saveEditDates}
						style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:5px;border:none;background:hsl(var(--secondary));cursor:pointer;"
					><Check size={12} /></button>
				</div>
			{:else}
				<button
					onclick={startEditDates}
					aria-label="Edit dates"
					class="text-caption"
					style="
						background: none; border: none; cursor: pointer; padding: 0;
						display: inline-flex; align-items: center; gap: 5px;
						color: hsl(var(--muted-foreground));
					"
					title="Click to edit dates"
					onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.color = 'hsl(var(--foreground))'; }}
					onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.color = 'hsl(var(--muted-foreground))'; }}
				>
					{formatDate(budget.startDate, dateFormatStore.value)} – {formatDate(budget.endDate, dateFormatStore.value)}
					<Calendar size={11} />
				</button>
			{/if}
		</div>

		<!-- ── Notes ────────────────────────────────────────────────────────────── -->
		<div style="padding-left: 44px; margin-bottom: 28px;">
			<BudgetNotes
				value={budget.notes ?? ''}
				onChange={(notes) => budgetsStore.saveNotes(notes)}
			/>
		</div>

		<!-- ── T-account columns ──────────────────────────────────────────────── -->
		<div style="display: flex; align-items: stretch;">
			<!-- Inflow column -->
			<div style="flex: 1; min-width: 0; padding-right: 14px;">
				<TAccountColumn
					type="inflow"
					records={inflowRecords}
					total={totalInflow}
					{editingId}
					draftRecord={draftType === 'inflow' ? draftRecord : null}
					onstartedit={(id) => (editingId = id)}
					onstopedit={handleStopEdit}
					onsave={handleSave}
					ondelete={handleDelete}
					onsettags={handleSetTags}
					onadd={() => handleAdd('inflow')}
				/>
			</div>

			<!-- Center divider (T-account stem) -->
			<div style="width: 1px; align-self: stretch; background: hsl(var(--border)); flex-shrink: 0;"></div>

			<!-- Outflow column -->
			<div style="flex: 1; min-width: 0; padding-left: 14px;">
				<TAccountColumn
					type="outflow"
					records={outflowRecords}
					total={totalOutflow}
					{editingId}
					draftRecord={draftType === 'outflow' ? draftRecord : null}
					onstartedit={(id) => (editingId = id)}
					onstopedit={handleStopEdit}
					onsave={handleSave}
					ondelete={handleDelete}
					onsettags={handleSetTags}
					onadd={() => handleAdd('outflow')}
				/>
			</div>
		</div>

		<!-- ── Balance summary ────────────────────────────────────────────────── -->
		<div
			data-e2e="budget-balance-summary"
			style="
				margin-top: 16px; padding: 18px 22px;
				background: hsl(var(--card));
				border: 1px solid {balanceBalanced ? 'hsl(var(--inflow) / 0.45)' : balanceOver ? 'rgba(217,138,82,0.35)' : 'hsl(var(--border))'};
				border-radius: var(--radius); transition: border-color 0.25s;
			"
		>
			<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
				<div
					style="
						width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
						display: flex; align-items: center; justify-content: center;
						background: {balanceEmpty ? 'hsl(var(--secondary))' : balanceBalanced ? 'hsl(var(--inflow) / 0.14)' : balanceOver ? 'rgba(217,138,82,0.15)' : 'rgba(224,160,46,0.15)'};
						color: {balanceAccent};
					"
				>
					{#if balanceEmpty}
						<Plus size={15} color={balanceAccent} />
					{:else if balanceBalanced}
						<Check size={15} color={balanceAccent} />
					{:else if balanceOver}
						<Upload size={15} color={balanceAccent} />
					{:else}
						<ArrowRight size={15} color={balanceAccent} />
					{/if}
				</div>

				<div style="flex: 1; min-width: 0;">
					<div
						data-e2e="budget-balance-state"
						style="
							font-size: 14px; font-weight: 600; line-height: 1.2;
							color: {balanceEmpty ? 'hsl(var(--muted-foreground))' : balanceAccent};
						"
					>
						{#if balanceEmpty}
							No records yet
						{:else if balanceBalanced}
							Balanced
						{:else if balanceOver}
							Over budget
						{:else}
							Needs allocating
						{/if}
					</div>
					<div
						data-e2e="budget-balance-hint"
						style="
							font-size: 12px; color: hsl(var(--muted-foreground));
							line-height: 1.3; margin-top: 2px;
						"
					>
						{#if balanceEmpty}
							Add income and spending to see if your budget balances.
						{:else if balanceBalanced}
							Every rupiah of income is allocated.
						{:else if balanceOver}
							Spending is {formatCurrency(balanceGap)} above income. Trim an outflow to rebalance.
						{:else}
							{formatCurrency(Math.abs(balanceGap))} of income is unspent. Add or grow an outflow to balance.
						{/if}
					</div>
				</div>

				<div style="text-align: right; flex-shrink: 0;">
					<div
						data-e2e="budget-balance-gap"
						style="
							font-size: 19px; font-weight: 600; font-variant-numeric: tabular-nums;
							letter-spacing: -0.02em; color: {balanceEmpty ? 'hsl(var(--muted-foreground))' : balanceAccent}; line-height: 1;
						"
					>
						{#if balanceEmpty}
							-
						{:else if balanceBalanced}
							{formatCurrency(0)}
						{:else}
							{balanceOver ? '- ' : '+ '}{formatCurrency(Math.abs(balanceGap))}
						{/if}
					</div>
					<div
						data-e2e="budget-balance-gap-label"
						style="
							font-size: 10.5px; font-weight: 500; text-transform: uppercase;
							letter-spacing: 0.06em; color: hsl(var(--muted-foreground)); margin-top: 5px;
						"
					>
						{balanceOver ? 'over' : balanceUnder ? 'unspent' : 'difference'}
					</div>
				</div>
			</div>

				<div data-e2e="budget-balance-track" style="position: relative; height: 12px;">
				<div style="position: absolute; inset: 0; border-radius: 9999px; overflow: hidden; display: flex;">
					<div
						data-e2e="budget-balance-needle"
						style="
							width: 44%;
							background: {balanceUnder && !balanceEmpty ? 'rgba(224,160,46,0.30)' : 'hsl(var(--secondary))'};
							transition: background 0.25s;
						"
					></div>
					<div
						style="
							width: 12%;
							background: {balanceBalanced ? 'hsl(var(--inflow) / 0.55)' : 'hsl(var(--inflow) / 0.20)'};
							transition: background 0.25s;
						"
					></div>
					<div
						style="
							width: 44%;
							background: {balanceOver ? 'rgba(217,138,82,0.28)' : 'hsl(var(--secondary))'};
							transition: background 0.25s;
						"
					></div>
				</div>
				<div
					style="
						position: absolute; top: -3px; bottom: -3px; left: 50%;
						width: 1px; background: hsl(var(--border)); transform: translateX(-0.5px);
					"
				></div>
				<div
					style="
						position: absolute; top: -3px; bottom: -3px; left: {balanceNeedlePct}%;
						transform: translateX(-50%); width: 5px; border-radius: 9999px;
						background: {balanceAccent};
						box-shadow: {balanceBalanced ? '0 0 0 4px hsl(var(--inflow) / 0.20)' : '0 0 0 3px hsl(var(--background))'};
						transition: left 0.35s cubic-bezier(0.22,1,0.36,1), background 0.25s, box-shadow 0.25s;
					"
				></div>
			</div>

			<div style="display: flex; justify-content: space-between; margin-top: 8px;">
				<span
					style="
						font-size: 11px; font-weight: {balanceUnder ? 600 : 500};
						color: {balanceUnder ? BAL_AMBER : 'hsl(var(--muted-foreground))'};
						transition: color 0.2s;
					"
				>
					Spend more
				</span>
				<span
					style="
						font-size: 11px; font-weight: {balanceBalanced ? 600 : 500};
						color: {balanceBalanced ? BAL_GREEN : 'hsl(var(--muted-foreground))'};
						transition: color 0.2s;
					"
				>
					Balanced
				</span>
				<span
					style="
						font-size: 11px; font-weight: {balanceOver ? 600 : 500};
						color: {balanceOver ? BAL_OVER : 'hsl(var(--muted-foreground))'};
						transition: color 0.2s;
					"
				>
					Over budget
				</span>
			</div>
		</div>

		<BudgetTagSummary records={budget.records} />
	{/if}
</div>
