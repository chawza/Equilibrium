<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { LayoutGrid, BarChart3, Tag, Settings } from '@lucide/svelte';
	import { themeStore } from '$lib/stores/theme.svelte';

	let { children } = $props();

	// Init theme on mount (reads localStorage, sets .dark class)
	onMount(() => {
		themeStore.init();
	});

	type NavItem = {
		href: string;
		label: string;
		icon: typeof LayoutGrid;
	};

	const navItems: NavItem[] = [
		{ href: '/', label: 'Budgets', icon: LayoutGrid },
		{ href: '/stats', label: 'Stats', icon: BarChart3 },
		{ href: '/tags', label: 'Tags', icon: Tag },
		{ href: '/settings', label: 'Settings', icon: Settings }
	];

	function isActive(href: string): boolean {
		const path = $page.url.pathname;
		if (href === '/') return path === '/' || path.startsWith('/budget');
		return path.startsWith(href);
	}
</script>

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
					title={item.label}
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
			v0.1
		</span>
	</aside>

	<!-- ── Main content area ── -->
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
