<script lang="ts">
	import { onDestroy } from 'svelte';
	import { ArrowRight } from '@lucide/svelte';
	import OnboardingModal from './OnboardingModal.svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	// ── Step state ────────────────────────────────────────────────────────────

	let step = $state(0);
	const LAST = 2;

	$effect(() => {
		if (open) step = 0;
	});

	// ── Keyboard navigation (capture phase) ──────────────────────────────────

	function onKeyCapture(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'ArrowRight') { e.stopPropagation(); step = Math.min(step + 1, LAST); }
		if (e.key === 'ArrowLeft')  { e.stopPropagation(); step = Math.max(step - 1, 0); }
		if (e.key === 'Escape')     { e.stopPropagation(); onclose(); }
	}

	$effect(() => {
		if (open) {
			document.addEventListener('keydown', onKeyCapture, true);
		} else {
			document.removeEventListener('keydown', onKeyCapture, true);
		}
	});

	onDestroy(() => {
		document.removeEventListener('keydown', onKeyCapture, true);
	});
</script>

<OnboardingModal {open} {onclose} width={560}>

	<!-- Header: glyph + title/tagline -->
	<div style="padding: 28px 28px 20px; display: flex; align-items: center; gap: 14px;">
		<!-- App logo glyph (46px, matches sidebar) -->
		<div style="
			width: 46px; height: 46px; flex-shrink: 0;
			display: flex; align-items: center; justify-content: center;
			border-radius: 10px; background: hsl(var(--foreground));
		">
			<svg width="23" height="23" viewBox="0 0 24 24" fill="none">
				<path d="M2 12h20M12 2v20" stroke="hsl(var(--background))" stroke-width="2" stroke-linecap="round" />
				<circle cx="6" cy="8" r="2" fill="#16A34A" />
				<circle cx="18" cy="16" r="2" fill="#DC2626" />
			</svg>
		</div>
		<div>
			<h2 class="text-section-heading" style="margin: 0; font-size: 19px;">Welcome to Equilibrium</h2>
			<p class="text-caption" style="margin-top: 2px;">A local-first budget that balances in and out.</p>
		</div>
	</div>

	<!-- Divider below header -->
	<div style="border-top: 1px solid hsl(var(--border));"></div>

	<!-- Slide track (overflow hidden, no padding here) -->
	<div style="overflow: hidden;">
		<div style="
			display: flex;
			width: 300%;
			transform: translateX(-{step * (100 / 3)}%);
			transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
		">
			<!-- Slide 0 — Budgets -->
			<div
				aria-hidden={0 !== step}
				style="
					width: 33.3333%;
					flex-shrink: 0;
					display: flex; flex-direction: column; align-items: center;
					text-align: center;
					padding: 34px 48px 30px;
					opacity: {0 === step ? 1 : 0.35};
					transition: opacity 0.42s ease;
				"
			>
				<!-- BigGraphic: ConceptBudgets scaled 2.5× -->
				<div style="width: {72 * 2.5}px; height: {60 * 2.5}px; display: flex; align-items: center; justify-content: center;">
					<div style="transform: scale(2.5); transform-origin: center;">
						<!-- ConceptFrame -->
						<div style="
							width: 72px; height: 60px;
							display: flex; align-items: center; justify-content: center;
							border-radius: 10px;
							background: hsl(var(--secondary) / 0.55);
							border: 1px solid hsl(var(--border));
						">
							<!-- Stacked period cards -->
							<div style="position: relative; width: 56px; height: 44px;">
								<div style="position:absolute; top:0; left:14px; width:40px; height:30px; z-index:1; border-radius:5px; background:hsl(var(--card)); border:1px solid hsl(var(--border)); opacity:0.55; box-shadow:0 1px 2px hsl(var(--foreground)/0.06);"></div>
								<div style="position:absolute; top:4px; left:7px; width:40px; height:30px; z-index:2; border-radius:5px; background:hsl(var(--card)); border:1px solid hsl(var(--border)); opacity:0.55; box-shadow:0 1px 2px hsl(var(--foreground)/0.06);"></div>
								<div style="position:absolute; top:8px; left:0; width:40px; height:30px; z-index:3; border-radius:5px; background:hsl(var(--card)); border:1px solid hsl(var(--border)); padding:5px; box-shadow:0 1px 2px hsl(var(--foreground)/0.06);">
									<div style="display:flex; gap:2.5px; margin-bottom:4px;">
										<span style="width:4px; height:4px; border-radius:50%; background:hsl(var(--inflow));"></span>
										<span style="width:14px; height:4px; border-radius:2px; background:hsl(var(--muted-foreground)/0.35);"></span>
									</div>
									<div style="height:5px; border-radius:3px; background:hsl(var(--secondary)); overflow:hidden;">
										<div style="width:62%; height:100%; background:hsl(var(--inflow));"></div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="text-section-heading" style="font-size: 20px; margin-top: 30px; margin-bottom: 8px;">Budgets</div>
				<div class="text-caption" style="font-size: 14.5px; line-height: 1.6; text-wrap: pretty; max-width: 360px;">
					Each budget covers one period — usually a month. Plan it, track it, then close it out.
				</div>
			</div>

			<!-- Slide 1 — Inflow & Outflow -->
			<div
				aria-hidden={1 !== step}
				style="
					width: 33.3333%;
					flex-shrink: 0;
					display: flex; flex-direction: column; align-items: center;
					text-align: center;
					padding: 34px 48px 30px;
					opacity: {1 === step ? 1 : 0.35};
					transition: opacity 0.42s ease;
				"
			>
				<!-- BigGraphic: ConceptFlow scaled 2.5× -->
				<div style="width: {72 * 2.5}px; height: {60 * 2.5}px; display: flex; align-items: center; justify-content: center;">
					<div style="transform: scale(2.5); transform-origin: center;">
						<div style="
							width: 72px; height: 60px;
							display: flex; align-items: center; justify-content: center;
							border-radius: 10px;
							background: hsl(var(--secondary) / 0.55);
							border: 1px solid hsl(var(--border));
						">
							<!-- Mini T-account -->
							<div style="
								display:flex; width:54px; height:42px;
								border:1px solid hsl(var(--border)); border-radius:5px;
								background:hsl(var(--card)); overflow:hidden;
							">
								<div style="flex:1; padding:5px 5px 0;">
									<span style="display:block; width:11px; height:3.5px; border-radius:2px; background:hsl(var(--inflow)); margin-bottom:5px;"></span>
									<div style="display:flex; align-items:center; justify-content:space-between; gap:4px; margin-bottom:3px;">
										<span style="width:9px; height:3px; border-radius:2px; background:hsl(var(--muted-foreground)/0.35);"></span>
										<span style="width:12px; height:3px; border-radius:2px; background:hsl(var(--inflow));"></span>
									</div>
								</div>
								<div style="width:1px; background:hsl(var(--border));"></div>
								<div style="flex:1; padding:5px 5px 0;">
									<span style="display:block; width:11px; height:3.5px; border-radius:2px; background:hsl(var(--outflow)); margin-bottom:5px; margin-left:auto;"></span>
									<div style="display:flex; align-items:center; justify-content:space-between; gap:4px; margin-bottom:3px;">
										<span style="width:9px; height:3px; border-radius:2px; background:hsl(var(--muted-foreground)/0.35);"></span>
										<span style="width:8px; height:3px; border-radius:2px; background:hsl(var(--outflow));"></span>
									</div>
									<div style="display:flex; align-items:center; justify-content:space-between; gap:4px; margin-bottom:3px;">
										<span style="width:9px; height:3px; border-radius:2px; background:hsl(var(--muted-foreground)/0.35);"></span>
										<span style="width:11px; height:3px; border-radius:2px; background:hsl(var(--outflow));"></span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="text-section-heading" style="font-size: 20px; margin-top: 30px; margin-bottom: 8px;">Inflow &amp; Outflow</div>
				<div class="text-caption" style="font-size: 14.5px; line-height: 1.6; text-wrap: pretty; max-width: 360px;">
					Every budget is a T-account: money in on the left, money out on the right. The balance is always visible.
				</div>
			</div>

			<!-- Slide 2 — Tags -->
			<div
				aria-hidden={2 !== step}
				style="
					width: 33.3333%;
					flex-shrink: 0;
					display: flex; flex-direction: column; align-items: center;
					text-align: center;
					padding: 34px 48px 30px;
					opacity: {2 === step ? 1 : 0.35};
					transition: opacity 0.42s ease;
				"
			>
				<!-- BigGraphic: ConceptTags scaled 2.5× -->
				<div style="width: {72 * 2.5}px; height: {60 * 2.5}px; display: flex; align-items: center; justify-content: center;">
					<div style="transform: scale(2.5); transform-origin: center;">
						<div style="
							width: 72px; height: 60px;
							display: flex; align-items: center; justify-content: center;
							border-radius: 10px;
							background: hsl(var(--secondary) / 0.55);
							border: 1px solid hsl(var(--border));
						">
							<!-- Stacked tag chips -->
							<div style="position:relative; width:52px; height:44px;">
								<div style="position:absolute; top:0; left:6px; display:flex; align-items:center; gap:4px; background:hsl(var(--card)); border:1px solid hsl(var(--border)); border-radius:20px; padding:3px 7px; opacity:0.55;">
									<span style="width:5px; height:5px; border-radius:50%; background:hsl(210 70% 55%);"></span>
									<span style="width:16px; height:3px; border-radius:2px; background:hsl(var(--muted-foreground)/0.5);"></span>
								</div>
								<div style="position:absolute; top:14px; left:0; display:flex; align-items:center; gap:4px; background:hsl(var(--card)); border:1px solid hsl(var(--border)); border-radius:20px; padding:3px 7px; opacity:0.75;">
									<span style="width:5px; height:5px; border-radius:50%; background:hsl(340 65% 50%);"></span>
									<span style="width:20px; height:3px; border-radius:2px; background:hsl(var(--muted-foreground)/0.5);"></span>
								</div>
								<div style="position:absolute; top:28px; left:4px; display:flex; align-items:center; gap:4px; background:hsl(var(--card)); border:1px solid hsl(var(--border)); border-radius:20px; padding:3px 7px;">
									<span style="width:5px; height:5px; border-radius:50%; background:hsl(32 90% 50%);"></span>
									<span style="width:14px; height:3px; border-radius:2px; background:hsl(var(--muted-foreground)/0.5);"></span>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="text-section-heading" style="font-size: 20px; margin-top: 30px; margin-bottom: 8px;">Tags</div>
				<div class="text-caption" style="font-size: 14.5px; line-height: 1.6; text-wrap: pretty; max-width: 360px;">
					Label records to see where money actually goes — totals roll up across budgets in Stats.
				</div>
			</div>
		</div>
	</div>

	<!-- Footer: divider + dots + nav -->
	<div style="
		display: flex; align-items: center; justify-content: space-between; gap: 12px;
		padding: 16px 28px 22px;
		border-top: 1px solid hsl(var(--border));
	">
		<!-- Progress dots -->
		<div style="display: flex; align-items: center; gap: 7px;">
			{#each [0, 1, 2] as i}
				<button
					type="button"
					onclick={() => (step = i)}
					aria-label="Go to slide {i + 1}"
					style="
						width: {step === i ? '22px' : '7px'};
						height: 7px;
						padding: 0; border: none; cursor: pointer;
						border-radius: 999px;
						background: {step === i ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground) / 0.35)'};
						transition: width 0.3s ease, background 0.3s ease;
					"
				></button>
			{/each}
		</div>

		<!-- Nav buttons -->
		<div style="display: flex; align-items: center; gap: 8px;">
			{#if step > 0}
				<button
					type="button"
					onclick={() => (step = Math.max(step - 1, 0))}
					style="
						font-size: 13px; font-weight: 500; padding: 7px 16px;
						border-radius: 7px; border: 1px solid hsl(var(--border));
						background: transparent; color: hsl(var(--foreground));
						cursor: pointer;
					"
					onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--secondary))'; }}
					onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
				>Back</button>
			{/if}
			{#if step < LAST}
				<button
					type="button"
					onclick={() => (step = Math.min(step + 1, LAST))}
					style="
						font-size: 13px; font-weight: 500; padding: 7px 16px;
						border-radius: 7px; border: none;
						background: hsl(var(--foreground)); color: hsl(var(--background));
						cursor: pointer;
						display: flex; align-items: center; gap: 6px;
					"
					onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
					onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
				>Next <ArrowRight size={15} /></button>
			{:else}
				<button
					type="button"
					onclick={onclose}
					style="
						font-size: 13px; font-weight: 500; padding: 7px 16px;
						border-radius: 7px; border: none;
						background: hsl(var(--foreground)); color: hsl(var(--background));
						cursor: pointer;
						display: flex; align-items: center; gap: 6px;
					"
					onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
					onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
				>Get started <ArrowRight size={15} /></button>
			{/if}
		</div>
	</div>

</OnboardingModal>
