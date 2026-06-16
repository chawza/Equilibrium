<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { LayoutGrid, BarChart3, Tag, Settings } from '@lucide/svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { dateFormatStore } from '$lib/stores/dateformat.svelte';
	import { Toaster, toast } from 'svelte-sonner';
	import { commands } from '$lib/ipc';
	import KeyboardShortcutDialog from '$lib/components/KeyboardShortcutDialog.svelte';
	import TourModal from '$lib/components/onboarding/TourModal.svelte';
	import BudgetGuideModal from '$lib/components/onboarding/BudgetGuideModal.svelte';
	import { onboardingStore } from '$lib/stores/onboarding.svelte';
	import pkg from '../../package.json';

	let { children } = $props();

	// Init theme on mount (reads localStorage, sets .dark class).
	// Also check for a pending restore outcome and surface it as a one-time toast.
	onMount(async () => {
		themeStore.init();
		dateFormatStore.init();
		onboardingStore.maybeShowTourOnLaunch();
		try {
			const result = await commands.takeRestoreStatus();
			if (result.status === 'ok' && result.data !== null) {
				if (result.data.ok) {
					toast.success(result.data.message);
				} else {
					toast.error(result.data.message);
				}
			}
		} catch {
			// Best-effort — ignore if the command fails on first launch
		}
	});

	// ── Keyboard shortcuts ──────────────────────────────────────────────────────

	// OS-aware modifier label for sidebar tooltips
	const IS_MAC = (navigator as any).userAgentData?.platform === 'macOS'
		|| /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
	const modLabel = IS_MAC ? '⌘' : 'Ctrl+';

	function handleGlobalKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		const inInput =
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.isContentEditable;

		const mod = e.metaKey || e.ctrlKey;

		// Escape closes the modal (takes priority over everything else)
		if (e.key === 'Escape' && onboardingStore.showShortcuts) {
			e.preventDefault();
			onboardingStore.showShortcuts = false;
			return;
		}

		// Help modal — ? (not in input) or Cmd/Ctrl+/
		if (e.key === '?' && !inInput && !mod) {
			e.preventDefault();
			onboardingStore.showShortcuts = true;
			return;
		}
		if (e.key === '/' && mod) {
			e.preventDefault();
			onboardingStore.showShortcuts = true;
			return;
		}

		// Navigation — Cmd/Ctrl + number/comma
		if (mod && !e.shiftKey) {
			switch (e.key) {
				case '1': e.preventDefault(); goto('/');         break;
				case '2': e.preventDefault(); goto('/stats');    break;
				case '3': e.preventDefault(); goto('/tags');     break;
				case ',': e.preventDefault(); goto('/settings'); break;
			}
		}
	}

	// ── Nav items ───────────────────────────────────────────────────────────────

	type NavItem = {
		href: string;
		label: string;
		icon: typeof LayoutGrid;
		shortcutKey: string;
	};

	const navItems: NavItem[] = [
		{ href: '/',         label: 'Budgets',  icon: LayoutGrid, shortcutKey: '1' },
		{ href: '/stats',    label: 'Stats',    icon: BarChart3,  shortcutKey: '2' },
		{ href: '/tags',     label: 'Tags',     icon: Tag,        shortcutKey: '3' },
		{ href: '/settings', label: 'Settings', icon: Settings,   shortcutKey: ',' },
	];

	function isActive(href: string): boolean {
		const path = $page.url.pathname;
		if (href === '/') return path === '/' || path.startsWith('/budget');
		return path.startsWith(href);
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<!-- Root layout: sidebar + main -->
<div id="root" style="display:flex;height:100vh;overflow:hidden;">
	<!-- ── Sidebar: 56px fixed, icon-only ── -->
	<aside
		style="
			width: var(--sidebar-width, 56px);
			min-width: var(--sidebar-width, 56px);
			height: 100vh;
			display: flex;
			flex-direction: column;
			align-items: center;
			padding: 12px 0 16px;
			border-right: 1px solid hsl(var(--border));
			background: hsl(var(--background));
			gap: 2px;
		"
	>
		<!-- Logo -->
		<div
			style="
				width: 34px;
				height: 34px;
				border-radius: 8px;
				background: hsl(var(--foreground));
				display: flex;
				align-items: center;
				justify-content: center;
				margin-bottom: 16px;
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

		<!-- Nav icons -->
		{#each navItems as item}
			{@const active = isActive(item.href)}
			<div style="position:relative;width:100%;display:flex;justify-content:center;">
				<!-- Active left-bar indicator -->
				{#if active}
					<div
						style="
							position: absolute;
							left: -1px;
							top: 50%;
							transform: translateY(-50%);
							width: 3px;
							height: 16px;
							border-radius: 2px;
							background: hsl(var(--foreground));
						"
					></div>
				{/if}
				<button
					onclick={() => goto(item.href)}
					title="{item.label} {modLabel}{item.shortcutKey}"
					aria-label={item.label}
					style="
						width: 38px;
						height: 38px;
						border-radius: 8px;
						border: none;
						cursor: pointer;
						display: flex;
						align-items: center;
						justify-content: center;
						background: {active ? 'hsl(var(--secondary))' : 'transparent'};
						color: {active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'};
						transition: background 120ms ease, color 120ms ease;
					"
					onmouseenter={(e) => {
						if (!active) {
							(e.currentTarget as HTMLButtonElement).style.background =
								'hsl(var(--secondary))';
							(e.currentTarget as HTMLButtonElement).style.color =
								'hsl(var(--foreground))';
						}
					}}
					onmouseleave={(e) => {
						if (!active) {
							(e.currentTarget as HTMLButtonElement).style.background = 'transparent';
							(e.currentTarget as HTMLButtonElement).style.color =
								'hsl(var(--muted-foreground))';
						}
					}}
				>
					<item.icon size={18} />
				</button>
			</div>
		{/each}

		<!-- Spacer -->
		<div style="flex:1"></div>

		<!-- Version label -->
		<span
			style="
				font-size: 10px;
				font-weight: 400;
				letter-spacing: 0.02em;
				color: hsl(var(--muted-foreground));
				opacity: 0.6;
			"
		>
			v{pkg.version}
		</span>
	</aside>

	<!-- ── Onboarding modals + keyboard shortcut dialog ── -->
	<KeyboardShortcutDialog open={onboardingStore.showShortcuts} onclose={() => (onboardingStore.showShortcuts = false)} />
	<TourModal open={onboardingStore.showTour} onclose={() => onboardingStore.dismissTour()} />
	<BudgetGuideModal open={onboardingStore.showBudgetGuide} onclose={() => onboardingStore.dismissBudgetGuide()} />

	<!-- ── Main content area ── -->
	<Toaster theme={themeStore.value} richColors />
	<main
		style="
			flex: 1;
			min-width: 0;
			height: 100vh;
			overflow: auto;
			padding: 32px;
		"
	>
		{@render children()}
	</main>
</div>
