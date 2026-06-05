<script lang="ts">
	import { X } from '@lucide/svelte';
	import { tagStyle } from '$lib/constants/tag-colors';
	import { themeStore } from '$lib/stores/theme.svelte';
	import type { Tag } from '$lib/types';

	interface Props {
		tag: Tag;
		removable?: boolean;
		onremove?: () => void;
	}

	let { tag, removable = false, onremove }: Props = $props();

	let cs = $derived(tagStyle(tag.color, themeStore.value === 'dark'));
</script>

<span
	style="
		display: inline-flex; align-items: center; gap: 5px;
		padding: {removable ? '2px 5px 2px 9px' : '2px 9px'}; border-radius: 9999px;
		font-size: 12px; font-weight: 500; line-height: 18px; white-space: nowrap;
		background: {cs.fill}; color: {cs.text};
	"
>
	<span style="width: 6px; height: 6px; border-radius: 50%; background: {cs.dot}; flex-shrink: 0;"></span>
	{tag.name}
	{#if removable && onremove}
		<button
			type="button"
			onclick={(e) => { e.stopPropagation(); onremove?.(); }}
			style="
				display: inline-flex; align-items: center; justify-content: center;
				width: 15px; height: 15px; border-radius: 50%; border: none;
				background: transparent; color: {cs.text}; cursor: pointer;
				padding: 0; opacity: 0.6; transition: opacity 0.1s;
			"
			onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
			onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.6'; }}
			aria-label="Remove tag"
		>
			<X size={10} />
		</button>
	{/if}
</span>
