<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Copy, Trash2 } from '@lucide/svelte';

	interface Props {
		x: number;
		y: number;
		onclose: () => void;
		onduplicate: () => void;
		ondelete: () => void;
	}

	let { x, y, onclose, onduplicate, ondelete }: Props = $props();

	// After mount, clamp to viewport so the menu never overflows the window edge.
	let menuEl: HTMLDivElement;
	let posX = $state(x);
	let posY = $state(y);

	onMount(() => {
		if (menuEl) {
			const r = menuEl.getBoundingClientRect();
			let nx = x;
			let ny = y;
			if (x + r.width > window.innerWidth - 8) nx = window.innerWidth - r.width - 8;
			if (y + r.height > window.innerHeight - 8) ny = window.innerHeight - r.height - 8;
			posX = Math.max(8, nx);
			posY = Math.max(8, ny);
		}

		// Close on outside click, Escape, scroll, or resize.
		function onDocClick(e: MouseEvent) {
			if (menuEl && !menuEl.contains(e.target as Node)) onclose();
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') onclose();
		}
		function onScroll() { onclose(); }
		function onResize() { onclose(); }

		document.addEventListener('mousedown', onDocClick, true);
		document.addEventListener('keydown', onKey, true);
		window.addEventListener('scroll', onScroll, true);
		window.addEventListener('resize', onResize);

		return () => {
			document.removeEventListener('mousedown', onDocClick, true);
			document.removeEventListener('keydown', onKey, true);
			window.removeEventListener('scroll', onScroll, true);
			window.removeEventListener('resize', onResize);
		};
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={menuEl}
	style="
		position: fixed; top: {posY}px; left: {posX}px; z-index: 600;
		min-width: 176px;
		background: hsl(var(--popover)); border: 1px solid hsl(var(--border));
		border-radius: var(--radius); box-shadow: 0 10px 32px rgba(0,0,0,0.18);
		padding: 4px; animation: pageEnter 0.1s ease-out;
	"
	oncontextmenu={(e) => e.preventDefault()}
>
	<!-- Duplicate -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		onclick={onduplicate}
		role="menuitem"
		tabindex="0"
		onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onduplicate(); }}
		style="
			display: flex; align-items: center; gap: 9px; padding: 7px 10px;
			font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 5px;
			color: hsl(var(--popover-foreground)); transition: background 0.1s;
		"
		onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))'; }}
		onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
	>
		<Copy size={15} color="hsl(var(--muted-foreground))" />
		Duplicate
	</div>

	<div style="border-top: 1px solid hsl(var(--border)); margin: 4px 6px;"></div>

	<!-- Delete (destructive) -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		onclick={ondelete}
		role="menuitem"
		tabindex="0"
		onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') ondelete(); }}
		style="
			display: flex; align-items: center; gap: 9px; padding: 7px 10px;
			font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 5px;
			color: hsl(var(--destructive)); transition: background 0.1s;
		"
		onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))'; }}
		onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
	>
		<Trash2 size={15} color="hsl(var(--destructive))" />
		Delete
	</div>
</div>
