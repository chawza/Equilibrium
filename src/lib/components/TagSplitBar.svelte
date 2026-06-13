<script lang="ts">
	import { formatCurrency } from '$lib/utils/format';

	interface Props {
		inflow: number;
		outflow: number;
		max: number;
	}

	let { inflow, outflow, max }: Props = $props();

	const total = $derived(inflow + outflow);
	const totalPct = $derived(max > 0 ? (total / max) * 100 : 0);

	// Build the two segments: outflow first, then inflow; skip zeros.
	const allSegs = $derived.by(() => {
		const segs = [
			{ type: 'outflow' as const, val: outflow, color: 'hsl(var(--outflow))', label: 'Outflow' },
			{ type: 'inflow' as const, val: inflow, color: 'hsl(var(--inflow))', label: 'Inflow' }
		].filter((s) => s.val > 0);
		let cum = 0;
		return segs.map((s) => {
			const share = total > 0 ? s.val / total : 0;
			const placed = { ...s, left: cum, width: share };
			cum += share;
			return placed;
		});
	});

	let hoveredType = $state<'outflow' | 'inflow' | null>(null);
	const hoveredSeg = $derived(allSegs.find((s) => s.type === hoveredType) ?? null);
</script>

<!-- Bar track -->
<div
	style="
		flex: 1; position: relative; height: 20px;
		border-radius: 4px; background: hsl(var(--secondary));
	"
>
	<!-- Fill container (total width relative to max) -->
	<div
		style="
			position: absolute; top: 0; left: 0; height: 100%;
			width: {totalPct}%; min-width: {total > 0 ? 3 : 0}px;
			border-radius: 4px; overflow: hidden; display: flex;
			transition: width 0.3s;
		"
	>
		{#each allSegs as seg, i}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				style="
					width: {seg.width * 100}%; height: 100%;
					background: {seg.color};
					opacity: {hoveredType && hoveredType !== seg.type ? 0.5 : 1};
					transition: opacity 0.15s;
					{i > 0 ? 'box-shadow: inset 1.5px 0 0 hsl(var(--card));' : ''}
				"
				onmouseenter={() => (hoveredType = seg.type)}
				onmouseleave={() => (hoveredType = null)}
			></div>
		{/each}
	</div>

	<!-- Hover tooltip -->
	{#if hoveredSeg}
		<div
			style="
				position: absolute; bottom: calc(100% + 6px); left: 50%;
				transform: translateX(-50%);
				background: hsl(var(--popover)); border: 1px solid hsl(var(--border));
				border-radius: 6px; padding: 5px 10px;
				font-size: 12px; font-weight: 500; color: hsl(var(--foreground));
				white-space: nowrap; box-shadow: 0 2px 8px hsl(var(--foreground) / 0.08);
				z-index: 10; pointer-events: none;
			"
		>
			{hoveredSeg.label} · {formatCurrency(hoveredSeg.val)}
		</div>
	{/if}
</div>
