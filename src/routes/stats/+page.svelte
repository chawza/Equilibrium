<script lang="ts">
	import { onMount } from 'svelte';
	import { commands, type StatsSummary, type TagStat } from '$lib/bindings';
	import { tagsStore } from '$lib/stores/tags.svelte';
	import { budgetsStore } from '$lib/stores/budgets.svelte';
	import { formatCurrency } from '$lib/utils/format';
	import { tagStyle } from '$lib/constants/tag-colors';
	import { themeStore } from '$lib/stores/theme.svelte';
	import TagBadge from '$lib/components/TagBadge.svelte';
	import TagSplitBar from '$lib/components/TagSplitBar.svelte';
	import type { Tag, ColorKey, BudgetStatus } from '$lib/types';

	// ── Lifecycle ordering ───────────────────────────────────────────────────────
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

	// ── Filter persistence ───────────────────────────────────────────────────────
	type RecordTypeFilter = 'all' | 'inflow' | 'outflow';

	interface FilterState {
		tagIds: number[];
		excludeTagIds: number[];
		recordType: RecordTypeFilter;
	}

	function loadFilter(): FilterState {
		try {
			const raw = JSON.parse(localStorage.getItem('eq_statsFilter') || 'null');
			if (raw && typeof raw === 'object') {
				const tagIds = Array.isArray(raw.tagIds)
					? raw.tagIds.filter((id: unknown): id is number => typeof id === 'number')
					: [];
				const excludeTagIds = Array.isArray(raw.excludeTagIds)
					? raw.excludeTagIds.filter((id: unknown): id is number => typeof id === 'number')
					: [];
				const recordType = ['all', 'inflow', 'outflow'].includes(raw.recordType)
					? (raw.recordType as RecordTypeFilter)
					: 'all';
				return { tagIds, excludeTagIds, recordType };
			}
		} catch {
			// ignore
		}
		// Discard the old Phase 7 key on first read.
		try { localStorage.removeItem('eq_statsTags'); } catch { /* ignore */ }
		return { tagIds: [], excludeTagIds: [], recordType: 'all' };
	}

	function unwrap<T>(result: { status: 'ok'; data: T } | { status: 'error'; error: string }): T {
		if (result.status === 'ok') return result.data;
		throw new Error(result.error);
	}

	// ── Filter state ─────────────────────────────────────────────────────────────
	let filter = $state<FilterState>(loadFilter());

	// Persist on every change.
	$effect(() => {
		try { localStorage.setItem('eq_statsFilter', JSON.stringify(filter)); } catch { /* ignore */ }
	});

	// ── Stats summary ─────────────────────────────────────────────────────────────
	let summary = $state<StatsSummary | null>(null);
	let summaryLoading = $state(false);

	// Re-fetch whenever filter state changes.
	$effect(() => {
		// Read all filter fields to track them as dependencies.
		const tagIds = filter.tagIds;
		const excludeTagIds = filter.excludeTagIds;
		const recordType = filter.recordType;

		summaryLoading = true;
		commands.getStatsSummary({
			tagIds,
			excludeTagIds,
			recordType: recordType === 'all' ? null : recordType,
		}).then((result) => {
			try {
				summary = unwrap(result);
			} catch {
				summary = null;
			}
			summaryLoading = false;
		});
	});

	// ── Unfiltered total (for the match-count caption) ───────────────────────────
	let totalRecordCount = $state(0);
	$effect(() => {
		commands.getStatsSummary({ tagIds: [], excludeTagIds: [], recordType: null }).then((result) => {
			try {
				totalRecordCount = unwrap(result).matchCount;
			} catch { /* ignore */ }
		});
	});

	// ── Dropdown state ────────────────────────────────────────────────────────────
	let addOpen = $state(false);
	let excludeOpen = $state(false);

	let addDropdownEl = $state<HTMLDivElement | undefined>(undefined);
	let excludeDropdownEl = $state<HTMLDivElement | undefined>(undefined);

	function handleOutsideClick(e: MouseEvent) {
		if (addDropdownEl && !addDropdownEl.contains(e.target as Node)) addOpen = false;
		if (excludeDropdownEl && !excludeDropdownEl.contains(e.target as Node)) excludeOpen = false;
	}

	// ── Computed helpers ─────────────────────────────────────────────────────────
	const isDark = $derived(themeStore.value === 'dark');
	const budgetCount = $derived(budgetsStore.list.length);
	const singleType = $derived(filter.recordType !== 'all');
	const filterActive = $derived(
		filter.tagIds.length > 0 || filter.excludeTagIds.length > 0 || filter.recordType !== 'all'
	);
	const maxAmount = $derived(
		Math.max(summary?.totalInflow ?? 0, summary?.totalOutflow ?? 0, 1)
	);

	// Resolved tag objects for include chips — looked up from tagsStore.
	const includeTags = $derived(
		filter.tagIds
			.map((id) => tagsStore.list.find((t) => t.id === id))
			.filter((t): t is typeof tagsStore.list[0] => t !== null && t !== undefined)
	);

	const excludeTags = $derived(
		filter.excludeTagIds
			.map((id) => tagsStore.list.find((t) => t.id === id))
			.filter((t): t is typeof tagsStore.list[0] => t !== null && t !== undefined)
	);

	// Tags available to add (from by_tag on the current filtered set, minus already included/excluded).
	const availableToAdd = $derived(
		(summary?.byTag ?? [])
			.filter(
				(ts) =>
					ts.tagId !== 0 && // exclude misc
					!filter.tagIds.includes(ts.tagId) &&
					!filter.excludeTagIds.includes(ts.tagId)
			)
	);

	// Tags available to exclude (from base_tags, minus already included/excluded).
	const availableToExclude = $derived(
		(summary?.baseTags ?? [])
			.filter(
				(ts) =>
					!filter.tagIds.includes(ts.tagId) &&
					!filter.excludeTagIds.includes(ts.tagId)
			)
	);

	// Tag max for the by-tag chart.
	const tagMax = $derived(
		(summary?.byTag ?? []).reduce((m, ts) => Math.max(m, ts.inflow + ts.outflow), 0) || 1
	);

	// ── Mutators ─────────────────────────────────────────────────────────────────
	function addTag(id: number) {
		if (!filter.tagIds.includes(id)) {
			filter = { ...filter, tagIds: [...filter.tagIds, id] };
		}
		addOpen = false;
	}

	function removeTag(id: number) {
		filter = { ...filter, tagIds: filter.tagIds.filter((x) => x !== id) };
	}

	function addExclude(id: number) {
		if (!filter.excludeTagIds.includes(id)) {
			filter = { ...filter, excludeTagIds: [...filter.excludeTagIds, id] };
		}
		excludeOpen = false;
	}

	function removeExclude(id: number) {
		filter = { ...filter, excludeTagIds: filter.excludeTagIds.filter((x) => x !== id) };
	}

	function setRecordType(rt: RecordTypeFilter) {
		filter = { ...filter, recordType: rt };
	}

	function clearAll() {
		filter = { tagIds: [], excludeTagIds: [], recordType: 'all' };
		addOpen = false;
		excludeOpen = false;
	}

	// ── Lifecycle ─────────────────────────────────────────────────────────────────
	onMount(() => {
		budgetsStore.load();
		tagsStore.load();
		document.addEventListener('mousedown', handleOutsideClick);
		return () => document.removeEventListener('mousedown', handleOutsideClick);
	});

	// Helper: build a Tag object from TagStat for TagBadge
	function tagStatToTag(ts: TagStat): Tag {
		return { id: ts.tagId, name: ts.tagName, color: ts.tagColor as ColorKey };
	}

	// ── Hover state for StackedBar ───────────────────────────────────────────────
	let hoveredInflowStatus = $state<string | null>(null);
	let hoveredOutflowStatus = $state<string | null>(null);

	// Pre-computed bar widths for stacked bars (avoids @const in templates)
	const inflowWidthPct = $derived(
		summary ? (maxAmount > 0 ? summary.totalInflow / maxAmount * 100 : 0) : 0
	);
	const outflowWidthPct = $derived(
		summary ? (maxAmount > 0 ? summary.totalOutflow / maxAmount * 100 : 0) : 0
	);
</script>

<div class="page-enter" style="max-width: 720px; margin: 0 auto;">
	<!-- Header -->
	<div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 18px;">
		<h1 class="text-page-title">Stats</h1>
		<span class="text-caption">
			All-time · {budgetCount} budget{budgetCount !== 1 ? 's' : ''}
		</span>
	</div>

	{#if budgetCount === 0}
		<!-- No budgets at all -->
		<div style="text-align: center; padding: 60px 0; color: hsl(var(--muted-foreground));">
			No budget data yet.
		</div>
	{:else}
		<!-- ── Filter card ──────────────────────────────────────────────────────── -->
		<div
			style="
				background: hsl(var(--card)); border: 1px solid hsl(var(--border));
				border-radius: var(--radius); padding: 16px 20px; margin-bottom: 14px;
			"
		>
			<!-- Filter heading + clear -->
			<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
				<div class="text-section-heading">Filter</div>
				{#if filterActive}
					<button
						type="button"
						onclick={clearAll}
						style="
							display: inline-flex; align-items: center; gap: 4px;
							border: none; background: transparent; cursor: pointer;
							font-family: inherit; font-size: 12px; font-weight: 500;
							color: hsl(var(--muted-foreground)); padding: 2px 4px;
							transition: color 0.12s;
						"
						onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = 'hsl(var(--foreground))')}
						onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = 'hsl(var(--muted-foreground))')}
					>
						✕ Clear all
					</button>
				{/if}
			</div>

			<div style="display: flex; flex-direction: column; gap: 12px;">
				<!-- Include row -->
				<div style="display: flex; align-items: flex-start; gap: 14px;">
					<span style="width: 52px; flex-shrink: 0; padding-top: 4px; font-size: 12px; font-weight: 500; color: hsl(var(--muted-foreground));">Include</span>
					<div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center; flex: 1;">
						{#each includeTags as t}
							{@const tag: Tag = { id: t.id, name: t.name, color: t.color as ColorKey }}
							<TagBadge {tag} removable onremove={() => removeTag(t.id)} />
						{/each}

						<!-- Add tag dropdown -->
						<div bind:this={addDropdownEl} style="position: relative; display: inline-flex;">
							<button
								type="button"
								onclick={() => availableToAdd.length && (addOpen = !addOpen)}
								disabled={availableToAdd.length === 0}
								style="
									display: inline-flex; align-items: center; gap: 3px;
									padding: 2px 9px 2px 7px; border-radius: 9999px;
									font-size: 12px; font-weight: 500; line-height: 18px; font-family: inherit;
									border: 1px dashed hsl(var(--border)); background: transparent;
									color: hsl(var(--muted-foreground));
									cursor: {availableToAdd.length ? 'pointer' : 'not-allowed'};
									opacity: {availableToAdd.length ? 1 : 0.45};
								"
							>
								＋ Add tag
							</button>
							{#if addOpen && availableToAdd.length > 0}
								<div
									style="
										position: absolute; top: calc(100% + 4px); left: 0; z-index: 50;
										background: hsl(var(--popover)); border: 1px solid hsl(var(--border));
										border-radius: var(--radius); box-shadow: 0 4px 16px rgba(0,0,0,0.1);
										min-width: 160px; overflow: hidden;
									"
								>
									{#each availableToAdd as ts}
										{@const cs = tagStyle(ts.tagColor as ColorKey, isDark)}
										<button
											type="button"
											onclick={() => addTag(ts.tagId)}
											style="
												display: flex; align-items: center; gap: 7px;
												width: 100%; padding: 8px 12px; border: none;
												background: transparent; font-family: inherit;
												font-size: 13px; font-weight: 500; cursor: pointer;
												color: hsl(var(--foreground)); text-align: left;
											"
											onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))'; }}
											onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
										>
											<span style="width: 7px; height: 7px; border-radius: 50%; background: {cs.dot}; flex-shrink: 0;"></span>
											{ts.tagName}
										</button>
									{/each}
								</div>
							{/if}
						</div>

						{#if filter.tagIds.length >= 2}
							<span class="text-caption" style="opacity: 0.75; margin-left: 2px;">
								records with all {filter.tagIds.length}
							</span>
						{/if}
					</div>
				</div>

				<!-- Exclude row -->
				<div style="display: flex; align-items: flex-start; gap: 14px;">
					<span style="width: 52px; flex-shrink: 0; padding-top: 4px; font-size: 12px; font-weight: 500; color: hsl(var(--muted-foreground));">Exclude</span>
					<div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center; flex: 1;">
						{#each excludeTags as t}
							{@const cs = tagStyle(t.color as ColorKey, isDark)}
							<!-- Exclude chip: strikethrough muted pill -->
							<span
								style="
									display: inline-flex; align-items: center; gap: 5px;
									padding: 2px 5px 2px 9px; border-radius: 9999px;
									font-size: 12px; font-weight: 500; line-height: 18px; white-space: nowrap;
									background: hsl(var(--secondary)); color: hsl(var(--muted-foreground));
									border: 1px solid hsl(var(--border));
								"
							>
								<span style="width: 6px; height: 6px; border-radius: 50%; background: {cs.dot}; flex-shrink: 0; opacity: 0.55;"></span>
								<span style="text-decoration: line-through; text-decoration-color: hsl(var(--muted-foreground) / 0.7);">{t.name}</span>
								<button
									type="button"
									onclick={() => removeExclude(t.id)}
									style="
										display: inline-flex; align-items: center; justify-content: center;
										width: 15px; height: 15px; border-radius: 50%; border: none;
										background: transparent; color: hsl(var(--muted-foreground));
										cursor: pointer; padding: 0; opacity: 0.6; transition: opacity 0.1s;
									"
									onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
									onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.6'; }}
									aria-label="Remove exclude tag"
								>✕</button>
							</span>
						{/each}

						<!-- Hide tag dropdown -->
						<div bind:this={excludeDropdownEl} style="position: relative; display: inline-flex;">
							<button
								type="button"
								onclick={() => availableToExclude.length && (excludeOpen = !excludeOpen)}
								disabled={availableToExclude.length === 0}
								style="
									display: inline-flex; align-items: center; gap: 3px;
									padding: 2px 9px 2px 7px; border-radius: 9999px;
									font-size: 12px; font-weight: 500; line-height: 18px; font-family: inherit;
									border: 1px dashed hsl(var(--border)); background: transparent;
									color: hsl(var(--muted-foreground));
									cursor: {availableToExclude.length ? 'pointer' : 'not-allowed'};
									opacity: {availableToExclude.length ? 1 : 0.45};
								"
							>
								✕ Hide tag
							</button>
							{#if excludeOpen && availableToExclude.length > 0}
								<div
									style="
										position: absolute; top: calc(100% + 4px); left: 0; z-index: 50;
										background: hsl(var(--popover)); border: 1px solid hsl(var(--border));
										border-radius: var(--radius); box-shadow: 0 4px 16px rgba(0,0,0,0.1);
										min-width: 160px; overflow: hidden;
									"
								>
									{#each availableToExclude as ts}
										{@const cs = tagStyle(ts.tagColor as ColorKey, isDark)}
										<button
											type="button"
											onclick={() => addExclude(ts.tagId)}
											style="
												display: flex; align-items: center; gap: 7px;
												width: 100%; padding: 8px 12px; border: none;
												background: transparent; font-family: inherit;
												font-size: 13px; font-weight: 500; cursor: pointer;
												color: hsl(var(--foreground)); text-align: left;
											"
											onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))'; }}
											onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
										>
											<span style="width: 7px; height: 7px; border-radius: 50%; background: {cs.dot}; flex-shrink: 0;"></span>
											{ts.tagName}
										</button>
									{/each}
								</div>
							{/if}
						</div>

						{#if filter.excludeTagIds.length === 0}
							<span class="text-caption" style="opacity: 0.6; margin-left: 2px;">
								e.g. hide unconfirmed records
							</span>
						{/if}
					</div>
				</div>

				<!-- Type axis -->
				<div style="display: flex; align-items: center; gap: 14px;">
					<span style="width: 52px; flex-shrink: 0; font-size: 12px; font-weight: 500; color: hsl(var(--muted-foreground));">Type</span>
					<!-- Segmented control -->
					<div style="display: inline-flex; background: hsl(var(--secondary)); border-radius: 8px; padding: 3px; gap: 2px;">
						{#each ([['all', 'All', null], ['inflow', 'Inflow', 'var(--inflow)'], ['outflow', 'Outflow', 'var(--outflow)']] as const) as [id, label, color]}
							{@const active = filter.recordType === id}
							<button
								type="button"
								onclick={() => setRecordType(id)}
								style="
									border: none; cursor: pointer; font-family: inherit; font-weight: 500; font-size: 13px;
									padding: 4px 13px; border-radius: 6px;
									transition: background 0.12s, color 0.12s, box-shadow 0.12s;
									background: {active ? 'hsl(var(--background))' : 'transparent'};
									color: {active ? (color ? `hsl(${color})` : 'hsl(var(--foreground))') : 'hsl(var(--muted-foreground))'};
									box-shadow: {active ? '0 1px 2px hsl(var(--foreground) / 0.08)' : 'none'};
								"
							>
								{label}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Live match count -->
			<div
				style="
					margin-top: 14px; padding-top: 12px; border-top: 1px solid hsl(var(--border));
					display: flex; align-items: center; gap: 6px;
				"
			>
				<span
					style="
						width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
						background: {(summary?.matchCount ?? 0) > 0 ? 'hsl(var(--inflow))' : 'hsl(var(--muted-foreground))'};
					"
				></span>
				<span class="text-caption" style="color: hsl(var(--foreground)); font-weight: 500;">
					{#if filterActive}
						{summary?.matchCount ?? 0} of {totalRecordCount} record{totalRecordCount !== 1 ? 's' : ''} match
					{:else}
						{totalRecordCount} record{totalRecordCount !== 1 ? 's' : ''}
					{/if}
				</span>
				{#if (summary?.matchCount ?? 0) > 0}
					<span class="text-caption" style="opacity: 0.7;">
						· across {summary?.matchBudgets ?? 0} budget{(summary?.matchBudgets ?? 0) !== 1 ? 's' : ''}
					</span>
				{/if}
			</div>
		</div>

		<!-- ── Empty state (no records match) ─────────────────────────────────── -->
		{#if !summaryLoading && summary !== null && summary.matchCount === 0 && filterActive}
			<div
				style="
					background: hsl(var(--card)); border: 1px solid hsl(var(--border));
					border-radius: var(--radius); padding: 48px 24px; text-align: center;
				"
			>
				<div
					style="
						width: 44px; height: 44px; margin: 0 auto 14px;
						display: flex; align-items: center; justify-content: center;
						border-radius: 12px; background: hsl(var(--secondary));
						color: hsl(var(--muted-foreground)); font-size: 20px;
					"
				>
					◈
				</div>
				<div style="font-size: 15px; font-weight: 600; margin-bottom: 6px;">No records match this filter</div>
				<div class="text-caption" style="max-width: 360px; margin: 0 auto 18px; line-height: 1.6;">
					{#if filter.tagIds.length > 0}
						No {singleType ? filter.recordType + ' ' : ''}records carry
						{filter.tagIds.length > 1 ? 'all of ' : ''}{#each includeTags as t, i}{#if i > 0}{#if i === includeTags.length - 1} and {:else}, {/if}{/if}<strong style="color: hsl(var(--foreground));">{t.name}</strong>{/each}. Try removing a tag{singleType ? ' or switching type' : ''}.
					{:else if filter.excludeTagIds.length > 0}
						Every {singleType ? filter.recordType + ' ' : ''}record is hidden by your exclude {filter.excludeTagIds.length > 1 ? 'tags' : 'tag'}. Try removing one.
					{:else}
						There are no {filter.recordType} records yet.
					{/if}
				</div>
				<button
					type="button"
					onclick={clearAll}
					style="
						font-size: 13px; font-weight: 500; padding: 6px 14px;
						border-radius: 6px; border: 1px solid hsl(var(--border));
						background: transparent; cursor: pointer; font-family: inherit;
						color: hsl(var(--foreground)); transition: background 0.1s;
					"
					onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))'; }}
					onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
				>
					Clear filters
				</button>
			</div>

		{:else if summary !== null}
			<!-- ── Summary tiles ───────────────────────────────────────────────────── -->
			<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 14px;">
				<!-- Inflow tile -->
				<div
					style="
						background: hsl(var(--card)); border: 1px solid hsl(var(--border));
						border-radius: var(--radius); padding: 14px 16px;
						opacity: {filter.recordType === 'outflow' ? 0.5 : 1}; transition: opacity 0.15s;
					"
				>
					<div class="text-caption" style="margin-bottom: 6px;">Total inflow</div>
					<div class="text-amount" style="font-size: 17px; font-weight: 600; letter-spacing: -0.02em; color: hsl(var(--inflow));">
						+ {formatCurrency(summary.totalInflow)}
					</div>
				</div>
				<!-- Outflow tile -->
				<div
					style="
						background: hsl(var(--card)); border: 1px solid hsl(var(--border));
						border-radius: var(--radius); padding: 14px 16px;
						opacity: {filter.recordType === 'inflow' ? 0.5 : 1}; transition: opacity 0.15s;
					"
				>
					<div class="text-caption" style="margin-bottom: 6px;">Total outflow</div>
					<div class="text-amount" style="font-size: 17px; font-weight: 600; letter-spacing: -0.02em; color: hsl(var(--outflow));">
						− {formatCurrency(summary.totalOutflow)}
					</div>
				</div>
			</div>

			<!-- ── Inflow vs Outflow card ────────────────────────────────────────── -->
			<div
				style="
					background: hsl(var(--card)); border: 1px solid hsl(var(--border));
					border-radius: var(--radius); padding: 18px 20px; margin-bottom: 14px;
				"
			>
				<div class="text-section-heading" style="margin-bottom: 16px;">
					{singleType
						? (filter.recordType === 'inflow' ? 'Inflow' : 'Outflow') + ' by lifecycle'
						: 'Inflow vs Outflow'}
				</div>
				<div style="display: flex; flex-direction: column; gap: 14px;">
					{#if filter.recordType !== 'outflow'}
						<!-- Inflow stacked bar -->
						<div style="display: flex; align-items: center; gap: 10px;">
							<span style="width: 56px; font-size: 13px; font-weight: 500; color: hsl(var(--muted-foreground)); flex-shrink: 0;">Inflow</span>
							<div style="flex: 1; height: 24px; border-radius: 4px; background: hsl(var(--secondary)); position: relative;">
								<div style="position: absolute; top: 0; left: 0; height: 100%; width: {inflowWidthPct}%; min-width: {inflowWidthPct > 0 ? 4 : 0}px; border-radius: 4px; overflow: hidden; display: flex;">
									{#each (['closed', 'review', 'active', 'plan'] as const).filter((s) => (summary?.inflowByStatus[s] ?? 0) > 0) as st, i}
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<div
											style="
												width: {summary && summary.totalInflow > 0 ? (summary.inflowByStatus[st] ?? 0) / summary.totalInflow * 100 : 0}%; height: 100%;
												background: hsl(var(--inflow) / {hoveredInflowStatus === st ? Math.min(STATUS_OPACITY[st] + 0.12, 1) : STATUS_OPACITY[st]});
												transition: opacity 0.12s; cursor: default;
												{i > 0 ? 'box-shadow: inset -1.5px 0 0 hsl(var(--background) / 0.6);' : ''}
												position: relative;
											"
											onmouseenter={() => (hoveredInflowStatus = st)}
											onmouseleave={() => (hoveredInflowStatus = null)}
										>
											{#if hoveredInflowStatus === st}
												<div style="
													position: absolute; bottom: calc(100% + 7px); left: 50%;
													transform: translateX(-50%); white-space: nowrap;
													background: hsl(var(--foreground)); color: hsl(var(--background));
													padding: 5px 9px; border-radius: 6px; font-size: 11px; font-weight: 500;
													z-index: 30; box-shadow: 0 2px 8px rgba(0,0,0,0.18); pointer-events: none;
												">
													{STATUS_LABEL[st]} · {formatCurrency(summary?.inflowByStatus[st] ?? 0)}
												</div>
											{/if}
										</div>
									{/each}
								</div>
							</div>
							<span class="text-amount" style="width: 110px; text-align: right; flex-shrink: 0;">
								{formatCurrency(summary?.totalInflow ?? 0)}
							</span>
						</div>
					{/if}
					{#if filter.recordType !== 'inflow'}
						<!-- Outflow stacked bar -->
						<div style="display: flex; align-items: center; gap: 10px;">
							<span style="width: 56px; font-size: 13px; font-weight: 500; color: hsl(var(--muted-foreground)); flex-shrink: 0;">Outflow</span>
							<div style="flex: 1; height: 24px; border-radius: 4px; background: hsl(var(--secondary)); position: relative;">
								<div style="position: absolute; top: 0; left: 0; height: 100%; width: {outflowWidthPct}%; min-width: {outflowWidthPct > 0 ? 4 : 0}px; border-radius: 4px; overflow: hidden; display: flex;">
									{#each (['closed', 'review', 'active', 'plan'] as const).filter((s) => (summary?.outflowByStatus[s] ?? 0) > 0) as st, i}
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<div
											style="
												width: {summary && summary.totalOutflow > 0 ? (summary.outflowByStatus[st] ?? 0) / summary.totalOutflow * 100 : 0}%; height: 100%;
												background: hsl(var(--outflow) / {hoveredOutflowStatus === st ? Math.min(STATUS_OPACITY[st] + 0.12, 1) : STATUS_OPACITY[st]});
												transition: opacity 0.12s; cursor: default;
												{i > 0 ? 'box-shadow: inset -1.5px 0 0 hsl(var(--background) / 0.6);' : ''}
												position: relative;
											"
											onmouseenter={() => (hoveredOutflowStatus = st)}
											onmouseleave={() => (hoveredOutflowStatus = null)}
										>
											{#if hoveredOutflowStatus === st}
												<div style="
													position: absolute; bottom: calc(100% + 7px); left: 50%;
													transform: translateX(-50%); white-space: nowrap;
													background: hsl(var(--foreground)); color: hsl(var(--background));
													padding: 5px 9px; border-radius: 6px; font-size: 11px; font-weight: 500;
													z-index: 30; box-shadow: 0 2px 8px rgba(0,0,0,0.18); pointer-events: none;
												">
													{STATUS_LABEL[st]} · {formatCurrency(summary?.outflowByStatus[st] ?? 0)}
												</div>
											{/if}
										</div>
									{/each}
								</div>
							</div>
							<span class="text-amount" style="width: 110px; text-align: right; flex-shrink: 0;">
								{formatCurrency(summary?.totalOutflow ?? 0)}
							</span>
						</div>
					{/if}
				</div>

				<!-- Lifecycle legend -->
				<div
					style="
						display: flex; gap: 14px; align-items: center; flex-wrap: wrap;
						margin-top: 16px; padding-top: 12px; border-top: 1px solid hsl(var(--border));
					"
				>
					{#each (['closed', 'active', 'plan'] as const) as st}
						<div style="display: flex; align-items: center; gap: 5px;">
							<div style="width: 11px; height: 11px; border-radius: 2px; background: hsl(var(--foreground)); opacity: {STATUS_OPACITY[st]};"></div>
							<span class="text-caption">{STATUS_LABEL[st]}</span>
						</div>
					{/each}
					<span class="text-caption" style="opacity: 0.65;">· fade = projected, solid = realized · hover a segment for its value</span>
				</div>
			</div>

			<!-- ── Breakdown by Tag card ─────────────────────────────────────────── -->
			<div
				style="
					background: hsl(var(--card)); border: 1px solid hsl(var(--border));
					border-radius: var(--radius); padding: 18px 20px; margin-bottom: 14px;
				"
			>
				<div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 16px;">
					<div class="text-section-heading">
						{filter.tagIds.length > 0 ? 'Co-occurring Tags' : 'Breakdown by Tag'}
					</div>
					<span class="text-caption">
						{summary.byTag.length} tag{summary.byTag.length !== 1 ? 's' : ''}
					</span>
				</div>

				{#if summary.byTag.length === 0}
					<div class="text-caption" style="padding: 12px 0;">
						{filter.tagIds.length > 0
							? 'These records carry no other tags.'
							: 'No tagged records in this selection.'}
					</div>
				{:else}
					<div>
						<div style="display: flex; flex-direction: column; gap: 8px;">
							{#each summary.byTag as ts}
								{@const total = ts.inflow + ts.outflow}
								{@const tag = tagStatToTag(ts)}
								<div style="display: flex; align-items: center; gap: 10px;">
									<div style="width: 90px; flex-shrink: 0;">
										<TagBadge {tag} />
									</div>
									<TagSplitBar inflow={ts.inflow} outflow={ts.outflow} max={tagMax} />
									<span class="text-amount" style="width: 100px; text-align: right; flex-shrink: 0; font-size: 13px;">
										{formatCurrency(total)}
									</span>
								</div>
							{/each}
						</div>

						<!-- Tag chart legend — adapts to type axis -->
						<div
							style="
								display: flex; gap: 14px; align-items: center; flex-wrap: wrap;
								margin-top: 14px; padding-top: 12px; border-top: 1px solid hsl(var(--border));
							"
						>
							{#if filter.recordType !== 'inflow'}
								<div style="display: flex; align-items: center; gap: 5px;">
									<div style="width: 11px; height: 11px; border-radius: 2px; background: hsl(var(--outflow));"></div>
									<span class="text-caption">Outflow</span>
								</div>
							{/if}
							{#if filter.recordType !== 'outflow'}
								<div style="display: flex; align-items: center; gap: 5px;">
									<div style="width: 11px; height: 11px; border-radius: 2px; background: hsl(var(--inflow));"></div>
									<span class="text-caption">Inflow</span>
								</div>
							{/if}
							<span class="text-caption" style="opacity: 0.65;">· hover a segment for its value</span>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>
