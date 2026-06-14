<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		message: string;
		onconfirm: () => void;
		children: import('svelte').Snippet;
	}

	let { message, onconfirm, children }: Props = $props();

	let open = $state(false);
	let openBelow = $state(false);
	let containerEl: HTMLDivElement;

	function handleOutsideClick(e: MouseEvent) {
		if (containerEl && !containerEl.contains(e.target as Node)) {
			open = false;
		}
	}

	function handleOpen(e: MouseEvent) {
		e.stopPropagation();
		if (containerEl) {
			const rect = containerEl.getBoundingClientRect();
			openBelow = rect.top < 160;
		}
		open = true;
	}

	onMount(() => {
		document.addEventListener('mousedown', handleOutsideClick);
	});
	onDestroy(() => {
		document.removeEventListener('mousedown', handleOutsideClick);
	});
</script>

<div bind:this={containerEl} style="position: relative; display: inline-flex;">
	<div onclick={handleOpen}>
		{@render children()}
	</div>
	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			onclick={(e) => e.stopPropagation()}
			style="
				position: absolute;
				{openBelow ? 'top: 100%; margin-top: 6px;' : 'bottom: 100%; margin-bottom: 6px;'}
				right: 0;
				padding: 12px 14px;
				background: hsl(var(--popover)); border: 1px solid hsl(var(--border));
				border-radius: var(--radius); box-shadow: 0 4px 16px rgba(0,0,0,0.1);
				z-index: 50; width: 200px;
			"
		>
			<div style="font-size: 13px; margin-bottom: 10px; color: hsl(var(--foreground));">
				{message}
			</div>
			<div style="display: flex; gap: 6px; justify-content: flex-end;">
				<button
					onclick={() => (open = false)}
					aria-label="Cancel"
					style="
						font-size: 12px; font-weight: 500; padding: 4px 10px;
						border-radius: 5px; border: none;
						background: transparent; color: hsl(var(--muted-foreground));
						cursor: pointer;
					"
					onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--secondary))'; }}
					onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
				>
					Cancel
				</button>
				<button
					onclick={() => { onconfirm(); open = false; }}
					aria-label="Confirm delete"
					style="
						font-size: 12px; font-weight: 500; padding: 4px 10px;
						border-radius: 5px; border: none;
						background: hsl(var(--destructive));
						color: hsl(var(--destructive-foreground));
						cursor: pointer;
					"
				>
					Delete
				</button>
			</div>
		</div>
	{/if}
</div>
