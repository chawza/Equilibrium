<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ChevronDown } from '@lucide/svelte';
	import { budgetsStore } from '$lib/stores/budgets.svelte';
	import { tagsStore } from '$lib/stores/tags.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { formatCurrency } from '$lib/utils/format';
	import { tagStyle } from '$lib/constants/tag-colors';
	import TagBadge from '$lib/components/TagBadge.svelte';
	import type { BudgetStatus, Tag, ColorKey } from '$lib/types';

	// ── Lifecycle ordering for segmented bars ────────────────────────────────────
	const STATUSES: BudgetStatus[] = ['plan', 'active', 'review', 'closed'];
	const STATUS_OPACITY: Record<BudgetStatus, number> = {
		plan: 0.34,
		active: 0.62,
		review: 0.82,
		closed: 1.0
	};
	const STATUS_LABEL: Record<BudgetStatus, string> = {
		plan: 'Plan',
		active: 'Active',
		review: 'Review',
		closed: 'Closed'
	};

	// ── Derived aggregates ───────────────────────────────────────────────────────
	const budgetCount = $derived(budgetsStore.list.length);

	const totalInflow = $derived(
		budgetsStore.list.reduce(
			(sum, budget) =>
				sum +
				budget.records.filter((record) => record.type === 'inflow').reduce((acc, record) => acc + record.amount, 0),
			0
		)
	);

	const totalOutflow = $derived(
		budgetsStore.list.reduce(
			(sum, budget) =>
				sum +
				budget.records.filter((record) => record.type === 'outflow').reduce((acc, record) => acc + record.amount, 0),
			0
		)
	);

	const inflowByStatus = $derived.by(() => {
		const counts: Record<BudgetStatus, number> = { plan: 0, active: 0, review: 0, closed: 0 };
		for (const budget of budgetsStore.list) {
			const status = budget.status as BudgetStatus;
			for (const record of budget.records) {
				if (record.type === 'inflow') counts[status] += record.amount;
			}
		}
		return counts;
	});

	const outflowByStatus = $derived.by(() => {
		const counts: Record<BudgetStatus, number> = { plan: 0, active: 0, review: 0, closed: 0 };
		for (const budget of budgetsStore.list) {
			const status = budget.status as BudgetStatus;
			for (const record of budget.records) {
				if (record.type === 'outflow') counts[status] += record.amount;
			}
		}
		return counts;
	});

	const maxScale = $derived(Math.max(totalInflow, totalOutflow));

	// by-tag outflow aggregation (outflow only, per spec)
	const byTag = $derived.by(() => {
		const map = new Map<number, { tag: Tag; total: number }>();
		for (const budget of budgetsStore.list) {
			for (const record of budget.records) {
				if (record.type !== 'outflow') continue;
				for (const tag of record.tags) {
					if (!map.has(tag.id)) {
						map.set(tag.id, { tag, total: 0 });
					}
					map.get(tag.id)!.total += record.amount;
				}
			}
		}
		return map;
	});

	// ── Tag selector state ───────────────────────────────────────────────────────
	let selectedTagIds = $state<number[]>([]);
	let initialized = $state(false);

	// Initialize selection once data is loaded
	$effect(() => {
		if (initialized || budgetsStore.loading || budgetsStore.list.length === 0) return;

		const saved = localStorage.getItem('eq_statsTags');
		if (saved) {
			try {
				const parsed = JSON.parse(saved) as number[];
				// Only keep ids that still exist in byTag or tagsStore
				const existingIds = new Set([
					...byTag.keys(),
					...tagsStore.list.map((tag) => tag.id)
				]);
				const valid = parsed.filter((id) => existingIds.has(id));
				if (valid.length > 0) {
					selectedTagIds = valid;
					initialized = true;
					return;
				}
			} catch {
				// ignore malformed localStorage
			}
		}

		// Default: top 4 outflow spenders
		const top4 = [...byTag.values()]
			.sort((a, b) => b.total - a.total)
			.slice(0, 4)
			.map((entry) => entry.tag.id);
		selectedTagIds = top4;
		initialized = true;
	});

	// Persist selection changes
	$effect(() => {
		if (!initialized) return;
		localStorage.setItem('eq_statsTags', JSON.stringify(selectedTagIds));
	});

	// Resolved data for selected tags, sorted by total desc
	const selectedTagsData = $derived(
		selectedTagIds
			.map((id) => {
				const fromMap = byTag.get(id);
				if (fromMap) return fromMap;
				// Tag is selected but has no outflow records → look up in tagsStore
				const tagRecord = tagsStore.list.find((tag) => tag.id === id);
				if (!tagRecord) return null;
				const tag: Tag = { id: tagRecord.id, name: tagRecord.name, color: tagRecord.color as ColorKey };
				return { tag, total: 0 };
			})
			.filter((e): e is { tag: Tag; total: number } => e !== null)
			.sort((a, b) => b.total - a.total)
	);

	const selectedTagsTotal = $derived(selectedTagsData.reduce((sum, entry) => sum + entry.total, 0));

	const maxTagTotal = $derived(Math.max(...selectedTagsData.map((entry) => entry.total), 0));

	// Tags not yet in selection (for the "Add tag" dropdown)
	const availableTags = $derived(
		tagsStore.list
			.filter((tag) => !selectedTagIds.includes(tag.id))
			.sort((a, b) => a.name.localeCompare(b.name))
	);

	// ── Segment hover tooltip ────────────────────────────────────────────────────
	let hoveredSegment = $state<{ row: 'inflow' | 'outflow'; status: BudgetStatus } | null>(null);

	// ── "Add tag" dropdown ───────────────────────────────────────────────────────
	let addDropdownOpen = $state(false);
	let dropdownContainerEl = $state<HTMLDivElement | undefined>(undefined);

	function handleDropdownOutsideClick(e: MouseEvent) {
		if (dropdownContainerEl && !dropdownContainerEl.contains(e.target as Node)) {
			addDropdownOpen = false;
		}
	}

	onMount(() => {
		budgetsStore.load();
		tagsStore.load();
		document.addEventListener('mousedown', handleDropdownOutsideClick);
	});

	onDestroy(() => {
		document.removeEventListener('mousedown', handleDropdownOutsideClick);
	});

	function addTag(id: number) {
		if (!selectedTagIds.includes(id)) {
			selectedTagIds = [...selectedTagIds, id];
		}
		addDropdownOpen = false;
	}

	function removeTag(id: number) {
		selectedTagIds = selectedTagIds.filter((tagId) => tagId !== id);
	}

	const isDark = $derived(themeStore.value === 'dark');
</script>

<div class="page-enter" style="max-width: 720px; margin: 0 auto;">
	<!-- Header -->
	<div
		style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px;"
	>
		<h1 class="text-page-title">Stats</h1>
		<span class="text-caption">
			All-time · {budgetCount}
			{budgetCount === 1 ? 'budget' : 'budgets'}
		</span>
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
	{:else if budgetCount === 0}
		<div
			style="
				border: 1px solid hsl(var(--border));
				border-radius: var(--radius);
				background: hsl(var(--card));
				padding: 40px 18px;
				text-align: center;
			"
		>
			<p class="text-caption">No budgets yet. Create a budget to see stats.</p>
		</div>

	<!-- Main stats content -->
	{:else}
		<!-- Summary tiles: 2-column grid -->
		<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
			<!-- Inflow tile -->
			<div
				style="
					background: hsl(var(--card));
					border: 1px solid hsl(var(--border));
					border-radius: var(--radius);
					padding: 14px 16px;
				"
			>
				<div class="text-caption" style="margin-bottom: 6px;">Total inflow</div>
				<div
					class="text-amount"
					style="
						font-size: 17px; font-weight: 600; letter-spacing: -0.02em;
						color: hsl(var(--inflow));
					"
				>
					+{formatCurrency(totalInflow)}
				</div>
			</div>
			<!-- Outflow tile -->
			<div
				style="
					background: hsl(var(--card));
					border: 1px solid hsl(var(--border));
					border-radius: var(--radius);
					padding: 14px 16px;
				"
			>
				<div class="text-caption" style="margin-bottom: 6px;">Total outflow</div>
				<div
					class="text-amount"
					style="
						font-size: 17px; font-weight: 600; letter-spacing: -0.02em;
						color: hsl(var(--outflow));
					"
				>
					−{formatCurrency(totalOutflow)}
				</div>
			</div>
		</div>

		<!-- Inflow vs Outflow card -->
		<div
			style="
				background: hsl(var(--card));
				border: 1px solid hsl(var(--border));
				border-radius: var(--radius);
				padding: 18px 20px;
				margin-bottom: 16px;
			"
		>
			<div class="text-card-title" style="margin-bottom: 16px;">Inflow vs Outflow</div>

			{#each (['inflow', 'outflow'] as const) as row}
				{@const byStatus = row === 'inflow' ? inflowByStatus : outflowByStatus}
				{@const rowTotal = row === 'inflow' ? totalInflow : totalOutflow}
				<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
					<!-- Row label -->
					<div
						class="text-caption"
						style="
							width: 48px; flex-shrink: 0; text-align: right;
							color: hsl(var(--{row}));
							font-weight: 500;
						"
					>
						{row === 'inflow' ? 'In' : 'Out'}
					</div>

					<!-- Bar track -->
					<div
						style="
							flex: 1; height: 20px; border-radius: 4px;
							background: hsl(var(--secondary));
							overflow: visible;
							position: relative;
							display: flex;
						"
					>
						{#if maxScale > 0}
							{#each STATUSES as status}
								{@const amount = byStatus[status]}
								{@const pct = (amount / maxScale) * 100}
								{#if amount > 0}
									<div
										role="button"
										tabindex="0"
										style="
											position: relative;
											width: {pct}%;
											height: 100%;
											background: hsl(var(--{row}) / {STATUS_OPACITY[status]});
											box-shadow: inset -1.5px 0 0 hsl(var(--card));
											cursor: default;
										"
										onmouseenter={() => (hoveredSegment = { row, status })}
										onmouseleave={() => (hoveredSegment = null)}
										onkeydown={() => {}}
									>
										<!-- Tooltip -->
										{#if hoveredSegment?.row === row && hoveredSegment?.status === status}
											<div
												style="
													position: absolute;
													bottom: calc(100% + 6px);
													left: 50%;
													transform: translateX(-50%);
													background: hsl(var(--popover));
													border: 1px solid hsl(var(--border));
													border-radius: 6px;
													padding: 5px 10px;
													font-size: 12px;
													font-weight: 500;
													color: hsl(var(--foreground));
													white-space: nowrap;
													box-shadow: 0 2px 8px hsl(var(--foreground) / 0.08);
													z-index: 10;
													pointer-events: none;
												"
											>
												{STATUS_LABEL[status]} · {formatCurrency(amount)}
											</div>
										{/if}
									</div>
								{/if}
							{/each}
						{/if}
					</div>

					<!-- Amount -->
					<div
						class="text-amount"
						style="
							width: 100px; flex-shrink: 0; text-align: right;
							color: hsl(var(--{row}));
						"
					>
						{formatCurrency(rowTotal)}
					</div>
				</div>
			{/each}

			<!-- Legend -->
			<div
				style="
					display: flex; align-items: center; flex-wrap: wrap; gap: 12px;
					margin-top: 14px; padding-top: 12px;
					border-top: 1px solid hsl(var(--border));
				"
			>
				{#each STATUSES as status}
					<div style="display: flex; align-items: center; gap: 5px;">
						<div
							style="
								width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0;
								background: hsl(var(--foreground) / {STATUS_OPACITY[status]});
							"
						></div>
						<span class="text-caption">{STATUS_LABEL[status]}</span>
					</div>
				{/each}
				<span class="text-caption" style="margin-left: auto; color: hsl(var(--muted-foreground) / 0.7);">
					opacity = lifecycle stage
				</span>
			</div>
		</div>

		<!-- Total by Tag card -->
		<div
			style="
				background: hsl(var(--card));
				border: 1px solid hsl(var(--border));
				border-radius: var(--radius);
				padding: 18px 20px;
			"
		>
			<!-- Card header -->
			<div
				style="
					display: flex; align-items: center; justify-content: space-between;
					margin-bottom: 14px;
				"
			>
				<div class="text-card-title">Total by Tag</div>
				{#if selectedTagsData.length > 0}
					<div
						class="text-amount"
						style="font-size: 13px; color: hsl(var(--muted-foreground));"
					>
						{formatCurrency(selectedTagsTotal)}
					</div>
				{/if}
			</div>

			<!-- Tag selector row -->
			<div
				style="
					display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
					margin-bottom: 16px;
				"
			>
				{#each selectedTagIds as id}
					{@const entry = selectedTagsData.find((e) => e.tag.id === id)}
					{#if entry}
						<TagBadge tag={entry.tag} removable onremove={() => removeTag(id)} />
					{/if}
				{/each}

				<!-- "Add tag" dropdown -->
				{#if availableTags.length > 0}
					<div bind:this={dropdownContainerEl} style="position: relative; display: inline-flex;">
						<button
							type="button"
							onclick={() => (addDropdownOpen = !addDropdownOpen)}
							style="
								display: inline-flex; align-items: center; gap: 4px;
								padding: 2px 9px 2px 9px; border-radius: 9999px;
								font-size: 12px; font-weight: 500; line-height: 18px;
								border: 1px dashed hsl(var(--border));
								background: transparent;
								color: hsl(var(--muted-foreground));
								cursor: pointer;
								transition: border-color 0.15s, color 0.15s;
							"
							onmouseenter={(e) => {
								(e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--muted-foreground) / 0.5)';
								(e.currentTarget as HTMLElement).style.color = 'hsl(var(--foreground))';
							}}
							onmouseleave={(e) => {
								(e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--border))';
								(e.currentTarget as HTMLElement).style.color = 'hsl(var(--muted-foreground))';
							}}
						>
							Add tag
							<ChevronDown size={11} />
						</button>

						{#if addDropdownOpen}
							<div
								style="
									position: absolute; top: calc(100% + 4px); left: 0;
									background: hsl(var(--popover));
									border: 1px solid hsl(var(--border));
									border-radius: var(--radius);
									box-shadow: 0 4px 16px rgba(0,0,0,0.1);
									z-index: 50;
									min-width: 160px;
									overflow: hidden;
								"
							>
								{#each availableTags as tag}
									{@const cs = tagStyle(tag.color, isDark)}
									<button
										type="button"
										onclick={() => addTag(tag.id)}
										style="
											display: flex; align-items: center; gap: 8px;
											width: 100%; padding: 8px 12px;
											font-size: 13px; font-weight: 500;
											border: none; background: transparent;
											color: hsl(var(--foreground));
											cursor: pointer; text-align: left;
											transition: background 0.1s;
										"
										onmouseenter={(e) => {
											(e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))';
										}}
										onmouseleave={(e) => {
											(e.currentTarget as HTMLElement).style.background = 'transparent';
										}}
									>
										<span
											style="
												width: 6px; height: 6px; border-radius: 50%;
												background: {cs.dot}; flex-shrink: 0;
											"
										></span>
										{tag.name}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Per-tag bar rows -->
			{#if selectedTagsData.length === 0}
				<p class="text-caption" style="text-align: center; padding: 20px 0;">
					Select tags to compare spending.
				</p>
			{:else}
				<div style="display: flex; flex-direction: column; gap: 8px;">
					{#each selectedTagsData as entry}
						{@const cs = tagStyle(entry.tag.color, isDark)}
						{@const barPct = maxTagTotal > 0 ? (entry.total / maxTagTotal) * 100 : 0}
						<div style="display: flex; align-items: center; gap: 10px;">
							<!-- Tag badge column: 90px -->
							<div
								style="
									width: 90px; flex-shrink: 0;
									overflow: hidden;
									display: flex; align-items: center;
								"
							>
								<TagBadge tag={entry.tag} />
							</div>

							<!-- Bar track: flex 1 -->
							<div
								style="
									flex: 1; height: 18px; border-radius: 4px;
									background: hsl(var(--secondary));
									overflow: hidden;
								"
							>
								{#if barPct > 0}
									<div
										style="
											width: {barPct}%; height: 100%; border-radius: 4px;
											background: {cs.fill};
											border: 1px solid {cs.text}1f;
										"
									></div>
								{/if}
							</div>

							<!-- Amount column: 100px -->
							<div
								class="text-amount"
								style="
									width: 100px; flex-shrink: 0; text-align: right;
									font-size: 13px;
								"
							>
								{formatCurrency(entry.total)}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
