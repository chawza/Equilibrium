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
		class="notes-body cursor-pointer rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50"
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

<style>
	/* Scoped styles for the rendered markdown container.
	   Tailwind's preflight resets heading/table defaults, so we restore them here
	   using the app's CSS custom properties. All selectors use :global() so they
	   reach the {@html} subtree that Svelte cannot scope automatically. */

	.notes-body :global(h1) { font-size: 1.2em; font-weight: 700; margin: 0.75em 0 0.3em; line-height: 1.3; }
	.notes-body :global(h2) { font-size: 1.1em; font-weight: 600; margin: 0.6em 0 0.25em; line-height: 1.3; }
	.notes-body :global(h3),
	.notes-body :global(h4),
	.notes-body :global(h5),
	.notes-body :global(h6) { font-size: 1em; font-weight: 600; margin: 0.5em 0 0.2em; }

	.notes-body :global(p) { margin: 0.4em 0; line-height: 1.55; font-size: 0.875rem; }
	.notes-body :global(p:first-child) { margin-top: 0; }
	.notes-body :global(p:last-child) { margin-bottom: 0; }

	.notes-body :global(ul) { list-style: disc; padding-left: 1.3em; margin: 0.35em 0; }
	.notes-body :global(ol) { list-style: decimal; padding-left: 1.3em; margin: 0.35em 0; }
	.notes-body :global(li) { margin: 0.15em 0; font-size: 0.875rem; line-height: 1.5; }

	.notes-body :global(strong) { font-weight: 600; }
	.notes-body :global(em) { font-style: italic; }

	.notes-body :global(code) {
		font-family: monospace;
		font-size: 0.82em;
		background: hsl(var(--muted));
		color: hsl(var(--foreground));
		padding: 0.1em 0.35em;
		border-radius: 4px;
	}
	.notes-body :global(pre) {
		background: hsl(var(--muted));
		border-radius: 6px;
		padding: 0.65em 0.9em;
		overflow-x: auto;
		margin: 0.5em 0;
	}
	.notes-body :global(pre code) { background: transparent; padding: 0; }

	.notes-body :global(table) {
		border-collapse: collapse;
		width: 100%;
		margin: 0.6em 0;
		font-size: 0.82rem;
	}
	.notes-body :global(th) {
		border: 1px solid hsl(var(--border));
		padding: 0.3em 0.65em;
		font-weight: 600;
		background: hsl(var(--muted) / 0.5);
		text-align: left;
	}
	.notes-body :global(td) {
		border: 1px solid hsl(var(--border));
		padding: 0.3em 0.65em;
	}

	.notes-body :global(a) {
		color: hsl(var(--primary));
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.notes-body :global(a:hover) { opacity: 0.8; }

	.notes-body :global(blockquote) {
		border-left: 3px solid hsl(var(--border));
		padding-left: 0.75em;
		color: hsl(var(--muted-foreground));
		margin: 0.5em 0;
		font-style: italic;
	}

	.notes-body :global(hr) {
		border: none;
		border-top: 1px solid hsl(var(--border));
		margin: 0.75em 0;
	}
</style>
