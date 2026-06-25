<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Plus, AlertTriangle } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { budgetsStore } from '$lib/stores/budgets.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { formatCurrency, formatDate, needsReview, daysOverdue } from '$lib/utils/format';
	import { dateFormatStore } from '$lib/stores/dateformat.svelte';
	import { STATUS_BADGE, NEEDS_REVIEW_BADGE } from '$lib/constants/status-badge';
	import type { BudgetSummary, BudgetStatus } from '$lib/types';
	import BudgetContextMenu from '$lib/components/BudgetContextMenu.svelte';
	import DuplicateBudgetModal from '$lib/components/DuplicateBudgetModal.svelte';
	import DeleteBudgetModal from '$lib/components/DeleteBudgetModal.svelte';

	// Sort: active(needs review) → active → plan → closed, review/unknown last, then id DESC.
	function rank(b: BudgetSummary): number {
		if (b.status === 'active') return needsReview(b) ? 0 : 1;
		if (b.status === 'plan') return 2;
		if (b.status === 'closed') return 3;
		return 4; // 'review' / unknown last
	}

	// Date-range filter state.
	let filterStart = $state('');
	let filterEnd = $state('');
	const filterActive = $derived(filterStart !== '' || filterEnd !== '');

	// Overlap: keep a budget if its date range overlaps the filter window.
	// ISO YYYY-MM-DD strings are lexically sortable — no Date parsing needed.
	const filtered = $derived(
		budgetsStore.list.filter(
			(b) =>
				(!filterStart || b.endDate >= filterStart) &&
				(!filterEnd || b.startDate <= filterEnd)
		)
	);

	const sorted = $derived(
		[...filtered].sort((a, b) => rank(a) - rank(b) || b.id - a.id)
	);

	onMount(() => {
		budgetsStore.load();
	});

	function handleDashboardKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
			e.preventDefault();
			handleNewBudget();
		}
	}

	async function handleNewBudget() {
		const now = new Date();
		const monthNames = [
			'January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December'
		];
		const year = now.getFullYear();
		const month = now.getMonth();
		const mm = String(month + 1).padStart(2, '0');
		const name = `${monthNames[month]} ${year}`;
		const lastDay = new Date(year, month + 1, 0).getDate();
		const dd = String(lastDay).padStart(2, '0');
		const startDate = `${year}-${mm}-01`;
		const endDate = `${year}-${mm}-${dd}`;
		try {
			const created = await budgetsStore.create(name, startDate, endDate);
			toast.success('Budget created');
			await goto(`/budget/${created.id}`);
		} catch (e) {
			toast.error(`Failed to create budget: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	// ── Context menu ────────────────────────────────────────────────────────────
	let menu = $state<{ budget: BudgetSummary; x: number; y: number } | null>(null);
	let dupTarget = $state<BudgetSummary | null>(null);
	let deleteTarget = $state<BudgetSummary | null>(null);

	function openMenu(budget: BudgetSummary, e: MouseEvent) {
		e.preventDefault();
		menu = { budget, x: e.clientX, y: e.clientY };
	}

	async function handleDuplicate(name: string, startDate: string, endDate: string) {
		if (!dupTarget) return;
		const sourceId = dupTarget.id;
		dupTarget = null;
		try {
			const created = await budgetsStore.duplicate(sourceId, name, startDate, endDate);
			toast.success('Budget duplicated');
			await goto(`/budget/${created.id}`);
		} catch (e) {
			toast.error(`Failed to duplicate budget: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	async function handleDeleteConfirm() {
		if (!deleteTarget) return;
		const id = deleteTarget.id;
		deleteTarget = null;
		try {
			await budgetsStore.delete(id);
			toast.success('Budget deleted');
		} catch (e) {
			toast.error(`Failed to delete budget: ${e instanceof Error ? e.message : String(e)}`);
		}
	}
</script>

<svelte:window onkeydown={handleDashboardKeydown} />

<div class="page-enter" style="max-width: 720px; margin: 0 auto;">
	<!-- Header -->
	<div
		style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px;"
	>
		<h1 class="text-page-title">Budgets</h1>
		<button
			onclick={handleNewBudget}
			style="
				display: inline-flex; align-items: center; gap: 6px;
				font-size: 13px; font-weight: 500;
				padding: 5px 12px; border-radius: 6px; border: none;
				background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
				cursor: pointer; line-height: 1;
			"
		>
			<Plus size={14} />
			New budget
		</button>
	</div>

	<!-- Date-range filter bar -->
	<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 22px; flex-wrap: wrap;">
		<span class="text-caption" style="margin-right: 2px;">Dates</span>
		<input
			type="date"
			bind:value={filterStart}
			max={filterEnd || undefined}
			aria-label="Filter from date"
			style="
				height: 30px; padding: 0 8px; border-radius: 6px;
				border: 1px solid hsl(var(--border));
				background: hsl(var(--background)); color: hsl(var(--foreground));
				font-size: 13px; font-family: inherit; outline: none;
				color-scheme: light dark;
			"
		/>
		<span class="text-caption">→</span>
		<input
			type="date"
			bind:value={filterEnd}
			min={filterStart || undefined}
			aria-label="Filter to date"
			style="
				height: 30px; padding: 0 8px; border-radius: 6px;
				border: 1px solid hsl(var(--border));
				background: hsl(var(--background)); color: hsl(var(--foreground));
				font-size: 13px; font-family: inherit; outline: none;
				color-scheme: light dark;
			"
		/>
		{#if filterActive}
			<button
				type="button"
				onclick={() => { filterStart = ''; filterEnd = ''; }}
				style="
					background: transparent; border: none; cursor: pointer; padding: 0 6px;
					font-family: inherit; font-size: 13px; font-weight: 500;
					color: hsl(var(--muted-foreground));
				"
			>
				Clear
			</button>
		{/if}
	</div>

	<!-- Loading -->
	{#if budgetsStore.loading}
		<div class="text-caption" style="text-align: center; padding: 40px 0;">Loading…</div>

	<!-- Error -->
	{:else if budgetsStore.error}
		<div
			style="
				border: 1px solid hsl(var(--border));
				border-radius: var(--radius);
				background: hsl(var(--card));
				padding: 28px 18px;
				text-align: center;
			"
		>
			<p class="text-caption" style="color: hsl(var(--destructive));">
				{budgetsStore.error}
			</p>
		</div>

	<!-- Empty: no budgets at all -->
	{:else if budgetsStore.list.length === 0}
		<div
			style="
				border: 1px solid hsl(var(--border));
				border-radius: var(--radius);
				background: hsl(var(--card));
				padding: 40px 18px;
				text-align: center;
			"
		>
			<p class="text-caption">No budgets yet. Create your first budget to get started.</p>
		</div>

	<!-- Empty: filter has no results -->
	{:else if sorted.length === 0}
		<div
			style="
				border: 1px solid hsl(var(--border));
				border-radius: var(--radius);
				background: hsl(var(--card));
				padding: 40px 18px;
				text-align: center;
			"
		>
			<p class="text-caption">No budgets overlap this date range.</p>
			<button
				type="button"
				onclick={() => { filterStart = ''; filterEnd = ''; }}
				style="
					margin-top: 10px; background: transparent; border: none; cursor: pointer;
					font-family: inherit; font-size: 13px; font-weight: 500;
					color: hsl(var(--muted-foreground));
				"
			>
				Clear filter
			</button>
		</div>

	<!-- Budget card list -->
	{:else}
		<div style="display: flex; flex-direction: column; gap: 10px;">
			{#each sorted as b}
				{@const inflow = b.totalInflow}
				{@const outflow = b.totalOutflow}
				{@const net = inflow - outflow}
				{@const review = needsReview(b)}
				{@const isClosed = b.status === 'closed'}
				{@const overdue = daysOverdue(b)}
				{@const mode = themeStore.value === 'dark' ? 'dark' : 'light'}
				{@const statusColors = STATUS_BADGE[b.status as BudgetStatus][mode]}
				{@const reviewColors = NEEDS_REVIEW_BADGE[mode]}

				<!-- Card — left-click opens, right-click shows context menu -->
				<div
					role="button"
					tabindex="0"
					onclick={() => goto(`/budget/${b.id}`)}
					onkeydown={(e) => e.key === 'Enter' && goto(`/budget/${b.id}`)}
					oncontextmenu={(e) => openMenu(b, e)}
					style="
						background: hsl(var(--card));
						border: 1px solid hsl(var(--border));
						border-radius: var(--radius);
						padding: 14px 18px;
						cursor: pointer;
						opacity: {isClosed ? 0.55 : 1};
						transition: border-color 0.15s, box-shadow 0.15s, opacity 0.15s;
					"
					onmouseenter={(e) => {
						const el = e.currentTarget as HTMLElement;
						el.style.borderColor = 'hsl(var(--muted-foreground) / 0.3)';
						el.style.boxShadow = '0 1px 3px hsl(var(--foreground) / 0.04)';
					}}
					onmouseleave={(e) => {
						const el = e.currentTarget as HTMLElement;
						el.style.borderColor = 'hsl(var(--border))';
						el.style.boxShadow = 'none';
					}}
				>
					<!-- Row 1: name + badges -->
					<div
						style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;"
					>
						<span
							style="font-size: 15px; font-weight: 600; letter-spacing: -0.01em; color: hsl(var(--foreground));"
						>
							{b.name}
						</span>
						<div style="display: flex; align-items: center; gap: 8px;">
							{#if review}
								<!-- Needs-review amber badge -->
								<span
									style="
										display: inline-flex; align-items: center; gap: 4px;
										padding: 2px 8px 2px 6px; border-radius: 9999px;
										font-size: 12px; font-weight: 600; line-height: 18px;
										white-space: nowrap;
										background: {reviewColors.bg}; color: {reviewColors.fg};
									"
								>
									<AlertTriangle size={13} />
									Needs review
								</span>
							{/if}
							<!-- Status badge -->
							<span
								style="
									display: inline-flex; align-items: center;
									padding: 2px 8px; border-radius: 9999px;
									font-size: 12px; font-weight: 500; line-height: 18px;
									white-space: nowrap;
									background: {statusColors.bg}; color: {statusColors.fg};
								"
							>
								{b.status}
							</span>
						</div>
					</div>

					<!-- Row 2: date range + overdue hint -->
					<div class="text-caption" style="display: flex; gap: 6px; margin-bottom: 14px;">
						<span>{formatDate(b.startDate, dateFormatStore.value)} – {formatDate(b.endDate, dateFormatStore.value)}</span>
						{#if review}
							<span style="color: {reviewColors.fg}; font-weight: 500;">
								·&nbsp;{overdue === 0
									? 'ended today'
									: `ended ${overdue} day${overdue !== 1 ? 's' : ''} ago`}
							</span>
						{/if}
					</div>

					<!-- Row 3: inflow / outflow / net -->
					<div style="display: flex; align-items: baseline; gap: 24px;">
						<!-- Inflow -->
						<div style="display: flex; align-items: baseline; gap: 4px;">
							<span style="font-size: 11px; color: hsl(var(--inflow));">↑</span>
							<span class="text-amount" style="color: hsl(var(--inflow));">
								{formatCurrency(inflow)}
							</span>
						</div>
						<!-- Outflow -->
						<div style="display: flex; align-items: baseline; gap: 4px;">
							<span style="font-size: 11px; color: hsl(var(--outflow));">↓</span>
							<span class="text-amount" style="color: hsl(var(--outflow));">
								{formatCurrency(outflow)}
							</span>
						</div>
						<!-- Net (right-aligned) -->
						<div style="margin-left: auto;">
							<span
								class="text-amount"
								style="color: {net >= 0
									? 'hsl(var(--inflow))'
									: 'hsl(var(--destructive))'};"
							>
								{net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(net))}
							</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Context menu (right-click on a card) -->
{#if menu}
	<BudgetContextMenu
		x={menu.x}
		y={menu.y}
		onclose={() => (menu = null)}
		onduplicate={() => { dupTarget = menu!.budget; menu = null; }}
		ondelete={() => { deleteTarget = menu!.budget; menu = null; }}
	/>
{/if}

<!-- Duplicate modal -->
{#if dupTarget}
	<DuplicateBudgetModal
		source={dupTarget}
		oncancel={() => (dupTarget = null)}
		onconfirm={(name, start, end) => handleDuplicate(name, start, end)}
	/>
{/if}

<!-- Delete confirmation modal -->
{#if deleteTarget}
	<DeleteBudgetModal
		budget={deleteTarget}
		oncancel={() => (deleteTarget = null)}
		onconfirm={handleDeleteConfirm}
	/>
{/if}
