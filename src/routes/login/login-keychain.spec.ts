import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * These tests verify the HTML structure needed for Apple Keychain/Touch ID integration.
 * We test the source code directly since browser-based tests require Playwright setup.
 */
describe('Login Page - Apple Keychain/Touch ID Integration (Source Code)', () => {
	let pageSource: string;

	// Read the +page.svelte source code
	const pagePath = join(__dirname, '+page.svelte');
	pageSource = readFileSync(pagePath, 'utf-8');

	it('should have hidden username field with autocomplete="username" for Keychain', () => {
		// Apple Keychain needs a username field to associate credentials
		expect(pageSource).toContain('type="hidden"');
		expect(pageSource).toContain('name="username"');
		expect(pageSource).toContain('value="admin"');
		expect(pageSource).toContain('autocomplete="username"');
	});

	it('should have password field with autocomplete="current-password" for Keychain', () => {
		expect(pageSource).toContain('type="password"');
		expect(pageSource).toContain('name="password"');
		expect(pageSource).toContain('autocomplete="current-password');
	});

	it('should have webauthn hint in autocomplete for biometric auth', () => {
		// "webauthn" in autocomplete signals support for biometric authentication
		expect(pageSource).toContain('webauthn');
	});

	it('should have form with POST method', () => {
		expect(pageSource).toContain('method="POST"');
	});

	it('should have password field with required attribute', () => {
		// Find the password input section
		const passwordInputMatch = pageSource.match(/type="password"[^>]*>/);
		expect(passwordInputMatch).toBeTruthy();
		expect(passwordInputMatch![0]).toContain('required');
	});

	it('should have password field with autofocus for better UX', () => {
		const passwordInputMatch = pageSource.match(/type="password"[^>]*>/);
		expect(passwordInputMatch).toBeTruthy();
		expect(passwordInputMatch![0]).toContain('autofocus');
	});

	it('should have password field with id="password" matching label', () => {
		expect(pageSource).toContain('id="password"');
		expect(pageSource).toContain('for="password"');
	});

	it('should display error message conditionally', () => {
		// Check for conditional rendering of error
		expect(pageSource).toContain('{#if form?.error}');
		expect(pageSource).toContain('{form.error}');
	});

	it('should have submit button', () => {
		expect(pageSource).toContain('type="submit"');
		expect(pageSource).toContain('Anmelden');
	});
});

