<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, ChevronRight } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { tagsStore } from '$lib/stores/tags.svelte';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import TagBadge from '$lib/components/TagBadge.svelte';
	import TagDetail from '$lib/components/TagDetail.svelte';
	import type { ColorKey } from '$lib/types';

	const TAG_PAGE_SIZE = 10;

	// ── Two-mode state ───────────────────────────────────────────────────────
	let selectedTagId = $state<number | null>(null);

	// ── Create form state ────────────────────────────────────────────────────
	let creating = $state(false);
	let newName = $state('');
	let newColor = $state<ColorKey>('blue');
	let createError = $state('');

	// ── Filter / sort / pagination state ─────────────────────────────────────
	let query = $state('');
	let countSort = $state<'none' | 'desc' | 'asc'>('none');
	let pageNum = $state(0);

	// Reset page on query or sort change.
	$effect(() => {
		query;
		countSort;
		pageNum = 0;
	});

	// Filtered + sorted tag list.
	const filteredTags = $derived(
		[...tagsStore.list]
			.filter((t) => !query.trim() || t.name.includes(query.trim().toLowerCase()))
			.sort((a, b) => {
				if (countSort === 'none') return a.name.localeCompare(b.name);
				const diff = a.usageCount - b.usageCount;
				const dir = countSort === 'asc' ? diff : -diff;
				return dir !== 0 ? dir : a.name.localeCompare(b.name);
			})
	);

	const totalPages = $derived(Math.max(1, Math.ceil(filteredTags.length / TAG_PAGE_SIZE)));
	const clampedPage = $derived(Math.min(pageNum, totalPages - 1));
	const pageTags = $derived(
		filteredTags.slice(clampedPage * TAG_PAGE_SIZE, (clampedPage + 1) * TAG_PAGE_SIZE)
	);

	onMount(() => {
		tagsStore.load();
	});

	// ── Create form handlers ──────────────────────────────────────────────────
	function startCreate() {
		// Don't open create form while viewing detail
		if (selectedTagId !== null) return;
		creating = true;
		newName = '';
		newColor = 'blue';
		createError = '';
	}

	function cancelCreate() {
		creating = false;
		createError = '';
	}

	async function saveNew() {
		const name = newName.trim().toLowerCase();
		if (!name) {
			createError = 'Tag name cannot be empty.';
			return;
		}
		if (tagsStore.list.some((t) => t.name === name)) {
			createError = `A tag named "${name}" already exists.`;
			return;
		}
		try {
			await tagsStore.create(name, newColor);
			creating = false;
			newName = '';
			createError = '';
			toast.success('Tag created');
		} catch (e) {
			createError = String(e);
			toast.error(`Failed to create tag: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	function handleNewKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') saveNew();
		if (e.key === 'Escape') cancelCreate();
	}

	function handleTagsKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
			if (!creating && selectedTagId === null) {
				e.preventDefault();
				startCreate();
			}
		}
	}

	const sortOptions: Array<['none' | 'desc' | 'asc', string]> = [
		['none', 'A–Z'],
		['desc', 'Most used'],
		['asc', 'Least used']
	];
</script>

<svelte:window onkeydown={handleTagsKeydown} />

{#if selectedTagId !== null}
	<TagDetail tagId={selectedTagId} onback={() => (selectedTagId = null)} />
{:else}
	<div class="page-enter" style="max-width: 620px; margin: 0 auto;">
		<!-- Header -->
		<div
			style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px;"
		>
			<h1 class="text-page-title">Tags</h1>
			<button
				onclick={startCreate}
				style="
					display: inline-flex; align-items: center; gap: 6px;
					font-size: 13px; font-weight: 500;
					padding: 5px 12px; border-radius: 6px; border: none;
					background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
					cursor: pointer; line-height: 1;
				"
			>
				<Plus size={14} />
				New tag
			</button>
		</div>

		<p class="text-caption" style="margin-bottom: 22px;">
			{tagsStore.list.length} tag{tagsStore.list.length !== 1 ? 's' : ''} · select a tag to view
			its records and edit it.
		</p>

		<!-- Create form -->
		{#if creating}
			<div
				style="
					margin-bottom: 14px;
					border: 1px solid hsl(var(--ring) / 0.4);
					border-radius: var(--radius);
					background: hsl(var(--card));
					padding: 16px 18px;
				"
			>
				<div
					style="
						font-size: 13px; font-weight: 600; color: hsl(var(--muted-foreground));
						text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 12px;
					"
				>
					New tag
				</div>

				<!-- Input + live preview -->
				<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
					<!-- svelte-ignore a11y_autofocus -->
					<input
						autofocus
						type="text"
						placeholder="e.g. subscription"
						bind:value={newName}
						onkeydown={handleNewKeydown}
						style="
							flex: 1; min-width: 0; height: 34px; padding: 0 10px;
							border: 1px solid hsl(var(--border)); border-radius: 6px;
							background: hsl(var(--background)); color: hsl(var(--foreground));
							font-size: 13px; outline: none; font-family: inherit;
						"
					/>
					<!-- Live preview badge -->
					<TagBadge tag={{ id: 0, name: newName.trim().toLowerCase() || 'preview', color: newColor }} />
				</div>

				<!-- Color picker -->
				<ColorPicker value={newColor} onchange={(c) => (newColor = c)} />

				{#if createError}
					<div style="font-size: 12px; color: hsl(var(--destructive)); margin-top: 10px;">
						{createError}
					</div>
				{/if}

				<div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
					<button
						onclick={cancelCreate}
						style="
							font-size: 13px; font-weight: 500; padding: 5px 12px;
							border-radius: 6px; border: 1px solid transparent;
							background: transparent; color: hsl(var(--foreground)); cursor: pointer;
						"
						onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--secondary))'; }}
						onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
					>
						Cancel
					</button>
					<button
						onclick={saveNew}
						style="
							font-size: 13px; font-weight: 500; padding: 5px 12px;
							border-radius: 6px; border: none;
							background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
							cursor: pointer;
						"
					>
						Create tag
					</button>
				</div>
			</div>
		{/if}

		<!-- Filter + sort bar -->
		<div
			style="
				display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap;
			"
		>
			<input
				type="text"
				bind:value={query}
				placeholder="Search tags…"
				style="
					flex: 1; min-width: 120px; height: 32px; padding: 0 10px;
					border: 1px solid hsl(var(--border)); border-radius: 6px;
					background: hsl(var(--background)); color: hsl(var(--foreground));
					font-size: 13px; outline: none; font-family: inherit;
				"
			/>
			<div
				style="
					display: flex; background: hsl(var(--secondary));
					border-radius: 8px; padding: 2px; gap: 2px; flex-shrink: 0;
				"
			>
				{#each sortOptions as [val, label]}
					<button
						type="button"
						onclick={() => (countSort = val)}
						style="
							border: none; cursor: pointer; font-family: inherit;
							font-size: 12px; font-weight: 500;
							padding: 6px 12px; border-radius: 6px;
							background: {countSort === val ? 'hsl(var(--background))' : 'transparent'};
							color: {countSort === val ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'};
							box-shadow: {countSort === val ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'};
							transition: background 0.12s, color 0.12s;
						"
					>
						{label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Tag list card -->
		<div
			style="
				border: 1px solid hsl(var(--border));
				border-radius: var(--radius);
				background: hsl(var(--card));
			"
		>
			{#if tagsStore.loading}
				<div class="text-caption" style="padding: 28px 18px; text-align: center;">Loading…</div>
			{:else if tagsStore.list.length === 0}
				<div class="text-caption" style="padding: 28px 18px; text-align: center;">
					No tags yet. Create one to get started.
				</div>
			{:else if filteredTags.length === 0}
				<div class="text-caption" style="padding: 28px 18px; text-align: center;">
					No tags match your search.
				</div>
			{:else}
				<div>
					{#each pageTags as tag, i}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							onclick={() => (selectedTagId = tag.id)}
							onkeydown={(e) => { if (e.key === 'Enter') selectedTagId = tag.id; }}
							role="button"
							tabindex="0"
							style="
								display: flex; align-items: center; gap: 14px;
								padding: 12px 18px; cursor: pointer;
								{i > 0 ? 'border-top: 1px solid hsl(var(--border));' : ''}
								transition: background 0.1s;
							"
							onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent) / 0.5)'; }}
							onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
						>
							<!-- Tag badge column: 150px -->
							<div style="width: 150px; flex-shrink: 0;">
								<TagBadge tag={{ id: tag.id, name: tag.name, color: tag.color as ColorKey }} />
							</div>

							<!-- Usage count -->
							<div class="text-caption" style="flex: 1;">
								{tag.usageCount > 0
									? `Used in ${tag.usageCount} record${tag.usageCount !== 1 ? 's' : ''}`
									: 'Unused'}
							</div>

							<!-- Chevron -->
							<ChevronRight size={15} color="hsl(var(--muted-foreground))" style="opacity: 0.45; flex-shrink: 0;" />
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Pagination -->
		{#if filteredTags.length > TAG_PAGE_SIZE}
			<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px;">
				<span class="text-caption">{filteredTags.length} tag{filteredTags.length !== 1 ? 's' : ''}</span>
				<div style="display: flex; align-items: center; gap: 8px;">
					<button
						type="button"
						disabled={clampedPage <= 0}
						onclick={() => (pageNum = Math.max(0, pageNum - 1))}
						style="
							display: flex; align-items: center; justify-content: center;
							width: 28px; height: 28px; border-radius: 6px;
							border: 1px solid hsl(var(--border));
							background: hsl(var(--background)); cursor: pointer;
							opacity: {clampedPage <= 0 ? 0.4 : 1};
						"
					>
						<ChevronRight size={14} style="transform: rotate(180deg);" />
					</button>
					<span class="text-caption">{clampedPage + 1} / {totalPages}</span>
					<button
						type="button"
						disabled={clampedPage >= totalPages - 1}
						onclick={() => (pageNum = Math.min(totalPages - 1, pageNum + 1))}
						style="
							display: flex; align-items: center; justify-content: center;
							width: 28px; height: 28px; border-radius: 6px;
							border: 1px solid hsl(var(--border));
							background: hsl(var(--background)); cursor: pointer;
							opacity: {clampedPage >= totalPages - 1 ? 0.4 : 1};
						"
					>
						<ChevronRight size={14} />
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}
