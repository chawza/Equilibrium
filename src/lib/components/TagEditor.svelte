<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Plus, Check } from '@lucide/svelte';
	import TagBadge from './TagBadge.svelte';
	import { tagsStore } from '$lib/stores/tags.svelte';
	import { TAG_COLORS } from '$lib/constants/tag-colors';
	import type { Tag, ColorKey } from '$lib/types';

	interface Props {
		tags: Tag[];
		align?: 'left' | 'right';
		onchange: (tagIds: number[]) => void;
	}

	let { tags, align = 'left', onchange }: Props = $props();

	const ALL_COLORS: ColorKey[] = [
		'red', 'orange', 'amber', 'green', 'teal',
		'blue', 'indigo', 'purple', 'pink', 'gray'
	];

	let open = $state(false);
	let query = $state('');
	let newColor = $state<ColorKey>('blue');
	let containerEl: HTMLDivElement;
	let creating = $state(false);

	let q = $derived(query.trim().toLowerCase());
	let available = $derived(
		tagsStore.list.filter((t) => !tags.some((at) => at.id === t.id) && t.name.includes(q))
	);
	let exactMatch = $derived(tagsStore.list.some((t) => t.name === q));
	let canCreate = $derived(q.length > 0 && !exactMatch && !tags.some((t) => t.name === q));

	function handleOutsideClick(e: MouseEvent) {
		if (containerEl && !containerEl.contains(e.target as Node)) {
			open = false;
			query = '';
		}
	}

	onMount(() => {
		document.addEventListener('mousedown', handleOutsideClick);
	});
	onDestroy(() => {
		document.removeEventListener('mousedown', handleOutsideClick);
	});

	function addTag(tagId: number) {
		const newIds = [...tags.map((t) => t.id), tagId];
		onchange(newIds);
		query = '';
	}

	function removeTag(tagId: number) {
		const newIds = tags.filter((t) => t.id !== tagId).map((t) => t.id);
		onchange(newIds);
	}

	async function handleCreate() {
		if (!canCreate || creating) return;
		creating = true;
		try {
			const newTag = await tagsStore.create(q, newColor);
			addTag(newTag.id);
			open = false;
			query = '';
		} catch {
			// ignore
		} finally {
			creating = false;
		}
	}
</script>

<div
	bind:this={containerEl}
	style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap; flex: 1; min-width: 0;"
>
	{#each tags as tag}
		<TagBadge {tag} removable onremove={() => removeTag(tag.id)} />
	{/each}

	<div style="position: relative;">
		<button
			type="button"
			onclick={() => { open = !open; }}
			style="
				display: inline-flex; align-items: center; gap: 3px;
				padding: 2px 9px; border-radius: 9999px; font-size: 12px; font-weight: 500;
				border: 1px dashed hsl(var(--border)); background: transparent;
				color: hsl(var(--muted-foreground)); cursor: pointer; line-height: 18px;
				transition: border-color 0.12s, color 0.12s;
			"
			onmouseenter={(e) => {
				const el = e.currentTarget as HTMLElement;
				el.style.borderColor = 'hsl(var(--muted-foreground) / 0.5)';
				el.style.color = 'hsl(var(--foreground))';
			}}
			onmouseleave={(e) => {
				const el = e.currentTarget as HTMLElement;
				el.style.borderColor = 'hsl(var(--border))';
				el.style.color = 'hsl(var(--muted-foreground))';
			}}
		>
			<Plus size={11} />tag
		</button>

		{#if open}
			<div
				style="
					position: absolute; top: 100%; margin-top: 4px; width: 210px;
					{align === 'right' ? 'right: 0;' : 'left: 0;'}
					background: hsl(var(--popover)); border: 1px solid hsl(var(--border));
					border-radius: var(--radius); box-shadow: 0 4px 16px rgba(0,0,0,0.1);
					z-index: 70; padding: 8px;
				"
			>
				<!-- Search input -->
				<input
					type="text"
					autofocus
					bind:value={query}
					placeholder="Search or create…"
					onkeydown={(e) => { if (e.key === 'Enter' && canCreate) handleCreate(); if (e.key === 'Escape') { open = false; query = ''; } }}
					style="
						width: 100%; height: 30px; padding: 0 8px; font-size: 13px;
						border: 1px solid hsl(var(--input)); border-radius: 6px; outline: none;
						margin-bottom: 6px; box-sizing: border-box;
						background: hsl(var(--background)); color: hsl(var(--foreground));
					"
					onfocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--ring))'; }}
					onblur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--input))'; }}
				/>

				<!-- Available tags -->
				<div style="max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 1px;">
					{#each available as t}
						{@const dot = TAG_COLORS[t.color as ColorKey]?.dot ?? '#6B7280'}
						<button
							type="button"
							onclick={() => { addTag(t.id); open = false; }}
							style="
								display: flex; align-items: center; gap: 7px; padding: 5px 7px;
								border: none; background: transparent; border-radius: 5px; cursor: pointer;
								font-size: 13px; text-align: left; color: hsl(var(--foreground)); width: 100%;
							"
							onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))'; }}
							onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
						>
							<span style="width: 8px; height: 8px; border-radius: 50%; background: {dot}; flex-shrink: 0;"></span>
							{t.name}
						</button>
					{/each}
					{#if available.length === 0 && !canCreate}
						<div style="font-size: 12px; color: hsl(var(--muted-foreground)); padding: 6px 7px;">
							No tags found
						</div>
					{/if}
				</div>

				<!-- Create new tag section -->
				{#if canCreate}
					<div style="border-top: 1px solid hsl(var(--border)); margin-top: 6px; padding-top: 8px;">
						<div style="font-size: 11px; color: hsl(var(--muted-foreground)); margin-bottom: 6px;">
							Create "<strong style="color: hsl(var(--foreground));">{q}</strong>" with color
						</div>
						<div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
							{#each ALL_COLORS as c}
								{@const dot = TAG_COLORS[c].dot}
								{@const selected = c === newColor}
								<button
									type="button"
									title={c}
									onclick={() => (newColor = c)}
									style="
										width: 20px; height: 20px; border-radius: 50%; cursor: pointer;
										background: {dot}; padding: 0;
										border: {selected ? '2px solid hsl(var(--foreground))' : '2px solid transparent'};
										box-shadow: {selected ? '0 0 0 1px hsl(var(--background)) inset' : 'none'};
									"
								>
									{#if selected}
										<Check size={10} color="#fff" />
									{/if}
								</button>
							{/each}
						</div>
						<button
							type="button"
							onclick={handleCreate}
							disabled={creating}
							style="
								width: 100%; font-size: 13px; font-weight: 500;
								padding: 5px 10px; border-radius: 6px; border: none;
								background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
								cursor: {creating ? 'not-allowed' : 'pointer'}; opacity: {creating ? 0.6 : 1};
							"
						>
							Create &amp; attach
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
