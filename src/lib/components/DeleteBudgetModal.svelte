<script lang="ts">
	import { Trash2 } from '@lucide/svelte';
	import type { BudgetSummary } from '$lib/types';

	interface Props {
		budget: BudgetSummary;
		/** Total record count, provided by caller from the summary list (no records in BudgetSummary). */
		recordCount?: number;
		oncancel: () => void;
		onconfirm: () => void;
	}

	let { budget, recordCount = 0, oncancel, onconfirm }: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') { e.stopPropagation(); oncancel(); }
	}

	const recordLabel = $derived(
		recordCount > 0
			? ` and its ${recordCount} record${recordCount !== 1 ? 's' : ''}`
			: ''
	);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	onclick={(e) => { if (e.target === e.currentTarget) oncancel(); }}
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	onkeydown={handleKeydown}
	style="
		position: fixed; inset: 0; z-index: 500;
		display: flex; align-items: center; justify-content: center; padding: 24px;
		background: rgba(9,11,16,0.55); backdrop-filter: blur(2px);
		animation: onbOverlayIn 0.15s ease-out;
	"
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		onclick={(e) => e.stopPropagation()}
		style="
			width: 100%; max-width: 400px;
			background: hsl(var(--card));
			border: 1px solid hsl(var(--border));
			border-radius: calc(var(--radius) + 2px);
			box-shadow: 0 14px 44px rgba(0,0,0,0.28);
			overflow: hidden;
		"
	>
		<!-- Body -->
		<div style="padding: 22px 22px 18px;">
			<div style="display: flex; align-items: center; gap: 11px; margin-bottom: 12px;">
				<div style="
					width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0;
					display: flex; align-items: center; justify-content: center;
					background: hsl(var(--destructive) / 0.12);
				">
					<Trash2 size={17} color="hsl(var(--destructive))" />
				</div>
				<div class="text-section-heading">Delete budget</div>
			</div>
			<p class="text-caption" style="line-height: 1.6; margin: 0;">
				"{budget.name}"{recordLabel} will be permanently deleted. This can't be undone.
			</p>
		</div>

		<!-- Footer -->
		<div style="
			display: flex; justify-content: flex-end; gap: 8px;
			padding: 12px 18px;
			border-top: 1px solid hsl(var(--border));
			background: hsl(var(--muted) / 0.3);
		">
			<button
				type="button"
				onclick={oncancel}
				style="
					font-size: 13px; font-weight: 500; padding: 5px 12px;
					border-radius: 6px; border: none;
					background: transparent; color: hsl(var(--muted-foreground));
					cursor: pointer; font-family: inherit;
				"
				onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--secondary))'; }}
				onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={onconfirm}
				style="
					display: inline-flex; align-items: center; gap: 6px;
					font-size: 13px; font-weight: 500; padding: 5px 12px;
					border-radius: 6px; border: none;
					background: hsl(var(--destructive)); color: hsl(var(--destructive-foreground));
					cursor: pointer; font-family: inherit;
				"
			>
				<Trash2 size={14} />
				Delete
			</button>
		</div>
	</div>
</div>
