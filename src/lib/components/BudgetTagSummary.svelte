<script lang="ts">
	import TagBadge from './TagBadge.svelte';
	import { formatCurrency } from '$lib/utils/format';
	import type { Record as BudgetRec, Tag } from '$lib/types';

	interface TagSummaryRow {
		tag: Tag;
		inflow: number;
		outflow: number;
		total: number;
	}

	interface Props {
		records: BudgetRec[];
	}

	let { records }: Props = $props();

	const rows = $derived.by<TagSummaryRow[]>(() => {
		const totals = new Map<number, TagSummaryRow>();
		for (const record of records) {
			for (const tag of record.tags) {
				const current = totals.get(tag.id) ?? { tag, inflow: 0, outflow: 0, total: 0 };
				const next = {
					...current,
					tag,
					[record.type]: current[record.type] + record.amount,
					total: current.total + record.amount
				};
				totals.set(tag.id, next);
			}
		}
		return Array.from(totals.values()).sort((a, b) => b.total - a.total);
	});

	const maxTotal = $derived(Math.max(0, ...rows.map((row) => row.total)));

	function pct(amount: number): number {
		return maxTotal > 0 ? (amount / maxTotal) * 100 : 0;
	}
</script>

<section style="margin-top: 40px;">
	<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
		<h2 class="text-section-heading" style="flex-shrink: 0;">By tag</h2>
		<div style="flex: 1; height: 1px; background: hsl(var(--border));"></div>
		<div style="display: flex; align-items: center; gap: 14px; flex-shrink: 0;">
			<span style="display: inline-flex; align-items: center; gap: 5px;">
				<span style="width: 8px; height: 8px; border-radius: 2px; background: hsl(var(--inflow));"></span>
				<span style="font-size: 11px; color: hsl(var(--muted-foreground));">Inflow</span>
			</span>
			<span style="display: inline-flex; align-items: center; gap: 5px;">
				<span style="width: 8px; height: 8px; border-radius: 2px; background: hsl(var(--outflow));"></span>
				<span style="font-size: 11px; color: hsl(var(--muted-foreground));">Outflow</span>
			</span>
		</div>
	</div>

	<div
		style="
			padding: 16px 20px;
			background: hsl(var(--card)); border: 1px solid hsl(var(--border));
			border-radius: var(--radius);
		"
	>
		{#if rows.length === 0}
			<div
				data-e2e="budget-tag-summary-empty"
				style="
					padding: 6px 0; font-size: 13px; line-height: 1.4;
					color: hsl(var(--muted-foreground)); text-align: center;
				"
			>
				No tagged records yet.
			</div>
		{:else}
			<div style="display: flex; flex-direction: column; gap: 14px;">
				{#each rows as row (row.tag.id)}
					<div
						data-e2e="budget-tag-summary-row"
						data-tag-name={row.tag.name}
						style="display: flex; align-items: center; gap: 12px;"
					>
						<div style="width: 96px; flex-shrink: 0; display: flex; min-width: 0;">
							<TagBadge tag={row.tag} />
						</div>
						<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px;">
							<div style="display: flex; align-items: center; gap: 12px;">
								<span
									style="
										width: 96px; flex-shrink: 0; text-align: right;
										font-size: 12px; font-weight: 500; font-variant-numeric: tabular-nums;
										color: {row.inflow > 0 ? 'hsl(var(--inflow))' : 'hsl(var(--muted-foreground))'};
									"
								>
									{row.inflow > 0 ? formatCurrency(row.inflow) : '-'}
								</span>
								<div
									style="
										flex: 1; min-width: 0; height: 7px; border-radius: 9999px;
										background: hsl(var(--secondary)); overflow: hidden;
									"
								>
									{#if row.inflow > 0}
										<div
											style="
												width: {Math.max(pct(row.inflow), 1.5)}%; height: 100%;
												border-radius: 9999px; background: hsl(var(--inflow));
												transition: width 0.3s ease;
											"
										></div>
									{/if}
								</div>
							</div>

							<div style="display: flex; align-items: center; gap: 12px;">
								<span
									style="
										width: 96px; flex-shrink: 0; text-align: right;
										font-size: 12px; font-weight: 500; font-variant-numeric: tabular-nums;
										color: {row.outflow > 0 ? 'hsl(var(--outflow))' : 'hsl(var(--muted-foreground))'};
									"
								>
									{row.outflow > 0 ? formatCurrency(row.outflow) : '-'}
								</span>
								<div
									style="
										flex: 1; min-width: 0; height: 7px; border-radius: 9999px;
										background: hsl(var(--secondary)); overflow: hidden;
									"
								>
									{#if row.outflow > 0}
										<div
											style="
												width: {Math.max(pct(row.outflow), 1.5)}%; height: 100%;
												border-radius: 9999px; background: hsl(var(--outflow));
												transition: width 0.3s ease;
											"
										></div>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>
