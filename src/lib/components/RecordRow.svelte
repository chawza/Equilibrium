<script lang="ts">
	import { untrack } from 'svelte';
	import { X, Check, Trash2 } from '@lucide/svelte';
	import EmojiGrid from './EmojiGrid.svelte';
	import TagBadge from './TagBadge.svelte';
	import TagEditor from './TagEditor.svelte';
	import ConfirmPopover from './ConfirmPopover.svelte';
	import { commands } from '$lib/bindings';
	import { formatCurrency, parseAmount, groupDigits } from '$lib/utils/format';
	import type { Record as BudgetRec, RecordType, Tag } from '$lib/types';

	interface SavePayload {
		emoji: string;
		label: string;
		amount: number;
		notes: string | null;
	}

	interface Props {
		record: BudgetRec;
		type: RecordType;
		editing: boolean;
		onstartedit: () => void;
		onstopedit: () => void;
		onsave: (payload: SavePayload) => void;
		ondelete: () => void;
		onsettags: (tagIds: number[]) => void;
	}

	let { record, type, editing, onstartedit, onstopedit, onsave, ondelete, onsettags }: Props =
		$props();

	// Edit state (reset whenever editing becomes true)
	let editLabel = $state(record.label);
	let editAmount = $state(record.amount > 0 ? groupDigits(String(record.amount)) : '');
	let editEmoji = $state(record.emoji);
	let editNotes = $state(record.notes ?? '');
	let showEmojiPicker = $state(false);
	let hovered = $state(false);

	// Whether the user explicitly clicked an emoji in the picker.
	// When false, save will call the backend for an authoritative suggestion.
	let manualEmoji = $state(false);
	// Latest suggestion returned by the backend (shown in the picker's Suggested slot).
	let suggestedEmoji = $state('📝');

	// Sync edit state only when ENTERING edit mode (editing: false → true).
	// Wrap the body in untrack so changes to `record` while already editing
	// (e.g. tag updates via setRecordTags) don't re-fire and reset the user's draft.
	$effect(() => {
		if (editing) {
			untrack(() => {
				editLabel = record.label;
				editAmount = record.amount > 0 ? groupDigits(String(record.amount)) : '';
				editEmoji = record.emoji;
				editNotes = record.notes ?? '';
				showEmojiPicker = false;
				manualEmoji = false;
				suggestedEmoji = '📝';
			});
		}
	});

	/** Ask the Rust backend for a suggestion. Updates suggestedEmoji. */
	async function refreshSuggestion() {
		const trimmed = editLabel.trim();
		if (!trimmed) { suggestedEmoji = '📝'; return; }
		suggestedEmoji = await commands.autoSuggestEmoji(trimmed);
	}

	async function handleSave() {
		const amount = parseAmount(editAmount);
		if (editLabel.trim() && amount > 0) {
			let emoji = editEmoji;
			if (!manualEmoji) {
				// No manual pick — get the authoritative backend suggestion.
				await refreshSuggestion();
				emoji = suggestedEmoji;
			}
			onsave({
				emoji,
				label: editLabel.trim(),
				amount,
				notes: editNotes.trim() || null,
			});
		}
		onstopedit();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
		if (e.key === 'Escape') onstopedit();
	}

	function handleLabelChange(val: string) {
		editLabel = val;
	}

	function handleAmountInput(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		editAmount = groupDigits(input.value);
		// Force cursor to end after re-format
		const len = editAmount.length;
		requestAnimationFrame(() => {
			input.setSelectionRange(len, len);
		});
	}

	let accentColor = $derived(type === 'inflow' ? 'hsl(var(--inflow))' : 'hsl(var(--outflow))');
</script>

{#if editing}
	<!-- ─── Edit mode ─── -->
	<div
		style="
			background: hsl(var(--card)); border: 1px solid hsl(var(--ring));
			border-radius: var(--radius); padding: 10px 12px;
			display: flex; flex-direction: column; gap: 8px;
			box-shadow: 0 0 0 2px hsl(var(--ring) / 0.08);
		"
	>
		<!-- Row 1: emoji + label + amount -->
		<div style="display: flex; align-items: center; gap: 8px;">
			<!-- Emoji button -->
			<div style="position: relative; flex-shrink: 0;">
				<button
					type="button"
					onclick={async () => {
						const next = !showEmojiPicker;
						showEmojiPicker = next;
						// Pre-fetch the backend suggestion so the Suggested slot is ready.
						if (next) await refreshSuggestion();
					}}
					style="
						width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
						border: 1px solid hsl(var(--border)); border-radius: 6px;
						background: hsl(var(--secondary)); cursor: pointer; font-size: 16px;
					"
				>
					{editEmoji}
				</button>
				{#if showEmojiPicker}
					<EmojiGrid
						selected={editEmoji}
						suggested={suggestedEmoji}
						onselect={(e) => { editEmoji = e; manualEmoji = true; showEmojiPicker = false; }}
						onclose={() => (showEmojiPicker = false)}
					/>
				{/if}
			</div>

			<!-- Label input -->
			<div style="flex: 1; min-width: 0;">
				<input
					type="text"
					autofocus
					value={editLabel}
					placeholder="Label"
					oninput={(e) => handleLabelChange((e.currentTarget as HTMLInputElement).value)}
					onkeydown={handleKeyDown}
					style="
						width: 100%; height: 34px; padding: 0 10px; font-size: 14px;
						border: 1px solid hsl(var(--input)); border-radius: var(--radius);
						background: hsl(var(--background)); color: hsl(var(--foreground));
						outline: none; transition: border-color 0.15s; box-sizing: border-box;
					"
					onfocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--ring))'; }}
					onblur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--input))'; }}
				/>
			</div>

			<!-- Amount input -->
			<div style="position: relative; flex-shrink: 0; width: 140px;">
				<span
					style="
						position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
						font-size: 13px; font-weight: 500; color: hsl(var(--muted-foreground));
						pointer-events: none;
					"
				>Rp</span>
				<input
					type="text"
					inputmode="numeric"
					value={editAmount}
					placeholder="0"
					oninput={handleAmountInput}
					onkeydown={handleKeyDown}
					style="
						width: 100%; height: 34px; padding: 0 10px 0 32px; font-size: 14px;
						font-variant-numeric: tabular-nums; text-align: right;
						border: 1px solid hsl(var(--input)); border-radius: var(--radius);
						background: hsl(var(--background)); color: hsl(var(--foreground));
						outline: none; transition: border-color 0.15s; box-sizing: border-box;
					"
					onfocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--ring))'; }}
					onblur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--input))'; }}
				/>
			</div>
		</div>

		<!-- Row 2: notes -->
		<input
			type="text"
			value={editNotes}
			oninput={(e) => (editNotes = (e.currentTarget as HTMLInputElement).value)}
			onkeydown={handleKeyDown}
			placeholder="Add a note…"
			style="
				width: 100%; height: 30px; padding: 0 10px 0 40px; font-size: 13px;
				border: 1px solid hsl(var(--input)); border-radius: 6px; outline: none;
				background: hsl(var(--background)); color: hsl(var(--foreground));
				box-sizing: border-box; transition: border-color 0.15s;
			"
			onfocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--ring))'; }}
			onblur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--input))'; }}
		/>

		<!-- Row 3: tag editor + actions -->
		<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding-left: 40px;">
			<TagEditor
				tags={record.tags}
				align={type === 'outflow' ? 'right' : 'left'}
				onchange={(tagIds) => onsettags(tagIds)}
			/>
			<div style="display: flex; gap: 4px; flex-shrink: 0;">
				<button
					type="button"
					onclick={onstopedit}
					aria-label="Cancel edit"
					style="
						width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
						border-radius: 6px; border: none; background: transparent;
						color: hsl(var(--foreground)); cursor: pointer;
					"
					onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--secondary))'; }}
					onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
				>
					<X size={14} />
				</button>
				<button
					type="button"
					onclick={handleSave}
					aria-label="Save record"
					style="
						width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
						border-radius: 6px; border: none; background: hsl(var(--secondary));
						color: hsl(var(--secondary-foreground)); cursor: pointer;
					"
					onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
					onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
				>
					<Check size={14} />
				</button>
			</div>
		</div>
	</div>
{:else}
	<!-- ─── View mode ─── -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		onclick={onstartedit}
		onmouseenter={() => (hovered = true)}
		onmouseleave={() => (hovered = false)}
		style="
			background: {hovered ? 'hsl(var(--accent))' : 'hsl(var(--card))' };
			border: 1px solid {hovered ? 'hsl(var(--border))' : 'transparent'};
			border-radius: var(--radius); padding: 8px 12px; cursor: pointer;
			transition: background 0.1s, border-color 0.1s;
			display: flex; flex-direction: column; gap: 4px;
		"
	>
		<!-- Top row: emoji + label + amount + delete -->
		<div style="display: flex; align-items: center; gap: 8px;">
			<span style="font-size: 16px; line-height: 1; width: 22px; text-align: center; flex-shrink: 0;">
				{record.emoji}
			</span>
			<span
				class="text-card-title"
				style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
			>
				{record.label || '—'}
			</span>
			<span
				class="text-amount"
				style="color: {accentColor}; flex-shrink: 0; font-variant-numeric: tabular-nums;"
			>
				{formatCurrency(record.amount)}
			</span>
			<div
				style="opacity: {hovered ? 1 : 0}; transition: opacity 0.1s; flex-shrink: 0;"
			>
				<ConfirmPopover message="Delete this record?" onconfirm={ondelete}>
					<button
						type="button"
						aria-label="Delete record"
						style="
							width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
							border-radius: 6px; border: none; background: transparent;
							color: hsl(var(--muted-foreground)); cursor: pointer;
						"
						onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--secondary))'; }}
						onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
					>
						<Trash2 size={13} />
					</button>
				</ConfirmPopover>
			</div>
		</div>

		<!-- Notes line -->
		{#if record.notes}
			<div
				style="
					padding-left: 30px; font-size: 12px; color: hsl(var(--muted-foreground));
					line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
				"
			>
				{record.notes}
			</div>
		{/if}

		<!-- Tags -->
		{#if record.tags.length > 0}
			<div style="display: flex; gap: 4px; padding-left: 30px; flex-wrap: wrap;">
				{#each record.tags as tag}
					<TagBadge {tag} />
				{/each}
			</div>
		{/if}
	</div>
{/if}
