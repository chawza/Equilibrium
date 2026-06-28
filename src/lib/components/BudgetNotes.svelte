<script lang="ts">
	import { StickyNote, Check, ChevronDown, ChevronUp, Pencil } from '@lucide/svelte';
	import { renderMarkdown, notePreview } from '$lib/utils/markdown';

	interface Props {
		value: string;
		onChange: (notes: string) => void;
	}

	let { value, onChange }: Props = $props();

	let editing = $state(false);
	let expanded = $state(false);
	let draft = $state(value);
	let textarea: HTMLTextAreaElement | undefined = $state();

	// Keep draft in sync if value changes externally (e.g., on first load).
	$effect(() => {
		// Read value inside the effect body so Svelte tracks it reactively.
		const v = value;
		draft = v;
	});

	// Auto-collapse when content is cleared.
	$effect(() => {
		if (!value.trim()) expanded = false;
	});

	// Focus and position cursor when entering edit mode.
	$effect(() => {
		if (editing && textarea) {
			const ta = textarea;
			ta.focus();
			ta.setSelectionRange(ta.value.length, ta.value.length);
			ta.style.height = 'auto';
			ta.style.height = ta.scrollHeight + 'px';
		}
	});

	function startEdit() {
		expanded = true;
		editing = true;
	}

	function commit() {
		editing = false;
		const next = draft;
		if (next !== value) onChange(next);
		expanded = next.trim().length > 0;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			draft = value; // discard changes
			editing = false;
			expanded = value.trim().length > 0;
		}
	}

	function autoGrow(e: Event) {
		const ta = e.currentTarget as HTMLTextAreaElement;
		ta.style.height = 'auto';
		ta.style.height = ta.scrollHeight + 'px';
	}

	const hasContent = $derived(value.trim().length > 0);
	const preview = $derived(hasContent ? notePreview(value) : '');
	const rendered = $derived(hasContent ? renderMarkdown(value) : '');
</script>

<!-- ── Editing ── -->
{#if editing}
<div class="border-l-2 border-border pl-3.5">
	<p class="mb-1.5 text-xs font-medium text-muted-foreground">Notes</p>
	<textarea
		bind:this={textarea}
		bind:value={draft}
		oninput={autoGrow}
		onkeydown={onKeydown}
		rows={4}
		placeholder="Write a note…  supports # heading, - list, **bold**, *italic*, `code`"
		class="w-full resize-none rounded-md bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
		style="min-height: 96px;"
	></textarea>
	<div class="mt-2 flex items-center gap-2.5">
		<span class="mr-auto text-[11px] text-muted-foreground">Markdown · Esc or Save to render</span>
		<button
			onmousedown={(e) => { e.preventDefault(); commit(); }}
			class="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
		>
			<Check size={12} />
			Save
		</button>
	</div>
</div>

<!-- ── Empty ── -->
{:else if !hasContent}
<button
	onclick={startEdit}
	class="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
	style="margin-left: -8px;"
>
	<StickyNote size={14} />
	Add a note
</button>

<!-- ── Collapsed (one-line summary) ── -->
{:else if !expanded}
<button
	onclick={() => (expanded = true)}
	class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
	style="margin-left: -8px;"
>
	<StickyNote size={14} class="shrink-0 text-muted-foreground" />
	<span class="flex-1 truncate text-sm text-foreground">{preview}</span>
	<ChevronDown size={14} class="shrink-0 text-muted-foreground" />
</button>

<!-- ── Expanded (rendered markdown) ── -->
{:else}
<div>
	<div class="mb-1.5 flex items-center gap-2">
		<button
			onclick={() => (expanded = false)}
			class="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
		>
			<ChevronUp size={12} />
			Notes
		</button>
		<button
			onclick={startEdit}
			class="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
		>
			<Pencil size={11} />
			Edit
		</button>
	</div>
	<div
		class="prose prose-sm dark:prose-invert max-w-none cursor-pointer rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50"
		style="margin-left: -8px;"
		onclick={startEdit}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && startEdit()}
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html rendered}
	</div>
</div>
{/if}
