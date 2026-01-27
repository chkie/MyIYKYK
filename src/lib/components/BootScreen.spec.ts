import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * BootScreen component tests - Source code verification
 */
describe('BootScreen Component', () => {
	// Read the component source code
	const componentPath = join(__dirname, 'BootScreen.svelte');
	const componentSource = readFileSync(componentPath, 'utf-8');

	it('has accessibility attributes (role, aria-live, aria-label)', () => {
		expect(componentSource).toContain('role="status"');
		expect(componentSource).toContain('aria-live="polite"');
		expect(componentSource).toContain('aria-label="Anwendung wird geladen"');
	});

	it('includes logo with picture element for WebP support', () => {
		expect(componentSource).toContain('<picture>');
		expect(componentSource).toContain('srcset="/webtool_logo.webp"');
		expect(componentSource).toContain('src="/webtool_logo.png"');
	});

	it('has screen reader only text', () => {
		expect(componentSource).toContain('class="sr-only"');
		expect(componentSource).toContain('Lädt...');
	});

	it('has spinner with aria-hidden', () => {
		expect(componentSource).toContain('class="boot-spinner"');
		expect(componentSource).toContain('aria-hidden="true"');
	});

	it('respects prefers-reduced-motion', () => {
		expect(componentSource).toContain('@media (prefers-reduced-motion');
		expect(componentSource).toContain('animation: none');
	});

	it('has anti-flicker delay (150ms)', () => {
		expect(componentSource).toContain('150ms');
	});

	it('has auto-fadeout fallback', () => {
		expect(componentSource).toContain('bootFadeOut');
		expect(componentSource).toContain('5s');
	});
});
