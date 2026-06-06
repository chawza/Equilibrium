<script lang="ts">
	import { X } from '@lucide/svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	const IS_MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
	const MOD = IS_MAC ? '⌘' : 'Ctrl';

	type Shortcut = { action: string; keys: string[]; where?: string };
	type Group = { label: string; shortcuts: Shortcut[] };

	const SHORTCUT_GROUPS: Group[] = [
		{
			label: 'Navigation',
			shortcuts: [
				{ action: 'Budgets',  keys: [MOD, '1'] },
				{ action: 'Stats',    keys: [MOD, '2'] },
				{ action: 'Tags',     keys: [MOD, '3'] },
				{ action: 'Settings', keys: [MOD, ','] },
			],
		},
		{
			label: 'Actions',
			shortcuts: [
				{ action: 'New budget', keys: [MOD, 'N'], where: 'Budgets page' },
				{ action: 'New tag',    keys: [MOD, 'N'], where: 'Tags page' },
				{ action: 'Go back',    keys: ['Esc'],    where: 'Budget form' },
			],
		},
		{
			label: 'Editing',
			shortcuts: [
				{ action: 'Save',   keys: ['Enter'], where: 'Record / tag edit' },
				{ action: 'Cancel', keys: ['Esc'],   where: 'Record / tag edit' },
			],
		},
	];

</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		onclick={onclose}
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-label="Keyboard shortcuts"
		style="
			position: fixed; inset: 0; z-index: 500;
			display: flex; align-items: center; justify-content: center;
			background: hsl(var(--foreground) / 0.25);
			backdrop-filter: blur(2px);
			animation: kbdOverlayIn 0.15s ease-out;
		"
	>
		<!-- Panel — stop click propagation so clicking inside doesn't close -->
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
		<div
			onclick={(e) => e.stopPropagation()}
			style="
				width: 480px;
				max-height: calc(100vh - 80px);
				overflow-y: auto;
				background: hsl(var(--card));
				border: 1px solid hsl(var(--border));
				border-radius: calc(var(--radius) + 2px);
				box-shadow: 0 16px 48px hsl(var(--foreground) / 0.12), 0 2px 8px hsl(var(--foreground) / 0.06);
				animation: kbdDialogIn 0.18s ease-out;
				position: relative;
			"
		>
			<!-- Header -->
			<div style="display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 0 20px;">
				<h2 class="text-section-heading" style="margin: 0;">Keyboard Shortcuts</h2>
				<button
					type="button"
					onclick={onclose}
					aria-label="Close keyboard shortcuts"
					style="
						width: 28px; height: 28px;
						display: flex; align-items: center; justify-content: center;
						border: none; background: transparent; border-radius: 6px;
						cursor: pointer; color: hsl(var(--muted-foreground));
						transition: background 0.12s, color 0.12s;
					"
					onmouseenter={(e) => {
						(e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--accent))';
						(e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--foreground))';
					}}
					onmouseleave={(e) => {
						(e.currentTarget as HTMLButtonElement).style.background = 'transparent';
						(e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--muted-foreground))';
					}}
				>
					<X size={16} />
				</button>
			</div>

			<!-- Shortcut groups -->
			<div style="padding: 6px 20px 20px;">
				{#each SHORTCUT_GROUPS as group, gi}
					<div>
						<!-- Group header -->
						<div style="
							font-size: 11px; font-weight: 500;
							text-transform: uppercase; letter-spacing: 0.06em;
							color: hsl(var(--muted-foreground));
							margin-top: {gi === 0 ? '14px' : '22px'};
							margin-bottom: 10px;
						">
							{group.label}
						</div>

						<!-- Shortcut rows -->
						<div style="display: flex; flex-direction: column; gap: 2px;">
							{#each group.shortcuts as sc}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									style="
										display: flex; align-items: center; justify-content: space-between;
										padding: 7px 8px; border-radius: 6px; transition: background 0.1s;
									"
									onmouseenter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'hsl(var(--accent) / 0.5)'; }}
									onmouseleave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
								>
									<div style="display: flex; align-items: baseline; gap: 8px;">
										<span class="text-card-title">{sc.action}</span>
										{#if sc.where}
											<span class="text-caption" style="font-size: 11px;">{sc.where}</span>
										{/if}
									</div>
									<!-- KeyCombo: multiple Kbd pills, 4px gap, no "+" separator -->
									<span style="display: inline-flex; align-items: center; gap: 4px;">
										{#each sc.keys as key}
											<kbd style="
												display: inline-flex; align-items: center; justify-content: center;
												min-width: 24px; height: 24px; padding: 2px 7px;
												background: hsl(var(--secondary));
												border: 1px solid hsl(var(--border));
												border-radius: 6px;
												font-size: 12px;
												font-family: 'Geist', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
												font-weight: 500; line-height: 1;
												color: hsl(var(--foreground));
												white-space: nowrap;
											">{key}</kbd>
										{/each}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}

				<!-- Footer hint -->
				<div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid hsl(var(--border)); text-align: center;">
					<span class="text-caption" style="font-size: 11px; opacity: 0.7;">
						Press <kbd style="
							display: inline-flex; align-items: center; justify-content: center;
							min-width: 24px; height: 24px; padding: 2px 7px;
							background: hsl(var(--secondary));
							border: 1px solid hsl(var(--border));
							border-radius: 6px; font-size: 12px;
							font-family: 'Geist', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
							font-weight: 500; line-height: 1;
							color: hsl(var(--foreground)); white-space: nowrap;
						">?</kbd> anywhere to toggle this dialog
					</span>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes kbdOverlayIn {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	@keyframes kbdDialogIn {
		from { opacity: 0; transform: scale(0.97) translateY(4px); }
		to   { opacity: 1; transform: scale(1) translateY(0); }
	}
</style>
