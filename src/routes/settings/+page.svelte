<script lang="ts">
	// Settings — max-width 560px
	import { themeStore } from '$lib/stores/theme.svelte';
</script>

<div class="page-enter" style="max-width: 560px; margin: 0 auto;">
	<h1 class="text-page-title" style="margin-bottom:28px;">Settings</h1>

	<!-- Quick theme toggle for verification -->
	<div style="display:flex;align-items:center;gap:12px;padding:16px;border-radius:8px;border:1px solid hsl(var(--border));">
		<span style="font-size:14px;font-weight:500;">Dark mode</span>
		<button
			onclick={() => themeStore.toggle()}
			style="padding:6px 14px;border-radius:6px;border:none;background:hsl(var(--secondary));color:hsl(var(--secondary-foreground));cursor:pointer;font-size:13px;"
		>
			{themeStore.value === 'dark' ? 'Switch to light' : 'Switch to dark'}
		</button>
	</div>

	<p class="text-caption" style="margin-top:16px;">Settings placeholder — appearance, data, danger zone, about go here.</p>
</div>
