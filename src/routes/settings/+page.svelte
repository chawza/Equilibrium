<script lang="ts">
	import { Sun, Moon, Calendar, Download, Upload, Database, BookOpen, Keyboard, LayoutGrid } from '@lucide/svelte';
import { goto } from '$app/navigation';
	import { onboardingStore } from '$lib/stores/onboarding.svelte';
	import { toast } from 'svelte-sonner';
	import { save, open } from '@tauri-apps/plugin-dialog';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { dateFormatStore, type DateFormat } from '$lib/stores/dateformat.svelte';
	import { budgetsStore } from '$lib/stores/budgets.svelte';
	import { tagsStore } from '$lib/stores/tags.svelte';
	import { commands } from '$lib/ipc';
	import ThemeSwitch from '$lib/components/ThemeSwitch.svelte';
	import pkg from '../../../package.json';

	function unwrap<T>(result: { status: 'ok'; data: T } | { status: 'error'; error: string }): T {
		if (result.status === 'ok') return result.data;
		throw new Error(result.error);
	}

	// Hovered date-format button — drives the example tooltip
	let hoveredDateFmt = $state<DateFormat | null>(null);

	const DATE_FORMAT_EXAMPLES: Record<DateFormat, string> = {
		default:  'Jun 1, 2026',
		iso:      '2026-06-01',
		long:     'June 1, 2026',
		dayfirst: '1 June 2026',
	};

	// Danger zone confirm state
	let confirming = $state(false);

	// Restore confirm + blocking overlay state
	let confirmRestore = $state(false);
	let restoring = $state(false);
	let restorePath = $state<string | null>(null);

	// ── Data section handlers ──────────────────────────────────────────────────

	async function handleExport() {
		try {
			const path = await save({
				defaultPath: 'equilibrium-export.csv',
				filters: [{ name: 'CSV', extensions: ['csv'] }]
			});
			if (!path) return;
			unwrap(await commands.exportCsv(path));
			toast.success('Exported successfully');
		} catch (e) {
			toast.error(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	// Cast for commands not yet in bindings.ts — auto-regenerated on `npm run tauri dev`.
	const extCommands = commands as typeof commands & {
		exportCsvTemplate: (path: string) => Promise<{ status: 'ok'; data: null } | { status: 'error'; error: string }>;
	};

	async function handleDownloadTemplate() {
		try {
			const path = await save({
				defaultPath: 'equilibrium-import-template.csv',
				filters: [{ name: 'CSV', extensions: ['csv'] }]
			});
			if (!path) return;
			unwrap(await extCommands.exportCsvTemplate(path));
			toast.success('Template downloaded');
		} catch (e) {
			toast.error(`Download failed: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	async function handleBackupDb() {
		try {
			const dest = await save({
				defaultPath: 'equilibrium.db',
				filters: [{ name: 'SQLite Database', extensions: ['db'] }]
			});
			if (!dest) return;
			unwrap(await commands.copyDb(dest));
			toast.success('Backup saved');
		} catch (e) {
			toast.error(`Backup failed: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	async function handlePickRestoreFile() {
		try {
			const path = await open({
				multiple: false,
				filters: [{ name: 'SQLite Database', extensions: ['db'] }]
			});
			if (!path) return;
			restorePath = path as string;
			confirmRestore = true;
		} catch (e) {
			toast.error(`Failed to open file: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	async function handleConfirmRestore() {
		if (!restorePath) return;
		confirmRestore = false;
		restoring = true;
		try {
			unwrap(await commands.stageRestore(restorePath));
			// On success, the process restarts — this line is never reached.
			// The overlay stays visible until the window tears down.
		} catch (e) {
			restoring = false;
			toast.error(`Restore failed: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	async function handleReset() {
		try {
			unwrap(await commands.resetAllData());
			await budgetsStore.load();
			await tagsStore.load();
			confirming = false;
			toast.success('All data has been reset');
		} catch (e) {
			confirming = false;
			toast.error(`Reset failed: ${e instanceof Error ? e.message : String(e)}`);
		}
	}
</script>

<!-- Blocking overlay while restore is staging (prevents double-trigger) -->
{#if restoring}
	<div
		style="
			position: fixed;
			inset: 0;
			background: hsl(var(--background) / 0.88);
			backdrop-filter: blur(4px);
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 12px;
			z-index: 9999;
		"
	>
		<div class="spinner"></div>
		<span style="font-size: 14px; font-weight: 500; color: hsl(var(--foreground));">
			Restoring database…
		</span>
		<span class="text-caption">The app will restart momentarily.</span>
	</div>
{/if}

<div class="page-enter" style="max-width: 560px; margin: 0 auto;">
	<h1 class="text-page-title" style="margin-bottom: 28px;">Settings</h1>

	<!-- ── 1. Appearance ─────────────────────────────────────────────────────── -->
	<div style="margin-bottom: 32px;">
		<h2 class="text-section-heading" style="margin-bottom: 12px;">Appearance</h2>
		<div
			style="
				background: hsl(var(--card));
				border: 1px solid hsl(var(--border));
				border-radius: var(--radius);
				overflow: hidden;
			"
		>
			<div
				style="
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 14px 18px;
					gap: 16px;
				"
			>
				<!-- Left: icon + text -->
				<div style="display: flex; align-items: center; gap: 12px;">
					<span style="color: hsl(var(--muted-foreground)); display: flex;">
						{#if themeStore.value === 'dark'}
							<Moon size={18} />
						{:else}
							<Sun size={18} />
						{/if}
					</span>
					<div>
						<div style="font-size: 14px; font-weight: 500; line-height: 1.3;">Dark mode</div>
						<div class="text-caption">
							{themeStore.value === 'dark' ? 'Using the dark theme' : 'Using the light theme'}
						</div>
					</div>
				</div>
				<!-- Right: toggle -->
				<ThemeSwitch on={themeStore.value === 'dark'} onchange={() => themeStore.toggle()} />
			</div>

			<!-- Divider -->
			<div style="border-top: 1px solid hsl(var(--border)); margin: 0 18px;"></div>

			<!-- Date format row -->
			<div
				style="
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 14px 18px;
					gap: 16px;
				"
			>
				<!-- Left: icon + text -->
				<div style="display: flex; align-items: center; gap: 12px;">
					<span style="color: hsl(var(--muted-foreground)); display: flex;">
						<Calendar size={18} />
					</span>
					<div>
						<div style="font-size: 14px; font-weight: 500; line-height: 1.3;">Date format</div>
						<div class="text-caption">How dates appear throughout the app</div>
					</div>
				</div>
				<!-- Right: segmented control + hover example -->
				<div style="position: relative; flex-shrink: 0;">
					<!-- Example tooltip shown on hover -->
					{#if hoveredDateFmt}
						<div
							style="
								position: absolute;
								bottom: calc(100% + 6px);
								right: 0;
								background: hsl(var(--popover));
								border: 1px solid hsl(var(--border));
								border-radius: 6px;
								padding: 3px 8px;
								font-size: 11px;
								color: hsl(var(--muted-foreground));
								white-space: nowrap;
								pointer-events: none;
							"
						>
							{DATE_FORMAT_EXAMPLES[hoveredDateFmt]}
						</div>
					{/if}
					<div
						style="
							display: flex;
							border: 1px solid hsl(var(--border));
							border-radius: 6px;
							overflow: hidden;
						"
					>
						{#each ([
							{ id: 'default',  label: 'Jun 1' },
							{ id: 'iso',      label: 'ISO'   },
							{ id: 'long',     label: 'Long'  },
							{ id: 'dayfirst', label: 'D M'   },
						] as const) as fmt, i}
							<button
								onclick={() => dateFormatStore.set(fmt.id as DateFormat)}
								onmouseenter={() => { hoveredDateFmt = fmt.id; }}
								onmouseleave={() => { hoveredDateFmt = null; }}
								style="
									font-size: 12px;
									font-weight: 500;
									padding: 4px 10px;
									border: none;
									border-right: {i < 3 ? '1px solid hsl(var(--border))' : 'none'};
									background: {dateFormatStore.value === fmt.id ? 'hsl(var(--secondary))' : 'transparent'};
									color: {dateFormatStore.value === fmt.id ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'};
									cursor: pointer;
									transition: background 0.1s, color 0.1s;
								"
							>
								{fmt.label}
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- ── 2. Help ───────────────────────────────────────────────────────────── -->
	<div style="margin-bottom: 32px;">
		<h2 class="text-section-heading" style="margin-bottom: 12px;">Help</h2>
		<div style="
			background: hsl(var(--card));
			border: 1px solid hsl(var(--border));
			border-radius: var(--radius);
			overflow: hidden;
		">
			<!-- App Tour row -->
			<div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; gap: 16px;">
				<div style="display: flex; align-items: center; gap: 12px;">
					<span style="color: hsl(var(--muted-foreground)); display: flex;">
						<BookOpen size={18} />
					</span>
					<div>
						<div style="font-size: 14px; font-weight: 500; line-height: 1.3;">App Tour</div>
						<div class="text-caption">A quick walk-through of the main screens and concepts.</div>
					</div>
				</div>
				<button
					onclick={() => onboardingStore.replayTour()}
					style="
						font-size: 12px; font-weight: 500; padding: 5px 12px;
						border-radius: 6px; border: 1px solid hsl(var(--border));
						background: transparent; color: hsl(var(--foreground));
						cursor: pointer; white-space: nowrap; flex-shrink: 0;
					"
					onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--secondary))'; }}
					onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
				>Show again</button>
			</div>

			<!-- Divider -->
			<div style="border-top: 1px solid hsl(var(--border)); margin: 0 18px;"></div>

			<!-- Budget Guide row -->
			<div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; gap: 16px;">
				<div style="display: flex; align-items: center; gap: 12px;">
					<span style="color: hsl(var(--muted-foreground)); display: flex;">
						<LayoutGrid size={18} />
					</span>
					<div>
						<div style="font-size: 14px; font-weight: 500; line-height: 1.3;">Budget Guide</div>
						<div class="text-caption">How to set up a budget and add your first records.</div>
					</div>
				</div>
				<button
					onclick={() => onboardingStore.replayBudgetGuide()}
					style="
						font-size: 12px; font-weight: 500; padding: 5px 12px;
						border-radius: 6px; border: 1px solid hsl(var(--border));
						background: transparent; color: hsl(var(--foreground));
						cursor: pointer; white-space: nowrap; flex-shrink: 0;
					"
					onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--secondary))'; }}
					onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
				>Show again</button>
			</div>

			<!-- Divider -->
			<div style="border-top: 1px solid hsl(var(--border)); margin: 0 18px;"></div>

			<!-- Keyboard Shortcuts row -->
			<div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; gap: 16px;">
				<div style="display: flex; align-items: center; gap: 12px;">
					<span style="color: hsl(var(--muted-foreground)); display: flex;">
						<Keyboard size={18} />
					</span>
					<div>
						<div style="font-size: 14px; font-weight: 500; line-height: 1.3;">Keyboard Shortcuts</div>
						<div class="text-caption">View all available keyboard shortcuts.</div>
					</div>
				</div>
				<button
					onclick={() => (onboardingStore.showShortcuts = true)}
					style="
						font-size: 12px; font-weight: 500; padding: 5px 12px;
						border-radius: 6px; border: 1px solid hsl(var(--border));
						background: transparent; color: hsl(var(--foreground));
						cursor: pointer; white-space: nowrap; flex-shrink: 0;
					"
					onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--secondary))'; }}
					onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
				>View</button>
			</div>
		</div>
	</div>

	<!-- ── 3. Data ────────────────────────────────────────────────────────────── -->
	<div style="margin-bottom: 32px;">
		<h2 class="text-section-heading" style="margin-bottom: 12px;">Data</h2>
		<div
			style="
				background: hsl(var(--card));
				border: 1px solid hsl(var(--border));
				border-radius: var(--radius);
				overflow: hidden;
				padding: 4px 0;
			"
		>
			<!-- Export row -->
			<div
				style="
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 12px 18px;
					gap: 16px;
				"
			>
				<div style="display: flex; align-items: center; gap: 12px;">
					<span style="color: hsl(var(--muted-foreground)); display: flex;">
						<Download size={18} />
					</span>
					<div>
						<div style="font-size: 14px; font-weight: 500; line-height: 1.3;">Export to CSV</div>
						<div class="text-caption">Download all records as a spreadsheet</div>
					</div>
				</div>
				<button
					onclick={handleExport}
					style="
						font-size: 12px;
						font-weight: 500;
						padding: 5px 12px;
						border-radius: 6px;
						border: 1px solid hsl(var(--border));
						background: transparent;
						color: hsl(var(--foreground));
						cursor: pointer;
						white-space: nowrap;
						flex-shrink: 0;
					"
					onmouseenter={(e) => {
						(e.currentTarget as HTMLElement).style.background = 'hsl(var(--secondary))';
					}}
					onmouseleave={(e) => {
						(e.currentTarget as HTMLElement).style.background = 'transparent';
					}}
				>
					Export
				</button>
			</div>

			<!-- Divider -->
			<div style="border-top: 1px solid hsl(var(--border)); margin: 0 18px;"></div>

			<!-- Import from CSV row -->
			<div
				style="
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 12px 18px;
					gap: 16px;
				"
			>
				<div style="display: flex; align-items: center; gap: 12px;">
					<span style="color: hsl(var(--muted-foreground)); display: flex;">
						<Upload size={18} />
					</span>
					<div>
						<div style="font-size: 14px; font-weight: 500; line-height: 1.3;">Import from CSV</div>
						<div class="text-caption">Add records from a CSV file</div>
					</div>
				</div>
				<div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
					<button
						onclick={handleDownloadTemplate}
						style="
							background: none;
							border: none;
							cursor: pointer;
							display: inline-flex;
							align-items: center;
							gap: 4px;
							font-size: 12px;
							font-weight: 500;
							color: hsl(var(--muted-foreground));
							padding: 0 6px;
							height: 30px;
							border-radius: 6px;
							font-family: inherit;
							transition: color 0.12s;
						"
						onmouseenter={(e) => {
							(e.currentTarget as HTMLElement).style.color = 'hsl(var(--foreground))';
						}}
						onmouseleave={(e) => {
							(e.currentTarget as HTMLElement).style.color = 'hsl(var(--muted-foreground))';
						}}
					>
						<Download size={12} />
						template
					</button>
					<button
						onclick={() => goto('/import')}
						style="
							font-size: 12px;
							font-weight: 500;
							padding: 5px 12px;
							border-radius: 6px;
							border: 1px solid hsl(var(--border));
							background: transparent;
							color: hsl(var(--foreground));
							cursor: pointer;
							white-space: nowrap;
						"
						onmouseenter={(e) => {
							(e.currentTarget as HTMLElement).style.background = 'hsl(var(--secondary))';
						}}
						onmouseleave={(e) => {
							(e.currentTarget as HTMLElement).style.background = 'transparent';
						}}
					>
						Import
					</button>
				</div>
			</div>

			<!-- Divider -->
			<div style="border-top: 1px solid hsl(var(--border)); margin: 0 18px;"></div>

			<!-- Backup database row -->
			<div
				style="
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 12px 18px;
					gap: 16px;
				"
			>
				<div style="display: flex; align-items: center; gap: 12px;">
					<span style="color: hsl(var(--muted-foreground)); display: flex;">
						<Database size={18} />
					</span>
					<div>
						<div style="font-size: 14px; font-weight: 500; line-height: 1.3;">Backup database</div>
						<div class="text-caption">Save a consistent copy of the raw SQLite file</div>
					</div>
				</div>
				<button
					onclick={handleBackupDb}
					style="
						font-size: 12px;
						font-weight: 500;
						padding: 5px 12px;
						border-radius: 6px;
						border: 1px solid hsl(var(--border));
						background: transparent;
						color: hsl(var(--foreground));
						cursor: pointer;
						white-space: nowrap;
						flex-shrink: 0;
					"
					onmouseenter={(e) => {
						(e.currentTarget as HTMLElement).style.background = 'hsl(var(--secondary))';
					}}
					onmouseleave={(e) => {
						(e.currentTarget as HTMLElement).style.background = 'transparent';
					}}
				>
					Backup
				</button>
			</div>

			<!-- Divider -->
			<div style="border-top: 1px solid hsl(var(--border)); margin: 0 18px;"></div>

			<!-- Restore database row -->
			<div
				style="
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 12px 18px;
					gap: 16px;
				"
			>
				<div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
					<span style="color: hsl(var(--muted-foreground)); display: flex; flex-shrink: 0;">
						<Upload size={18} />
					</span>
					<div style="min-width: 0;">
						<div style="font-size: 14px; font-weight: 500; line-height: 1.3;">Restore database</div>
						<div class="text-caption">Replace all data from a backup file and restart</div>
					</div>
				</div>

				{#if confirmRestore}
					<!-- Inline destructive confirm -->
					<div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
						<span style="font-size: 12px; color: hsl(var(--destructive)); white-space: nowrap;">
							Replaces all data and restarts. Sure?
						</span>
						<button
							onclick={() => { confirmRestore = false; restorePath = null; }}
							style="
								font-size: 12px;
								font-weight: 500;
								padding: 4px 10px;
								border-radius: 5px;
								border: none;
								background: transparent;
								color: hsl(var(--muted-foreground));
								cursor: pointer;
							"
							onmouseenter={(e) => {
								(e.currentTarget as HTMLElement).style.background = 'hsl(var(--secondary))';
							}}
							onmouseleave={(e) => {
								(e.currentTarget as HTMLElement).style.background = 'transparent';
							}}
						>
							Cancel
						</button>
						<button
							onclick={handleConfirmRestore}
							style="
								font-size: 12px;
								font-weight: 500;
								padding: 4px 10px;
								border-radius: 5px;
								border: none;
								background: hsl(var(--destructive));
								color: hsl(var(--destructive-foreground));
								cursor: pointer;
							"
						>
							Restore
						</button>
					</div>
				{:else}
					<button
						onclick={handlePickRestoreFile}
						style="
							font-size: 12px;
							font-weight: 500;
							padding: 5px 12px;
							border-radius: 6px;
							border: 1px solid hsl(var(--border));
							background: transparent;
							color: hsl(var(--foreground));
							cursor: pointer;
							white-space: nowrap;
							flex-shrink: 0;
						"
						onmouseenter={(e) => {
							(e.currentTarget as HTMLElement).style.background = 'hsl(var(--secondary))';
						}}
						onmouseleave={(e) => {
							(e.currentTarget as HTMLElement).style.background = 'transparent';
						}}
					>
						Restore
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- ── 4. Danger Zone ────────────────────────────────────────────────────── -->
	<div style="margin-bottom: 32px;">
		<h2
			class="text-section-heading"
			style="margin-bottom: 12px; color: hsl(var(--destructive));"
		>
			Danger Zone
		</h2>
		<div
			style="
				background: hsl(var(--card));
				border: 1px solid hsl(var(--destructive) / 0.2);
				border-radius: var(--radius);
				overflow: hidden;
			"
		>
			<div
				style="
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 14px 18px;
					gap: 16px;
				"
			>
				<!-- Left: text -->
				<div>
					<div style="font-size: 14px; font-weight: 500; line-height: 1.3;">Reset all data</div>
					<div class="text-caption">Permanently delete all budgets and records</div>
				</div>

				<!-- Right: button or inline confirm -->
				{#if confirming}
					<div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
						<span style="font-size: 12px; color: hsl(var(--destructive)); white-space: nowrap;">
							Are you sure?
						</span>
						<button
							onclick={() => (confirming = false)}
							style="
								font-size: 12px;
								font-weight: 500;
								padding: 4px 10px;
								border-radius: 5px;
								border: none;
								background: transparent;
								color: hsl(var(--muted-foreground));
								cursor: pointer;
							"
							onmouseenter={(e) => {
								(e.currentTarget as HTMLElement).style.background = 'hsl(var(--secondary))';
							}}
							onmouseleave={(e) => {
								(e.currentTarget as HTMLElement).style.background = 'transparent';
							}}
						>
							Cancel
						</button>
						<button
							onclick={handleReset}
							style="
								font-size: 12px;
								font-weight: 500;
								padding: 4px 10px;
								border-radius: 5px;
								border: none;
								background: hsl(var(--destructive));
								color: hsl(var(--destructive-foreground));
								cursor: pointer;
							"
						>
							Confirm
						</button>
					</div>
				{:else}
					<button
						onclick={() => (confirming = true)}
						style="
							font-size: 12px;
							font-weight: 500;
							padding: 5px 12px;
							border-radius: 6px;
							border: none;
							background: hsl(var(--destructive));
							color: hsl(var(--destructive-foreground));
							cursor: pointer;
							white-space: nowrap;
							flex-shrink: 0;
						"
					>
						Reset
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- ── 5. About ──────────────────────────────────────────────────────────── -->
	<div>
		<h2 class="text-section-heading" style="margin-bottom: 12px;">About</h2>
		<div
			style="
				background: hsl(var(--card));
				border: 1px solid hsl(var(--border));
				border-radius: var(--radius);
				padding: 18px;
			"
		>
			<!-- Header: logo + name + version -->
			<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
				<div
					style="
						width: 36px;
						height: 36px;
						border-radius: 8px;
						background: hsl(var(--foreground));
						display: flex;
						align-items: center;
						justify-content: center;
						flex-shrink: 0;
					"
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
						<path
							d="M2 12h20M12 2v20"
							stroke="hsl(var(--background))"
							stroke-width="2"
							stroke-linecap="round"
						/>
						<circle cx="6" cy="8" r="2" fill="#16A34A" />
						<circle cx="18" cy="16" r="2" fill="#DC2626" />
					</svg>
				</div>
				<div>
					<div style="font-size: 15px; font-weight: 600; line-height: 1.3;">Equilibrium</div>
					<div class="text-caption">Version {pkg.version}</div>
				</div>
			</div>
			<!-- Description -->
			<p class="text-caption" style="line-height: 1.6; margin: 0;">
				A local-first personal budgeting app.<br />
				Built with Tauri + Svelte. Your data stays on your machine.
			</p>
		</div>
	</div>
</div>

<style>
	@keyframes spin {
		from { transform: rotate(0deg); }
		to   { transform: rotate(360deg); }
	}
	.spinner {
		width: 24px;
		height: 24px;
		border: 2px solid hsl(var(--muted-foreground) / 0.4);
		border-top-color: hsl(var(--foreground));
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}
</style>
