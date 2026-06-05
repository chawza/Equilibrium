<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ChevronLeft, Pencil, Check, X, Calendar, Trash2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { budgetsStore } from '$lib/stores/budgets.svelte';
	import { tagsStore } from '$lib/stores/tags.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import TAccountColumn from '$lib/components/TAccountColumn.svelte';
	import StatusStepper from '$lib/components/StatusStepper.svelte';
	import ConfirmPopover from '$lib/components/ConfirmPopover.svelte';
	import { formatCurrency, toInputDate, fromInputDate } from '$lib/utils/format';
	import type { BudgetStatus, RecordType } from '$lib/types';

	const budgetId = $derived(parseInt($page.params.id ?? '0', 10));

	// ── Lifecycle ──────────────────────────────────────────────────────────────
	onMount(() => {
		budgetsStore.loadOne(budgetId);
		tagsStore.load();
	});

	// ── Derived T-account values ───────────────────────────────────────────────
	let inflowRecords = $derived(budgetsStore.current?.records.filter((r) => r.type === 'inflow') ?? []);
	let outflowRecords = $derived(budgetsStore.current?.records.filter((r) => r.type === 'outflow') ?? []);
	let totalInflow = $derived(inflowRecords.reduce((s, r) => s + r.amount, 0));
	let totalOutflow = $derived(outflowRecords.reduce((s, r) => s + r.amount, 0));
	let balance = $derived(totalInflow - totalOutflow);
	let allocatedPct = $derived(totalInflow > 0 ? (totalOutflow / totalInflow) * 100 : 0);
	let overBudget = $derived(totalOutflow > totalInflow);

	// ── Record editing state ────────────────────────────────────────────────────
	let editingId = $state<number | null>(null);

	async function handleAdd(type: RecordType) {
		try {
			const rec = await budgetsStore.addRecord(budgetId, type);
			editingId = rec.id;
		} catch (e) {
			toast.error(`Failed to add record: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	async function handleSave(id: number, payload: { emoji: string; label: string; amount: number; notes: string | null }) {
		try {
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
		const b = budgetsStore.current;
		if (!b || !draftName.trim()) { editingName = false; return; }
		try {
			await budgetsStore.updateMeta(b.id, draftName.trim(), b.startDate, b.endDate, b.status);
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
		const b = budgetsStore.current;
		if (!b) return;
		draftStart = toInputDate(b.startDate);
		draftEnd = toInputDate(b.endDate);
		editingDates = true;
	}

	function cancelEditDates() {
		editingDates = false;
	}

	async function saveEditDates() {
		const b = budgetsStore.current;
		if (!b || !draftStart || !draftEnd) { editingDates = false; return; }
		const startDisplay = fromInputDate(draftStart);
		const endDisplay = fromInputDate(draftEnd);
		try {
			await budgetsStore.updateMeta(b.id, b.name, startDisplay, endDisplay, b.status);
		} catch (e) {
			toast.error(`Failed to update dates: ${e instanceof Error ? e.message : String(e)}`);
		}
		editingDates = false;
	}

	// ── Status change ─────────────────────────────────────────────────────────
	async function handleStatusChange(newStatus: BudgetStatus) {
		const b = budgetsStore.current;
		if (!b) return;
		try {
			await budgetsStore.updateMeta(b.id, b.name, b.startDate, b.endDate, newStatus);
			toast.success(`Status changed to ${newStatus}`);
		} catch (e) {
			toast.error(`Failed to change status: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	// ── Budget delete ─────────────────────────────────────────────────────────
	async function handleDeleteBudget() {
		const b = budgetsStore.current;
		if (!b) return;
		try {
			await budgetsStore.delete(b.id);
			toast.success('Budget deleted');
			await goto('/');
		} catch (e) {
			toast.error(`Failed to delete budget: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	// ── Balance bar colors ─────────────────────────────────────────────────────
	let balanceColor = $derived(
		overBudget ? 'hsl(var(--destructive))' :
		balance === 0 ? 'hsl(var(--muted-foreground))' :
		'hsl(var(--inflow))'
	);
</script>

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
		{@const b = budgetsStore.current}

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
					{b.name}
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
			<StatusStepper status={b.status as BudgetStatus} onchange={handleStatusChange} />

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
					{b.startDate} – {b.endDate}
					<Calendar size={11} />
				</button>
			{/if}
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
					onstartedit={(id) => (editingId = id)}
					onstopedit={() => (editingId = null)}
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
					onstartedit={(id) => (editingId = id)}
					onstopedit={() => (editingId = null)}
					onsave={handleSave}
					ondelete={handleDelete}
					onsettags={handleSetTags}
					onadd={() => handleAdd('outflow')}
				/>
			</div>
		</div>

		<!-- ── Balance bar ────────────────────────────────────────────────────── -->
		<div
			style="
				margin-top: 16px; padding: 16px 20px;
				background: hsl(var(--card)); border: 1px solid hsl(var(--border));
				border-radius: var(--radius);
			"
		>
			<!-- Top row: label + balance amount -->
			<div
				style="
					display: flex; align-items: baseline; justify-content: space-between;
					margin-bottom: 10px;
				"
			>
				<span style="font-size: 13px; font-weight: 500; color: hsl(var(--muted-foreground));">
					Balance
				</span>
				<span
					style="
						font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums;
						letter-spacing: -0.02em; color: {balanceColor};
					"
				>
					{balance >= 0 ? '+ ' : '- '}{formatCurrency(Math.abs(balance))}
				</span>
			</div>

			<!-- Progress bar -->
			<div
				style="
					height: 6px; border-radius: 3px; background: hsl(var(--secondary));
					overflow: hidden; position: relative;
				"
			>
				{#if overBudget}
					<!-- Over-budget: full red fill + glow -->
					<div
						style="
							position: absolute; inset: 0; border-radius: 3px;
							background: hsl(var(--destructive));
							box-shadow: 0 0 8px hsl(var(--destructive) / 0.4);
						"
					></div>
				{:else}
					<div
						style="
							height: 100%; border-radius: 3px;
							width: {totalInflow > 0 ? Math.min(allocatedPct, 100) : 0}%;
							background: hsl(var(--inflow));
							transition: width 0.4s ease;
						"
					></div>
				{/if}
			</div>

			<!-- Footer captions -->
			<div style="display: flex; justify-content: space-between; margin-top: 6px;">
				<span class="text-caption">
					{totalInflow > 0 ? Math.round(allocatedPct) : 0}% allocated
				</span>
				<span class="text-caption">
					{#if overBudget}
						{Math.round(allocatedPct - 100)}% over budget
					{:else}
						{totalInflow > 0 ? Math.round(100 - allocatedPct) : 100}% remaining
					{/if}
				</span>
			</div>
		</div>
	{/if}
</div>
