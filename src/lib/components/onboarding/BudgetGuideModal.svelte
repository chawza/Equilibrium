<script lang="ts">
	import { LayoutGrid, Plus } from '@lucide/svelte';
	import OnboardingModal from './OnboardingModal.svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();
</script>

<OnboardingModal {open} {onclose} width={440}>
	<!-- Header -->
	<div style="padding: 24px 24px 16px;">
		<!-- Icon glyph -->
		<div style="
			width: 38px; height: 38px; margin-bottom: 14px;
			display: flex; align-items: center; justify-content: center;
			border-radius: 9px; background: hsl(var(--secondary)); color: hsl(var(--foreground));
		">
			<LayoutGrid size={19} />
		</div>
		<h2 class="text-section-heading" style="margin: 0; font-size: 17px;">
			This budget is empty — let's fill it
		</h2>
		<p class="text-caption" style="margin-top: 4px; line-height: 1.55; text-wrap: pretty;">
			Equilibrium lays each budget out as a T-account. Inflow and outflow sit side by side so the balance is always obvious.
		</p>
	</div>

	<!-- Mini T-account diagram -->
	<div style="padding: 0 24px 4px;">
		<div style="
			display: flex; align-items: stretch;
			border: 1px solid hsl(var(--border)); border-radius: var(--radius);
			background: hsl(var(--background)); overflow: hidden;
		">
			<!-- Inflow column -->
			<div style="flex: 1; padding: 12px 14px;">
				<div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
					<span style="width: 7px; height: 7px; border-radius: 50%; background: hsl(var(--inflow)); opacity: 0.8;"></span>
					<span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: hsl(var(--muted-foreground));">Inflow</span>
				</div>
				<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 7px;">
					<span style="font-size: 12px; color: hsl(var(--foreground));">Salary</span>
					<span style="font-size: 12px; font-variant-numeric: tabular-nums; color: hsl(var(--inflow));">Rp ···</span>
				</div>
				<!-- Dashed add row -->
				<div style="height: 8px; border-radius: 4px; border: 1px dashed hsl(var(--border));"></div>
			</div>

			<!-- Stem -->
			<div style="width: 1px; background: hsl(var(--border));"></div>

			<!-- Outflow column -->
			<div style="flex: 1; padding: 12px 14px;">
				<div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
					<span style="width: 7px; height: 7px; border-radius: 50%; background: hsl(var(--outflow)); opacity: 0.8;"></span>
					<span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: hsl(var(--muted-foreground));">Outflow</span>
				</div>
				<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 7px;">
					<span style="font-size: 12px; color: hsl(var(--foreground));">Rent</span>
					<span style="font-size: 12px; font-variant-numeric: tabular-nums; color: hsl(var(--outflow));">Rp ···</span>
				</div>
				<!-- Dashed add row -->
				<div style="height: 8px; border-radius: 4px; border: 1px dashed hsl(var(--border));"></div>
			</div>
		</div>
	</div>

	<!-- Numbered steps -->
	<div style="padding: 16px 24px 4px; display: flex; flex-direction: column; gap: 12px;">
		<!-- Step 1 -->
		<div style="display: flex; align-items: flex-start; gap: 11px;">
			<span style="
				width: 20px; height: 20px; flex-shrink: 0; margin-top: 1px;
				display: flex; align-items: center; justify-content: center;
				border-radius: 50%; background: hsl(var(--secondary));
				font-size: 11px; font-weight: 600; color: hsl(var(--foreground));
			">1</span>
			<span style="flex: 1; font-size: 13px; line-height: 1.55; color: hsl(var(--foreground)); text-wrap: pretty;">
				Add what comes <strong style="font-weight: 600;">in</strong> on the left, what goes <strong style="font-weight: 600;">out</strong> on the right.
			</span>
		</div>

		<!-- Step 2 -->
		<div style="display: flex; align-items: flex-start; gap: 11px;">
			<span style="
				width: 20px; height: 20px; flex-shrink: 0; margin-top: 1px;
				display: flex; align-items: center; justify-content: center;
				border-radius: 50%; background: hsl(var(--secondary));
				font-size: 11px; font-weight: 600; color: hsl(var(--foreground));
			">2</span>
			<span style="flex: 1; font-size: 13px; line-height: 1.55; color: hsl(var(--foreground)); text-wrap: pretty;">
				Hit the
				<span style="
					display: inline-flex; vertical-align: middle;
					width: 18px; height: 18px; align-items: center; justify-content: center;
					border-radius: 5px; background: hsl(var(--secondary)); margin: 0 1px;
				"><Plus size={11} /></span>
				at the top of a column — or the add row — to create a record.
			</span>
		</div>

		<!-- Step 3 -->
		<div style="display: flex; align-items: flex-start; gap: 11px;">
			<span style="
				width: 20px; height: 20px; flex-shrink: 0; margin-top: 1px;
				display: flex; align-items: center; justify-content: center;
				border-radius: 50%; background: hsl(var(--secondary));
				font-size: 11px; font-weight: 600; color: hsl(var(--foreground));
			">3</span>
			<span style="flex: 1; font-size: 13px; line-height: 1.55; color: hsl(var(--foreground)); text-wrap: pretty;">
				The balance bar below tracks how much of your inflow is still unallocated.
			</span>
		</div>
	</div>

	<!-- Footer -->
	<div style="display: flex; justify-content: flex-end; padding: 14px 24px 20px;">
		<button
			type="button"
			onclick={onclose}
			style="
				font-size: 13px; font-weight: 500; padding: 7px 20px;
				border-radius: 7px; border: none;
				background: hsl(var(--foreground)); color: hsl(var(--background));
				cursor: pointer;
			"
			onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
			onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
		>Got it</button>
	</div>
</OnboardingModal>
