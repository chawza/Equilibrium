<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import RecordRow from './RecordRow.svelte';
	import { formatCurrency } from '$lib/utils/format';
	import type { Record as BudgetRec, RecordType, Tag } from '$lib/types';

	interface SavePayload {
		emoji: string;
		label: string;
		amount: number;
		notes: string | null;
	}

	interface Props {
		type: RecordType;
		records: BudgetRec[];
		total: number;
		editingId: number | null;
		draftRecord?: BudgetRec | null;
		onstartedit: (id: number) => void;
		onstopedit: () => void;
		onsave: (id: number, payload: SavePayload) => void;
		ondelete: (id: number) => void;
		onsettags: (id: number, tagIds: number[]) => void;
		onadd: () => void;
	}

	let { type, records, total, editingId, draftRecord = null, onstartedit, onstopedit, onsave, ondelete, onsettags, onadd }: Props = $props();

	let isInflow = $derived(type === 'inflow');
	let accentColor = $derived(isInflow ? 'hsl(var(--inflow))' : 'hsl(var(--outflow))');
</script>

<div style="display: flex; flex-direction: column; height: 100%;">
	<!-- Column header -->
	<div
		style="
			display: flex; align-items: center; justify-content: space-between;
			margin-bottom: 10px; padding: 0 4px;
		"
	>
		<div style="display: flex; align-items: center; gap: 6px;">
			<div
				style="
					width: 8px; height: 8px; border-radius: 50%;
					background: {accentColor}; opacity: 0.7;
				"
			></div>
			<span
				style="
					font-size: 13px; font-weight: 600; text-transform: uppercase;
					letter-spacing: 0.06em; color: hsl(var(--muted-foreground));
				"
			>
				{type}
			</span>
		</div>
		<button
			type="button"
			onclick={onadd}
			aria-label="Add {type} record"
			style="
				width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
				border-radius: 6px; border: none; background: transparent; cursor: pointer;
			"
			onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--accent))'; }}
			onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
		>
			<Plus size={14} color={accentColor} />
		</button>
	</div>

	<!-- Records list -->
	<div style="display: flex; flex-direction: column; gap: 2px;">
		{#each records as record}
			<RecordRow
				{record}
				{type}
				editing={editingId === record.id}
				onstartedit={() => onstartedit(record.id)}
				{onstopedit}
				onsave={(payload) => onsave(record.id, payload)}
				ondelete={() => ondelete(record.id)}
				onsettags={(tagIds) => onsettags(record.id, tagIds)}
			/>
		{/each}
		{#if draftRecord}
			<RecordRow
				record={draftRecord}
				{type}
				editing={true}
				onstartedit={() => {}}
				{onstopedit}
				onsave={(payload) => onsave(draftRecord!.id, payload)}
				ondelete={onstopedit}
				onsettags={(tagIds) => onsettags(draftRecord!.id, tagIds)}
			/>
		{/if}
	</div>

	<!-- Add placeholder (hidden while a draft is open) -->
	{#if !draftRecord}
	<div style="margin-top: 6px;">
		<button
			type="button"
			onclick={onadd}
			style="
				width: 100%; padding: 10px 12px;
				border: 1.5px dashed hsl(var(--border)); border-radius: var(--radius);
				background: transparent; cursor: pointer;
				display: flex; align-items: center; justify-content: center; gap: 6px;
				color: hsl(var(--muted-foreground)); font-size: 13px;
				transition: border-color 0.15s, color 0.15s, background 0.15s;
			"
			onmouseenter={(e) => {
				const el = e.currentTarget as HTMLElement;
				el.style.borderColor = isInflow ? 'hsl(var(--inflow) / 0.4)' : 'hsl(var(--outflow) / 0.4)';
				el.style.color = accentColor;
				el.style.background = isInflow ? 'hsl(var(--inflow) / 0.04)' : 'hsl(var(--outflow) / 0.04)';
			}}
			onmouseleave={(e) => {
				const el = e.currentTarget as HTMLElement;
				el.style.borderColor = 'hsl(var(--border))';
				el.style.color = 'hsl(var(--muted-foreground))';
				el.style.background = 'transparent';
			}}
		>
			<Plus size={14} />
			Add {type}
		</button>
	</div>
	{/if}

	<!-- Spacer: pushes total to the bottom so both columns align -->
	<div style="flex: 1; min-height: 12px;"></div>

	<!-- Column total -->
	<div
		style="
			display: flex; align-items: center; justify-content: space-between;
			padding: 10px 12px 0; margin-top: 8px;
			border-top: 1px solid hsl(var(--border));
		"
	>
		<span
			style="
				font-size: 12px; font-weight: 500; text-transform: uppercase;
				letter-spacing: 0.04em; color: hsl(var(--muted-foreground));
			"
		>
			Total
		</span>
		<span
			style="
				font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums;
				color: {accentColor};
			"
		>
			{formatCurrency(total)}
		</span>
	</div>
</div>
