<script lang="ts">
	// Budget Form — max-width 800px
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ChevronLeft } from '@lucide/svelte';

	const budgetId = $derived($page.params.id);
</script>

<div class="page-enter" style="max-width: 800px; margin: 0 auto;">
	<!-- Header -->
	<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
		<button
			onclick={() => goto('/')}
			style="width:32px;height:32px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:hsl(var(--foreground));"
			aria-label="Back to budgets"
		>
			<ChevronLeft size={18} />
		</button>
		<h1 class="text-page-title">Budget #{budgetId}</h1>
	</div>
	<p class="text-caption" style="padding-left:44px;margin-bottom:28px;">Jun 1, 2026 – Jun 30, 2026</p>

	<p class="text-caption">Budget form placeholder — T-account layout, record rows, balance bar go here.</p>
</div>
