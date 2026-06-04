<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, Pencil, Trash2, Check } from '@lucide/svelte';
	import { tagsStore } from '$lib/stores/tags.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { TAG_COLORS } from '$lib/constants/tag-colors';
	import type { ColorKey } from '$lib/types';

	const ALL_COLORS: ColorKey[] = [
		'red',
		'orange',
		'amber',
		'green',
		'teal',
		'blue',
		'indigo',
		'purple',
		'pink',
		'gray'
	];

	function tagStyle(color: string) {
		const key = (color as ColorKey) in TAG_COLORS ? (color as ColorKey) : 'gray';
		const entry = TAG_COLORS[key];
		const mode = themeStore.value === 'dark' ? entry.dark : entry.light;
		return { fill: mode.fill, text: mode.text, dot: entry.dot };
	}

	// ── Create form state ──
	let creating = $state(false);
	let newName = $state('');
	let newColor = $state<ColorKey>('blue');
	let createError = $state('');
	let createCs = $derived(tagStyle(newColor));

	// ── Edit state ──
	let editingId = $state<number | null>(null);
	let draftName = $state('');
	let draftColor = $state<ColorKey>('gray');
	let editError = $state('');
	let confirmingDeleteId = $state<number | null>(null);
	let editCs = $derived(tagStyle(draftColor));

	onMount(() => {
		tagsStore.load();
	});

	function startCreate() {
		editingId = null;
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
		} catch (e) {
			createError = String(e);
		}
	}

	function startEdit(id: number) {
		creating = false;
		confirmingDeleteId = null;
		const tag = tagsStore.list.find((t) => t.id === id)!;
		editingId = id;
		draftName = tag.name;
		draftColor = tag.color as ColorKey;
		editError = '';
	}

	function cancelEdit() {
		editingId = null;
		editError = '';
		confirmingDeleteId = null;
	}

	async function saveEdit() {
		if (editingId === null) return;
		const name = draftName.trim().toLowerCase();
		if (!name) {
			editError = 'Tag name cannot be empty.';
			return;
		}
		const orig = tagsStore.list.find((t) => t.id === editingId)!;
		if (name !== orig.name && tagsStore.list.some((t) => t.name === name)) {
			editError = `A tag named "${name}" already exists.`;
			return;
		}
		try {
			await tagsStore.update(editingId, name, draftColor);
			editingId = null;
			editError = '';
		} catch (e) {
			editError = String(e);
		}
	}

	async function doDelete(id: number) {
		try {
			await tagsStore.delete(id);
			editingId = null;
			confirmingDeleteId = null;
		} catch (e) {
			editError = String(e);
		}
	}

	function handleNewKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') saveNew();
		if (e.key === 'Escape') cancelCreate();
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') saveEdit();
		if (e.key === 'Escape') cancelEdit();
	}
</script>

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
		{tagsStore.list.length} tag{tagsStore.list.length !== 1 ? 's' : ''} · rename or recolor a tag
		to update it everywhere it's used.
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
				style="font-size: 13px; font-weight: 600; color: hsl(var(--muted-foreground));
					   text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 12px;"
			>
				New tag
			</div>
			<!-- Input + live preview -->
			<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
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
						font-size: 13px; outline: none;
					"
				/>
				<span
					style="
						display: inline-flex; align-items: center; gap: 5px;
						padding: 2px 9px; border-radius: 9999px;
						font-size: 12px; font-weight: 500; line-height: 18px;
						white-space: nowrap; flex-shrink: 0;
						background: {createCs.fill}; color: {createCs.text};
					"
				>
					<span
						style="width: 6px; height: 6px; border-radius: 50%; background: {createCs.dot}; flex-shrink: 0;"
					></span>
					{newName.trim().toLowerCase() || 'tag name'}
				</span>
			</div>
			<!-- Color picker -->
			<div style="display: flex; flex-wrap: wrap; gap: 7px;">
				{#each ALL_COLORS as c}
					{@const dot = TAG_COLORS[c].dot}
					{@const selected = c === newColor}
					<button
						type="button"
						title={c}
						onclick={() => (newColor = c)}
						style="
							width: 24px; height: 24px; border-radius: 50%;
							background: {dot}; border: none; cursor: pointer; padding: 0;
							display: flex; align-items: center; justify-content: center;
							outline: {selected ? '2px solid hsl(var(--foreground))' : '2px solid transparent'};
							outline-offset: 2px; transition: outline-color 0.12s;
						"
					>
						{#if selected}
							<Check size={12} color="#fff" />
						{/if}
					</button>
				{/each}
			</div>
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
						background: transparent; color: hsl(var(--foreground));
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
		{:else}
			<div style="padding: 4px 0;">
				{#each tagsStore.list as tag, i}
					{#if i > 0}
						<div style="border-top: 1px solid hsl(var(--border)); margin: 0 18px;"></div>
					{/if}

					{#if editingId === tag.id}
						<!-- Edit mode -->
						<div style="padding: 16px 18px; background: hsl(var(--accent) / 0.5);">
							<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
								<input
									autofocus
									type="text"
									bind:value={draftName}
									onkeydown={handleEditKeydown}
									style="
										flex: 1; min-width: 0; height: 34px; padding: 0 10px;
										border: 1px solid hsl(var(--border)); border-radius: 6px;
										background: hsl(var(--background)); color: hsl(var(--foreground));
										font-size: 13px; outline: none;
									"
								/>
								<span
									style="
										display: inline-flex; align-items: center; gap: 5px;
										padding: 2px 9px; border-radius: 9999px;
										font-size: 12px; font-weight: 500; line-height: 18px;
										white-space: nowrap; flex-shrink: 0;
										background: {editCs.fill}; color: {editCs.text};
									"
								>
									<span
										style="width: 6px; height: 6px; border-radius: 50%; background: {editCs.dot}; flex-shrink: 0;"
									></span>
									{draftName.trim().toLowerCase() || 'tag name'}
								</span>
							</div>
							<!-- Color picker -->
							<div style="display: flex; flex-wrap: wrap; gap: 7px;">
								{#each ALL_COLORS as c}
									{@const dot = TAG_COLORS[c].dot}
									{@const selected = c === draftColor}
									<button
										type="button"
										title={c}
										onclick={() => (draftColor = c)}
										style="
											width: 24px; height: 24px; border-radius: 50%;
											background: {dot}; border: none; cursor: pointer; padding: 0;
											display: flex; align-items: center; justify-content: center;
											outline: {selected ? '2px solid hsl(var(--foreground))' : '2px solid transparent'};
											outline-offset: 2px; transition: outline-color 0.12s;
										"
									>
										{#if selected}
											<Check size={12} color="#fff" />
										{/if}
									</button>
								{/each}
							</div>
							{#if editError}
								<div
									style="font-size: 12px; color: hsl(var(--destructive)); margin-top: 10px;"
								>
									{editError}
								</div>
							{/if}
							<!-- Footer -->
							<div
								style="display: flex; align-items: center; justify-content: space-between; margin-top: 16px;"
							>
								{#if confirmingDeleteId === tag.id}
									<div style="display: flex; align-items: center; gap: 8px;">
										<span style="font-size: 12px; color: hsl(var(--muted-foreground));">
											{tag.usageCount > 0
												? `Remove from ${tag.usageCount} record${tag.usageCount !== 1 ? 's' : ''}?`
												: 'Delete this tag?'}
										</span>
										<button
											onclick={() => (confirmingDeleteId = null)}
											style="
												font-size: 12px; font-weight: 500; padding: 4px 10px;
												border-radius: 5px; border: 1px solid transparent;
												background: transparent; color: hsl(var(--muted-foreground));
												cursor: pointer;
											"
										>
											Cancel
										</button>
										<button
											onclick={() => doDelete(tag.id)}
											style="
												font-size: 12px; font-weight: 500; padding: 4px 10px;
												border-radius: 5px; border: none;
												background: hsl(var(--destructive));
												color: hsl(var(--destructive-foreground));
												cursor: pointer;
											"
										>
											Delete
										</button>
									</div>
								{:else}
									<button
										onclick={() => (confirmingDeleteId = tag.id)}
										style="
											display: inline-flex; align-items: center; gap: 5px;
											font-size: 13px; font-weight: 500; padding: 5px 10px;
											border-radius: 6px; border: 1px solid transparent;
											background: transparent; color: hsl(var(--destructive));
											cursor: pointer;
										"
										onmouseenter={(e) => {
											(e.currentTarget as HTMLElement).style.background =
												'hsl(var(--destructive) / 0.08)';
										}}
										onmouseleave={(e) => {
											(e.currentTarget as HTMLElement).style.background = 'transparent';
										}}
									>
										<Trash2 size={14} />
										Delete
									</button>
								{/if}

								<div style="display: flex; gap: 8px;">
									<button
										onclick={cancelEdit}
										style="
											font-size: 13px; font-weight: 500; padding: 5px 12px;
											border-radius: 6px; border: 1px solid transparent;
											background: transparent; color: hsl(var(--foreground));
											cursor: pointer;
										"
										onmouseenter={(e) => {
											(e.currentTarget as HTMLElement).style.background =
												'hsl(var(--secondary))';
										}}
										onmouseleave={(e) => {
											(e.currentTarget as HTMLElement).style.background = 'transparent';
										}}
									>
										Cancel
									</button>
									<button
										onclick={saveEdit}
										style="
											font-size: 13px; font-weight: 500; padding: 5px 12px;
											border-radius: 6px; border: none;
											background: hsl(var(--primary));
											color: hsl(var(--primary-foreground));
											cursor: pointer;
										"
									>
										Save
									</button>
								</div>
							</div>
						</div>
					{:else}
						<!-- Normal row -->
						{@const cs = tagStyle(tag.color)}
						<div style="display: flex; align-items: center; gap: 14px; padding: 12px 18px;">
							<!-- Tag badge -->
							<div style="min-width: 150px; flex-shrink: 0;">
								<span
									style="
										display: inline-flex; align-items: center; gap: 5px;
										padding: 3px 10px; border-radius: 9999px;
										font-size: 12px; font-weight: 500; line-height: 18px;
										white-space: nowrap;
										background: {cs.fill}; color: {cs.text};
									"
								>
									<span
										style="width: 6px; height: 6px; border-radius: 50%; background: {cs.dot}; flex-shrink: 0;"
									></span>
									{tag.name}
								</span>
							</div>
							<!-- Usage count -->
							<div class="text-caption" style="flex: 1;">
								{tag.usageCount > 0
									? `Used in ${tag.usageCount} record${tag.usageCount !== 1 ? 's' : ''}`
									: 'Unused'}
							</div>
							<!-- Edit button -->
							<button
								onclick={() => startEdit(tag.id)}
								title="Edit tag"
								style="
									width: 28px; height: 28px; border-radius: 6px;
									border: none; background: transparent;
									color: hsl(var(--muted-foreground));
									cursor: pointer; display: flex; align-items: center; justify-content: center;
									flex-shrink: 0;
								"
								onmouseenter={(e) => {
									(e.currentTarget as HTMLElement).style.background = 'hsl(var(--secondary))';
								}}
								onmouseleave={(e) => {
									(e.currentTarget as HTMLElement).style.background = 'transparent';
								}}
							>
								<Pencil size={15} />
							</button>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>
