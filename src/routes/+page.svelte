<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Plus, AlertTriangle } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { budgetsStore } from '$lib/stores/budgets.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { formatCurrency, needsReview, daysOverdue } from '$lib/utils/format';
	import { STATUS_BADGE, NEEDS_REVIEW_BADGE } from '$lib/constants/status-badge';
	import type { BudgetStatus } from '$lib/types';

	// Sort: active → plan → review → closed, then newest id first within a group.
	const STATUS_ORDER: { [k: string]: number } = { active: 0, plan: 1, review: 2, closed: 3 };
	const sorted = $derived(
		[...budgetsStore.list].sort(
			(a, b) =>
				((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)) || b.id - a.id
		)
	);

	onMount(() => {
		budgetsStore.load();
	});

	async function handleNewBudget() {
		const now = new Date();
		const monthNames = [
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December'
		];
		const shortNames = [
			'Jan',
			'Feb',
			'Mar',
			'Apr',
			'May',
			'Jun',
			'Jul',
			'Aug',
			'Sep',
			'Oct',
			'Nov',
			'Dec'
		];
		const year = now.getFullYear();
		const month = now.getMonth();
		const name = `${monthNames[month]} ${year}`;
		const startDate = `${shortNames[month]} 1, ${year}`;
		const lastDay = new Date(year, month + 1, 0).getDate();
		const endDate = `${shortNames[month]} ${lastDay}, ${year}`;
		try {
			const created = await budgetsStore.create(name, startDate, endDate);
			toast.success('Budget created');
			await goto(`/budget/${created.id}`);
		} catch (e) {
			toast.error(`Failed to create budget: ${e instanceof Error ? e.message : String(e)}`);
		}
	}
</script>

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

	<!-- Empty state -->
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
			<p class="text-caption">No budgets yet. Create your first budget to get started.</p>
		</div>

	<!-- Budget card list -->
	{:else}
		<div style="display: flex; flex-direction: column; gap: 10px;">
			{#each sorted as b}
				{@const inflow = b.records
					.filter((r) => r.type === 'inflow')
					.reduce((sum, r) => sum + r.amount, 0)}
				{@const outflow = b.records
					.filter((r) => r.type === 'outflow')
					.reduce((sum, r) => sum + r.amount, 0)}
				{@const net = inflow - outflow}
				{@const review = needsReview(b)}
				{@const isClosed = b.status === 'closed'}
				{@const overdue = daysOverdue(b)}
				{@const mode = themeStore.value === 'dark' ? 'dark' : 'light'}
				{@const statusColors = STATUS_BADGE[b.status as BudgetStatus][mode]}
				{@const reviewColors = NEEDS_REVIEW_BADGE[mode]}

				<!-- Card -->
				<div
					role="button"
					tabindex="0"
					onclick={() => goto(`/budget/${b.id}`)}
					onkeydown={(e) => e.key === 'Enter' && goto(`/budget/${b.id}`)}
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
						<span>{b.startDate} – {b.endDate}</span>
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
