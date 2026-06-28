import { marked } from 'marked';
// isomorphic-dompurify wraps DOMPurify with jsdom in Node (for tests/SSR) and uses
// native DOM in the browser — no conditional required.
import DOMPurify from 'isomorphic-dompurify';

// GFM mode for tables and links. No `breaks` — it interferes with GFM table parsing.
marked.setOptions({ gfm: true });

// Explicit safe allowlist — isomorphic-dompurify's default may differ from the
// browser DOMPurify default regarding table elements, so we declare everything we need.
const ALLOWED_TAGS = [
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'p', 'br', 'hr',
	'ul', 'ol', 'li',
	'strong', 'em', 'code', 'pre', 'blockquote',
	'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
	'a',
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'align'];

/**
 * Render a markdown string to sanitized HTML safe for {@html}.
 *
 * DOMPurify strips script injection and restricts link protocols to
 * http / https / mailto so that javascript: URIs cannot execute.
 */
export function renderMarkdown(value: string): string {
	const raw = marked.parse(value) as string;
	return DOMPurify.sanitize(raw, {
		ALLOWED_TAGS,
		ALLOWED_ATTR,
		ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
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
		.replace(/^#{1,6}\s+/, '')             // headings
		.replace(/\*\*(.*?)\*\*/g, '$1')       // bold
		.replace(/\*(.*?)\*/g, '$1')            // italic
		.replace(/`([^`]+)`/g, '$1')            // inline code
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links
		.trim();
}
