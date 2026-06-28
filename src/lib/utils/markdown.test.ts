import { describe, it, expect } from 'vitest';
import { renderMarkdown, notePreview } from './markdown';

describe('renderMarkdown', () => {
	it('renders headings', () => {
		const html = renderMarkdown('# Title');
		expect(html).toContain('<h1');
		expect(html).toContain('Title');
	});

	it('renders unordered lists', () => {
		const html = renderMarkdown('- one\n- two');
		expect(html).toContain('<ul');
		expect(html).toContain('<li');
		expect(html).toContain('one');
	});

	it('renders bold text', () => {
		const html = renderMarkdown('**bold**');
		expect(html).toContain('<strong>bold</strong>');
	});

	it('renders italic text', () => {
		const html = renderMarkdown('*italic*');
		expect(html).toContain('<em>italic</em>');
	});

	it('renders inline code', () => {
		const html = renderMarkdown('`code`');
		expect(html).toContain('<code>code</code>');
	});

	it('renders GFM tables', () => {
		const md = '| A | B |\n|---|---|\n| 1 | 2 |';
		const html = renderMarkdown(md);
		expect(html).toContain('<table');
		expect(html).toContain('<th');
		expect(html).toContain('<td');
	});

	it('renders links with href', () => {
		const html = renderMarkdown('[Example](https://example.com)');
		expect(html).toContain('<a');
		expect(html).toContain('href');
		expect(html).toContain('example.com');
	});

	it('strips javascript: protocol links (XSS)', () => {
		// DOMPurify should remove href with javascript: protocol.
		const html = renderMarkdown('[click](javascript:alert(1))');
		expect(html).not.toContain('javascript:');
	});

	it('strips injected <script> tags (XSS)', () => {
		const html = renderMarkdown('hello <script>alert(1)</script> world');
		expect(html).not.toContain('<script>');
		expect(html).not.toContain('alert(1)');
	});

	it('escapes raw HTML angle brackets in text', () => {
		const html = renderMarkdown('a < b > c');
		// The < and > should be entity-encoded, not raw tags.
		expect(html).not.toMatch(/<(?!\/?(p|strong|em|code|ul|li|h[1-6]|table|thead|tbody|tr|th|td|a)\b)/);
	});
});

describe('notePreview', () => {
	it('returns first non-empty line without heading marker', () => {
		expect(notePreview('# My Budget\nsome text')).toBe('My Budget');
	});

	it('strips bold from preview', () => {
		expect(notePreview('**important note**')).toBe('important note');
	});

	it('strips italic from preview', () => {
		expect(notePreview('*note*')).toBe('note');
	});

	it('strips inline code from preview', () => {
		expect(notePreview('`code`')).toBe('code');
	});

	it('strips link syntax from preview', () => {
		expect(notePreview('[link text](https://example.com)')).toBe('link text');
	});

	it('returns first non-blank line when first line is empty', () => {
		expect(notePreview('\n\nactual content')).toBe('actual content');
	});

	it('returns empty string for empty input', () => {
		expect(notePreview('')).toBe('');
	});
});
