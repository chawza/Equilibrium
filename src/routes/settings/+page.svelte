<script lang="ts">
	import { Sun, Moon, Download, Upload, Database } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { save, open } from '@tauri-apps/plugin-dialog';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { budgetsStore } from '$lib/stores/budgets.svelte';
	import { tagsStore } from '$lib/stores/tags.svelte';
	import { commands } from '$lib/ipc';
	import ThemeSwitch from '$lib/components/ThemeSwitch.svelte';

	function unwrap<T>(result: { status: 'ok'; data: T } | { status: 'error'; error: string }): T {
		if (result.status === 'ok') return result.data;
		throw new Error(result.error);
	}

	// Danger zone confirm state
	let confirming = $state(false);

	// ── Data section handlers ──────────────────────────────────────────────────

	async function handleExport() {
		try {
			const path = await save({
				defaultPath: 'equilibrium-export.json',
				filters: [{ name: 'JSON', extensions: ['json'] }]
			});
			if (!path) return;
			unwrap(await commands.exportToPath(path));
			toast.success('Exported successfully');
		} catch (e) {
			toast.error(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	async function handleImport() {
		try {
			const path = await open({
				multiple: false,
				filters: [{ name: 'JSON', extensions: ['json'] }]
			});
			if (!path) return;
			unwrap(await commands.importFromPath(path as string));
			await budgetsStore.load();
			await tagsStore.load();
			toast.success('Imported successfully');
		} catch (e) {
			toast.error(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	async function handleCopyDb() {
		try {
			const dest = await save({
				defaultPath: 'equilibrium.db',
				filters: [{ name: 'SQLite Database', extensions: ['db'] }]
			});
			if (!dest) return;
			unwrap(await commands.copyDb(dest));
			toast.success('File copied');
		} catch (e) {
			toast.error(`Copy failed: ${e instanceof Error ? e.message : String(e)}`);
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
		</div>
	</div>

	<!-- ── 2. Data ────────────────────────────────────────────────────────────── -->
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
						<div style="font-size: 14px; font-weight: 500; line-height: 1.3;">Export to JSON</div>
						<div class="text-caption">Download all budgets as a JSON file</div>
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

			<!-- Import row -->
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
						<div style="font-size: 14px; font-weight: 500; line-height: 1.3;">Import from JSON</div>
						<div class="text-caption">Restore budgets from a previously exported file</div>
					</div>
				</div>
				<button
					onclick={handleImport}
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
					Import
				</button>
			</div>

			<!-- Divider -->
			<div style="border-top: 1px solid hsl(var(--border)); margin: 0 18px;"></div>

			<!-- Copy SQLite row -->
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
						<div style="font-size: 14px; font-weight: 500; line-height: 1.3;">Copy SQLite file</div>
						<div class="text-caption">Copy the raw database file to a location of your choice</div>
					</div>
				</div>
				<button
					onclick={handleCopyDb}
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
					Copy
				</button>
			</div>
		</div>
	</div>

	<!-- ── 3. Danger Zone ────────────────────────────────────────────────────── -->
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

	<!-- ── 4. About ──────────────────────────────────────────────────────────── -->
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
					<div class="text-caption">Version 1.0.0</div>
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
