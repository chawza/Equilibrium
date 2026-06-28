import { marked } from 'marked';
// isomorphic-dompurify wraps DOMPurify with jsdom in Node (for tests/SSR) and uses
// native DOM in the browser — no conditional required.
import DOMPurify from 'isomorphic-dompurify';

// Configure marked for GFM (tables, links, etc.) — synchronous, no async extension used.
marked.setOptions({ gfm: true, breaks: true });

/**
 * Render a markdown string to sanitized HTML safe for {@html}.
 *
 * DOMPurify strips script injection and restricts link protocols to
 * http / https / mailto so that javascript: URIs cannot execute.
 */
export function renderMarkdown(value: string): string {
	const raw = marked.parse(value) as string;
	return DOMPurify.sanitize(raw, {
		// Allow table and anchor elements (GFM subset we support).
		ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td'],
		// Restrict link href to safe protocols only.
		ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
		// Force external links to open safely.
		ADD_ATTR: ['target', 'rel'],
	});
}

/**
 * Strip markdown syntax and return the first non-empty line — used as the
 * one-line collapsed preview in the BudgetNotes component.
 */
export function notePreview(value: string): string {
	const firstLine = value
		.split('\n')
		.map((l) => l.trim())
		.find((l) => l.length > 0) ?? '';
	// Strip the most common inline markdown markers from the preview line.
	return firstLine
		.replace(/^#{1,6}\s+/, '')        // headings
		.replace(/\*\*(.*?)\*\*/g, '$1')  // bold
		.replace(/\*(.*?)\*/g, '$1')       // italic
		.replace(/`([^`]+)`/g, '$1')       // inline code
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links
		.trim();
}
