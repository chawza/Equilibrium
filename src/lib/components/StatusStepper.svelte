<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Check } from '@lucide/svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { STATUS_BADGE } from '$lib/constants/status-badge';
	import type { BudgetStatus } from '$lib/types';

	interface Props {
		status: BudgetStatus;
		onchange: (status: BudgetStatus) => void;
	}

	let { status, onchange }: Props = $props();

	let open = $state(false);
	let containerEl: HTMLDivElement;

	// Lifecycle stages
	const STATUS_FLOW: { key: BudgetStatus; label: string; desc: string }[] = [
		{ key: 'plan',   label: 'Plan',   desc: 'Drafting the budget' },
		{ key: 'active', label: 'Active', desc: 'Tracking in progress' },
		{ key: 'review', label: 'Review', desc: 'Checking the results' },
		{ key: 'closed', label: 'Closed', desc: 'Finalized & archived' },
	];

	// Single-hue lifecycle palette
	const LIFE_SOLID = '#2563EB';
	const LIFE_PAST_BG = 'rgba(37,99,235,0.14)';
	const LIFE_PAST_FG = '#2563EB';
	const LIFE_RING = 'rgba(37,99,235,0.18)';

	let currentIdx = $derived(STATUS_FLOW.findIndex((s) => s.key === status));
	let mode = $derived<'light' | 'dark'>(themeStore.value === 'dark' ? 'dark' : 'light');
	let badgeColors = $derived(STATUS_BADGE[status][mode]);

	function handleOutsideClick(e: MouseEvent) {
		if (containerEl && !containerEl.contains(e.target as Node)) {
			open = false;
		}
	}

	onMount(() => {
		document.addEventListener('mousedown', handleOutsideClick);
	});
	onDestroy(() => {
		document.removeEventListener('mousedown', handleOutsideClick);
	});
</script>

<div bind:this={containerEl} style="position: relative; flex-shrink: 0;">
	<!-- Status badge trigger -->
	<button
		type="button"
		onclick={() => (open = !open)}
		style="
			display: inline-flex; align-items: center;
			padding: 2px 8px; border-radius: 9999px; border: none;
			font-size: 12px; font-weight: 500; line-height: 18px; white-space: nowrap;
			background: {badgeColors.bg}; color: {badgeColors.fg};
			cursor: pointer;
		"
	>
		{status}
	</button>

	{#if open}
		<div
			style="
				position: absolute; top: 100%; right: 0; margin-top: 8px; width: 280px;
				background: hsl(var(--popover)); border: 1px solid hsl(var(--border));
				border-radius: var(--radius); box-shadow: 0 8px 24px rgba(0,0,0,0.12);
				z-index: 60; padding: 14px 16px;
			"
		>
			<!-- Header -->
			<div
				style="
					font-size: 11px; font-weight: 600; text-transform: uppercase;
					letter-spacing: 0.06em; color: hsl(var(--muted-foreground)); margin-bottom: 14px;
				"
			>
				Budget lifecycle
			</div>

			<!-- Horizontal flow indicator -->
			<div style="display: flex; align-items: center; margin-bottom: 16px; padding: 0 2px;">
				{#each STATUS_FLOW as s, i}
					{@const isPast = i < currentIdx}
					{@const isCurrent = i === currentIdx}
					<div
						style="
							width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
							display: flex; align-items: center; justify-content: center;
							background: {isCurrent ? LIFE_SOLID : isPast ? LIFE_PAST_BG : 'transparent'};
							border: {(isPast || isCurrent) ? 'none' : '2px solid hsl(var(--border))'};
							box-shadow: {isCurrent ? `0 0 0 3px ${LIFE_RING}` : 'none'};
							transition: all 0.15s;
						"
					>
						{#if isPast}
							<Check size={10} color={LIFE_PAST_FG} />
						{:else if isCurrent}
							<div style="width: 6px; height: 6px; border-radius: 50%; background: #fff;"></div>
						{/if}
					</div>
					{#if i < STATUS_FLOW.length - 1}
						<div
							style="
								flex: 1; height: 2px; border-radius: 1px;
								background: {i < currentIdx ? LIFE_PAST_BG : 'hsl(var(--border))'};
								transition: background 0.15s;
							"
						></div>
					{/if}
				{/each}
			</div>

			<!-- Clickable stage list -->
			<div style="display: flex; flex-direction: column; gap: 1px;">
				{#each STATUS_FLOW as s, i}
					{@const isCurrent = i === currentIdx}
					{@const isPast = i < currentIdx}
					<button
						type="button"
						onclick={() => { onchange(s.key); open = false; }}
						style="
							display: flex; align-items: center; gap: 10px; padding: 7px 8px;
							border: none; border-radius: 6px; cursor: pointer; text-align: left;
							background: {isCurrent ? 'hsl(var(--accent))' : 'transparent'};
							width: 100%;
						"
						onmouseenter={(e) => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent) / 0.6)'; }}
						onmouseleave={(e) => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
					>
						<!-- Step badge -->
						<span
							style="
								width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
								display: flex; align-items: center; justify-content: center;
								font-size: 11px; font-weight: 600;
								background: {isCurrent ? LIFE_SOLID : isPast ? LIFE_PAST_BG : 'hsl(var(--secondary))'};
								color: {isCurrent ? '#fff' : isPast ? LIFE_PAST_FG : 'hsl(var(--muted-foreground))'};
							"
						>
							{#if isPast}
								<Check size={11} color={LIFE_PAST_FG} />
							{:else}
								{i + 1}
							{/if}
						</span>
						<!-- Stage text -->
						<div style="flex: 1; text-align: left;">
							<div style="font-size: 13px; font-weight: 500; color: hsl(var(--foreground));">
								{s.label}
								{#if isCurrent}
									<span
										style="font-size: 11px; font-weight: 500; color: hsl(var(--muted-foreground)); margin-left: 6px;"
									>
										· current
									</span>
								{/if}
							</div>
							<div style="font-size: 11px; color: hsl(var(--muted-foreground));">{s.desc}</div>
						</div>
					</button>
				{/each}
			</div>

			<!-- Footer note -->
			<div
				style="
					font-size: 11px; color: hsl(var(--muted-foreground));
					margin-top: 12px; padding-top: 10px;
					border-top: 1px solid hsl(var(--border)); line-height: 1.4;
				"
			>
				Stages run in order, but you can jump to any stage.
			</div>
		</div>
	{/if}
</div>
