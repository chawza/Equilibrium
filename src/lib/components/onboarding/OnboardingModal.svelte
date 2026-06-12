<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from '@lucide/svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
		width?: number;
		children: Snippet;
	}

	let { open, onclose, width = 460, children }: Props = $props();
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		style="
			position: fixed; inset: 0; z-index: 500;
			display: flex; align-items: center; justify-content: center;
			padding: 24px;
			background: rgba(9, 11, 16, 0.55);
			backdrop-filter: blur(2px);
			animation: onbOverlayIn 0.15s ease-out;
		"
	>
		<!-- Panel -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			onclick={(e) => e.stopPropagation()}
			style="
				width: {width}px;
				max-width: 100%;
				max-height: calc(100vh - 80px);
				overflow-y: auto;
				background: hsl(var(--card));
				border: 1px solid hsl(var(--border));
				border-radius: calc(var(--radius) + 2px);
				box-shadow: 0 16px 48px hsl(var(--foreground) / 0.12), 0 4px 16px hsl(var(--foreground) / 0.06);
				animation: onbDialogIn 0.18s ease-out;
				position: relative;
			"
		>
			<!-- Close button (top-right) -->
			<button
				type="button"
				onclick={onclose}
				aria-label="Close"
				style="
					position: absolute; top: 14px; right: 14px;
					width: 28px; height: 28px;
					display: flex; align-items: center; justify-content: center;
					border: none; background: transparent; border-radius: 6px;
					cursor: pointer; color: hsl(var(--muted-foreground));
					transition: background 0.12s, color 0.12s;
					z-index: 1;
				"
				onmouseenter={(e) => {
					(e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--accent))';
					(e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--foreground))';
				}}
				onmouseleave={(e) => {
					(e.currentTarget as HTMLButtonElement).style.background = 'transparent';
					(e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--muted-foreground))';
				}}
			>
				<X size={16} />
			</button>

			{@render children()}
		</div>
	</div>
{/if}

<style>
	@keyframes onbOverlayIn {
		from { opacity: 0; }
		to   { opacity: 1; }
	}
	@keyframes onbDialogIn {
		from { opacity: 0; transform: scale(0.97) translateY(6px); }
		to   { opacity: 1; transform: scale(1) translateY(0); }
	}
</style>
