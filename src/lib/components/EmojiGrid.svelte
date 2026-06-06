<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ALL_EMOJIS } from '$lib/constants/emoji';

	interface Props {
		selected: string;
		suggested: string;
		onselect: (emoji: string) => void;
		onclose: () => void;
	}

	let { selected, suggested, onselect, onclose }: Props = $props();

	let containerEl: HTMLDivElement;

	function handleOutsideClick(e: MouseEvent) {
		if (containerEl && !containerEl.contains(e.target as Node)) {
			onclose();
		}
	}

	onMount(() => {
		document.addEventListener('mousedown', handleOutsideClick);
	});
	onDestroy(() => {
		document.removeEventListener('mousedown', handleOutsideClick);
	});
</script>

<div
	bind:this={containerEl}
	style="
		position: absolute; top: 100%; left: 0; margin-top: 4px;
		padding: 10px; width: 220px;
		background: hsl(var(--popover)); border: 1px solid hsl(var(--border));
		border-radius: var(--radius); box-shadow: 0 4px 16px rgba(0,0,0,0.1);
		z-index: 60;
	"
>
	{#if suggested && suggested !== '📝'}
		<div style="margin-bottom: 8px;">
			<div style="font-size: 11px; color: hsl(var(--muted-foreground)); margin-bottom: 4px;">Suggested</div>
			<button
				type="button"
				onclick={() => onselect(suggested)}
				style="
					width: 34px; height: 34px;
					display: flex; align-items: center; justify-content: center;
					border: {suggested === selected ? '2px solid hsl(var(--ring))' : '1px solid hsl(var(--border))'};
					border-radius: 6px;
					background: hsl(var(--secondary)); cursor: pointer; font-size: 16px;
				"
			>
				{suggested}
			</button>
		</div>
	{/if}

	<div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 3px; max-height: 192px; overflow-y: auto;">
		{#each ALL_EMOJIS as emoji}
			<button
				type="button"
				onclick={() => onselect(emoji)}
				style="
					width: 32px; height: 32px;
					display: flex; align-items: center; justify-content: center;
					border: {emoji === selected ? '2px solid hsl(var(--ring))' : '1px solid transparent'};
					border-radius: 6px;
					background: {emoji === selected ? 'hsl(var(--accent))' : 'transparent'};
					cursor: pointer; font-size: 15px; transition: background 0.1s;
				"
				onmouseenter={(e) => { if (emoji !== selected) (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))'; }}
				onmouseleave={(e) => { if (emoji !== selected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
			>
				{emoji}
			</button>
		{/each}
	</div>
</div>
