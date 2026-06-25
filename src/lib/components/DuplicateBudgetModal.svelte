<script lang="ts">
	import { Copy } from '@lucide/svelte';
	import type { BudgetSummary } from '$lib/types';

	interface Props {
		source: BudgetSummary;
		oncancel: () => void;
		/** Called with the user-chosen name and ISO dates. */
		onconfirm: (name: string, startDate: string, endDate: string) => void;
	}

	let { source, oncancel, onconfirm }: Props = $props();

	// Pre-fill from source (dates are already ISO YYYY-MM-DD in the real app).
	let name = $state(`${source.name} (copy)`);
	let start = $state(source.startDate);
	let end = $state(source.endDate);
	let error = $state('');

	function submit() {
		const trimmed = name.trim();
		if (!trimmed) { error = 'Give the new budget a name.'; return; }
		if (!start || !end) { error = 'Both a start and end date are required.'; return; }
		if (end < start) { error = 'The end date must be on or after the start date.'; return; }
		error = '';
		onconfirm(trimmed, start, end);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') { e.stopPropagation(); oncancel(); }
	}
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
			width: 100%; max-width: 440px;
			background: hsl(var(--card));
			border: 1px solid hsl(var(--border));
			border-radius: calc(var(--radius) + 2px);
			box-shadow: 0 14px 44px rgba(0,0,0,0.28);
			overflow: hidden;
		"
	>
		<!-- Header -->
		<div style="padding: 20px 22px 8px;">
			<div style="display: flex; align-items: center; gap: 11px; margin-bottom: 4px;">
				<div style="
					width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0;
					display: flex; align-items: center; justify-content: center;
					background: hsl(var(--accent));
				">
					<Copy size={16} color="hsl(var(--foreground))" />
				</div>
				<div>
					<div class="text-section-heading">Duplicate budget</div>
					<div class="text-caption">
						Copies records from "{source.name}" into a new plan.
					</div>
				</div>
			</div>
		</div>

		<!-- Form -->
		<div style="padding: 12px 22px 20px;">
			<!-- Name -->
			<div style="margin-bottom: 14px;">
				<label
					for="dup-name"
					style="display: block; font-size: 12px; font-weight: 500; color: hsl(var(--muted-foreground)); margin-bottom: 6px;"
				>
					Title
				</label>
				<input
					id="dup-name"
					type="text"
					bind:value={name}
					placeholder="Budget name"
					autofocus
					onkeydown={(e) => { if (e.key === 'Enter') submit(); }}
					style="
						height: 34px; width: 100%; padding: 0 10px;
						font-size: 13px; font-family: inherit;
						border: 1px solid hsl(var(--input)); border-radius: var(--radius);
						background: hsl(var(--background)); color: hsl(var(--foreground));
						outline: none; box-sizing: border-box;
					"
				/>
			</div>

			<!-- Dates -->
			<div style="display: flex; gap: 12px; margin-bottom: 12px;">
				<div style="flex: 1;">
					<label
						for="dup-start"
						style="display: block; font-size: 12px; font-weight: 500; color: hsl(var(--muted-foreground)); margin-bottom: 6px;"
					>
						Start date
					</label>
					<input
						id="dup-start"
						type="date"
						bind:value={start}
						max={end || undefined}
						style="
							height: 34px; width: 100%; padding: 0 10px;
							font-size: 13px; font-family: inherit;
							border: 1px solid hsl(var(--input)); border-radius: var(--radius);
							background: hsl(var(--background)); color: hsl(var(--foreground));
							outline: none; cursor: pointer; box-sizing: border-box;
							color-scheme: light dark;
						"
					/>
				</div>
				<div style="flex: 1;">
					<label
						for="dup-end"
						style="display: block; font-size: 12px; font-weight: 500; color: hsl(var(--muted-foreground)); margin-bottom: 6px;"
					>
						End date
					</label>
					<input
						id="dup-end"
						type="date"
						bind:value={end}
						min={start || undefined}
						style="
							height: 34px; width: 100%; padding: 0 10px;
							font-size: 13px; font-family: inherit;
							border: 1px solid hsl(var(--input)); border-radius: var(--radius);
							background: hsl(var(--background)); color: hsl(var(--foreground));
							outline: none; cursor: pointer; box-sizing: border-box;
							color-scheme: light dark;
						"
					/>
				</div>
			</div>

			<!-- Inline error -->
			{#if error}
				<p style="font-size: 12px; color: hsl(var(--destructive)); margin: 0 0 10px 0;">
					{error}
				</p>
			{/if}
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
				onclick={submit}
				style="
					display: inline-flex; align-items: center; gap: 6px;
					font-size: 13px; font-weight: 500; padding: 5px 12px;
					border-radius: 6px; border: none;
					background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
					cursor: pointer; font-family: inherit;
				"
			>
				<Copy size={14} />
				Duplicate
			</button>
		</div>
	</div>
</div>
