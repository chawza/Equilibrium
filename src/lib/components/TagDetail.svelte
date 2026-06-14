<script lang="ts">
	import { goto } from '$app/navigation';
	import { ChevronLeft } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { commands, type TagRecord } from '$lib/bindings';
	import { tagsStore, type TagWithUsage } from '$lib/stores/tags.svelte';
	import { formatCurrency } from '$lib/utils/format';
	import TagBadge from '$lib/components/TagBadge.svelte';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import ConfirmPopover from '$lib/components/ConfirmPopover.svelte';
	import type { ColorKey, Tag } from '$lib/types';

	interface Props {
		tagId: number;
		onback: () => void;
	}

	let { tagId, onback }: Props = $props();

	const TAG_DETAIL_PAGE_SIZE = 6;

	function unwrap<T>(result: { status: 'ok'; data: T } | { status: 'error'; error: string }): T {
		if (result.status === 'ok') return result.data;
		throw new Error(result.error);
	}

	// Resolve the current tag from the store.
	const tag = $derived(tagsStore.list.find((t) => t.id === tagId) ?? null);

	// Edit form state.
	let draftName = $state('');
	let draftColor = $state<ColorKey>('blue');
	let editError = $state('');
	let saved = $state(false);

	// Re-sync drafts when the tag changes (e.g. after rename or switching tags).
	$effect(() => {
		if (tag) {
			draftName = tag.name;
			draftColor = tag.color as ColorKey;
			editError = '';
		}
	});

	const dirty = $derived(
		tag !== null && (draftName.trim().toLowerCase() !== tag.name || draftColor !== tag.color)
	);

	// Preview tag (synthetic object for TagBadge).
	const previewTag = $derived<Tag>({
		id: tagId,
		name: draftName.trim().toLowerCase() || 'tag name',
		color: draftColor
	});

	// Records for this tag — loaded via listRecordsByTag (backend query).
	let allRecords = $state<TagRecord[]>([]);
	let recordsLoading = $state(false);

	$effect(() => {
		// Re-run whenever tagId changes.
		void tagId;
		recordsLoading = true;
		commands.listRecordsByTag(tagId).then((result) => {
			try {
				allRecords = unwrap(result);
			} catch {
				allRecords = [];
			}
			recordsLoading = false;
		});
	});

	const inflowSum = $derived(
		allRecords.filter((r) => r.type === 'inflow').reduce((s, r) => s + r.amount, 0)
	);
	const outflowSum = $derived(
		allRecords.filter((r) => r.type === 'outflow').reduce((s, r) => s + r.amount, 0)
	);

	// Search + filter state.
	let query = $state('');
	let typeFilter = $state<'all' | 'inflow' | 'outflow'>('all');
	let pageNum = $state(0);

	// Reset page when query/filter changes.
	$effect(() => {
		query;
		typeFilter;
		pageNum = 0;
	});

	const filteredRecords = $derived(
		allRecords.filter((r) => {
			if (typeFilter !== 'all' && r.type !== typeFilter) return false;
			if (query.trim()) {
				return r.label.toLowerCase().includes(query.trim().toLowerCase());
			}
			return true;
		})
	);

	const totalPages = $derived(Math.max(1, Math.ceil(filteredRecords.length / TAG_DETAIL_PAGE_SIZE)));
	const clampedPage = $derived(Math.min(pageNum, totalPages - 1));
	const pageRecords = $derived(
		filteredRecords.slice(clampedPage * TAG_DETAIL_PAGE_SIZE, (clampedPage + 1) * TAG_DETAIL_PAGE_SIZE)
	);

	// Save changes.
	async function save() {
		if (!tag || !dirty) return;
		const name = draftName.trim().toLowerCase();
		if (!name) {
			editError = 'Tag name cannot be empty.';
			return;
		}
		if (name !== tag.name && tagsStore.list.some((t) => t.name === name)) {
			editError = `A tag named "${name}" already exists.`;
			return;
		}
		try {
			await tagsStore.update(tagId, name, draftColor);
			editError = '';
			saved = true;
			setTimeout(() => (saved = false), 1500);
			toast.success('Tag updated');
		} catch (e) {
			editError = String(e);
			toast.error(`Failed to update tag: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	async function doDelete() {
		try {
			await tagsStore.delete(tagId);
			toast.success('Tag deleted');
			onback();
		} catch (e) {
			toast.error(`Failed to delete tag: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	const typeFilters: Array<['all' | 'inflow' | 'outflow', string]> = [
		['all', 'All'],
		['inflow', 'Inflow'],
		['outflow', 'Outflow']
	];
</script>

{#if tag}
	<div class="page-enter" style="max-width: 620px; margin: 0 auto;">
		<!-- Back button -->
		<button
			type="button"
			onclick={onback}
			style="
				display: inline-flex; align-items: center; gap: 5px; margin-bottom: 18px;
				background: transparent; border: none; cursor: pointer; padding: 0;
				font-family: inherit; font-size: 13px; font-weight: 500;
				color: hsl(var(--muted-foreground));
			"
		>
			<ChevronLeft size={15} />
			All tags
		</button>

		<!-- Edit form card -->
		<div
			style="
				border: 1px solid hsl(var(--border)); border-radius: var(--radius);
				background: hsl(var(--card)); margin-bottom: 18px;
			"
		>
			<div style="padding: 18px 20px;">
				<!-- Header: live preview + record count + sums -->
				<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
					<TagBadge tag={previewTag} />
					<span class="text-caption">
						{allRecords.length} record{allRecords.length !== 1 ? 's' : ''}
						{#if outflowSum > 0}
							· <span style="color: hsl(var(--outflow));">↓ {formatCurrency(outflowSum)}</span>
						{/if}
						{#if inflowSum > 0}
							· <span style="color: hsl(var(--inflow));">↑ {formatCurrency(inflowSum)}</span>
						{/if}
					</span>
				</div>

				<!-- Name input -->
				<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
					<input
						type="text"
						bind:value={draftName}
						placeholder="Tag name"
						onkeydown={(e) => { if (e.key === 'Enter') save(); }}
						style="
							flex: 1; height: 34px; padding: 0 10px;
							border: 1px solid hsl(var(--border)); border-radius: 6px;
							background: hsl(var(--background)); color: hsl(var(--foreground));
							font-size: 13px; outline: none; font-family: inherit;
						"
					/>
				</div>

				<!-- Color picker -->
				<ColorPicker value={draftColor} onchange={(c) => (draftColor = c)} />

				{#if editError}
					<div style="font-size: 12px; color: hsl(var(--destructive)); margin-top: 12px;">
						{editError}
					</div>
				{/if}

				<!-- Footer: delete + save -->
				<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 18px;">
					<ConfirmPopover
						message={allRecords.length > 0
							? `Delete "${tag.name}"? It will be removed from ${allRecords.length} record${allRecords.length !== 1 ? 's' : ''}.`
							: `Delete "${tag.name}"?`}
						onconfirm={doDelete}
					>
						{#snippet children()}
						<button
							type="button"
							aria-label="Delete tag"
							style="
								display: inline-flex; align-items: center; gap: 6px;
								font-size: 13px; font-weight: 500; padding: 5px 12px;
								border-radius: 6px; border: none; cursor: pointer;
								background: transparent; color: hsl(var(--destructive));
							"
						>
							Delete
						</button>
						{/snippet}
					</ConfirmPopover>

					<div style="display: flex; align-items: center; gap: 10px;">
						{#if saved}
							<span class="text-caption" style="color: hsl(var(--inflow));">Saved</span>
						{/if}
						<button
							type="button"
							onclick={save}
							disabled={!dirty}
							style="
								font-size: 13px; font-weight: 500; padding: 5px 12px;
								border-radius: 6px; border: none; cursor: pointer;
								background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
								opacity: {dirty ? 1 : 0.4};
							"
						>
							Save changes
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Records section -->
		<div class="text-section-heading" style="margin-bottom: 12px;">Records</div>

		<!-- Search + type filter -->
		<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
			<div style="flex: 1;">
				<input
					type="text"
					bind:value={query}
					placeholder="Search records by title…"
					style="
						width: 100%; height: 34px; padding: 0 10px;
						border: 1px solid hsl(var(--border)); border-radius: 6px;
						background: hsl(var(--background)); color: hsl(var(--foreground));
						font-size: 13px; outline: none; font-family: inherit;
						box-sizing: border-box;
					"
				/>
			</div>
			<div
				style="
					display: flex; background: hsl(var(--secondary));
					border-radius: 8px; padding: 2px; gap: 2px; flex-shrink: 0;
				"
			>
				{#each typeFilters as [val, label]}
					<button
						type="button"
						onclick={() => (typeFilter = val)}
						style="
							border: none; cursor: pointer; font-family: inherit;
							font-size: 12px; font-weight: 500;
							padding: 6px 12px; border-radius: 6px;
							background: {typeFilter === val ? 'hsl(var(--background))' : 'transparent'};
							color: {typeFilter === val ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'};
							box-shadow: {typeFilter === val ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'};
							transition: background 0.12s, color 0.12s;
						"
					>
						{label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Records list card -->
		<div
			style="
				border: 1px solid hsl(var(--border));
				border-radius: var(--radius);
				background: hsl(var(--card));
			"
		>
			{#if recordsLoading}
				<div class="text-caption" style="padding: 28px 18px; text-align: center;">Loading…</div>
			{:else if allRecords.length === 0}
				<div class="text-caption" style="padding: 28px 18px; text-align: center;">
					No records use this tag yet.
				</div>
			{:else if filteredRecords.length === 0}
				<div class="text-caption" style="padding: 28px 18px; text-align: center;">
					No records match your search.
				</div>
			{:else}
				<div>
					{#each pageRecords as record, i}
						{@const isInflow = record.type === 'inflow'}
						{@const amtColor = isInflow ? 'hsl(var(--inflow))' : 'hsl(var(--outflow))'}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							onclick={() => goto(`/budget/${record.budgetId}`)}
							onkeydown={(e) => { if (e.key === 'Enter') goto(`/budget/${record.budgetId}`); }}
							role="button"
							tabindex="0"
							style="
								display: flex; align-items: center; gap: 12px;
								padding: 10px 18px; cursor: pointer;
								{i > 0 ? 'border-top: 1px solid hsl(var(--border));' : ''}
								transition: background 0.1s;
							"
							onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent) / 0.5)'; }}
							onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
						>
							<!-- Emoji -->
							<span style="font-size: 16px; flex-shrink: 0;">{record.emoji}</span>

							<!-- Label + budget name -->
							<div style="flex: 1; min-width: 0;">
								<div style="font-size: 13px; font-weight: 500; color: hsl(var(--foreground)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
									{record.label}
									{#if record.isAdjustment}
										<span class="text-caption" style="margin-left: 4px; opacity: 0.6;">adj.</span>
									{/if}
								</div>
								<div class="text-caption" style="margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
									{record.budgetName}
								</div>
							</div>

							<!-- Amount -->
							<div
								class="text-amount"
								style="font-size: 13px; color: {amtColor}; flex-shrink: 0;"
							>
								<span style="font-size: 11px; margin-right: 2px;">{isInflow ? '↑' : '↓'}</span>{formatCurrency(record.amount)}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Pagination -->
		{#if filteredRecords.length > TAG_DETAIL_PAGE_SIZE}
			<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px;">
				<span class="text-caption">{filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}</span>
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
						<ChevronLeft size={14} />
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
						<ChevronLeft size={14} style="transform: rotate(180deg);" />
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}
