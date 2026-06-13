<script lang="ts">
	import { Check } from '@lucide/svelte';
	import { TAG_COLORS } from '$lib/constants/tag-colors';
	import type { ColorKey } from '$lib/types';

	interface Props {
		value: ColorKey;
		onchange: (c: ColorKey) => void;
	}

	let { value, onchange }: Props = $props();

	const colors = Object.keys(TAG_COLORS) as ColorKey[];
</script>

<div style="display: flex; flex-wrap: wrap; gap: 7px;">
	{#each colors as c}
		{@const dot = TAG_COLORS[c].dot}
		{@const selected = c === value}
		<button
			type="button"
			title={c}
			onclick={() => onchange(c)}
			style="
				width: 24px; height: 24px; border-radius: 50%;
				background: {dot}; border: none; cursor: pointer; padding: 0;
				display: flex; align-items: center; justify-content: center;
				outline: {selected ? '2px solid hsl(var(--foreground))' : '2px solid transparent'};
				outline-offset: 2px; transition: outline-color 0.12s;
			"
		>
			{#if selected}
				<Check size={12} color="#fff" />
			{/if}
		</button>
	{/each}
</div>
