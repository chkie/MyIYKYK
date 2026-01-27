/**
 * Copy System - Centralized UI Text Management
 * 
 * Usage:
 *   import { t } from '$lib/copy';
 *   
 *   // Simple key
 *   t('common.save') → 'Speichern'
 *   
 *   // With parameters
 *   t('confirm.deleteExpense', { name: 'Brot' }) → "'Brot' wirklich löschen?"
 */
import { de } from './de.js';
import type { CopyKeys, Params } from './types.js';

// Current locale (default: German)
// Future: support locale switching via setLocale('en')
let currentLocale = de;

/**
 * Get translated text by key
 * 
 * @param key - Dot-notation key (e.g. 'nav.overview')
 * @param params - Optional parameters for template interpolation
 * @returns Translated string
 * 
 * @example
 * t('common.save') // → 'Speichern'
 * t('confirm.deleteExpense', { name: 'Brot' }) // → "'Brot' wirklich löschen?"
 */
export function t(key: CopyKeys, params?: Params): string {
	const value = getNestedValue(currentLocale, key);

	// Fallback: return key if not found
	if (value === undefined || value === null) {
		console.warn(`[copy] Missing translation key: ${key}`);
		return key;
	}

	// Handle non-string values
	if (typeof value !== 'string') {
		console.warn(`[copy] Translation key is not a string: ${key}`);
		return String(value);
	}

	// No params: return as-is
	if (!params) {
		return value;
	}

	// Template substitution: replace {variableName} with param value
	return Object.entries(params).reduce(
		(str, [paramKey, paramValue]) =>
			str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue)),
		value
	);
}

/**
 * Get nested value from object by dot-notation path
 * 
 * @example
 * getNestedValue({ nav: { overview: 'X' } }, 'nav.overview') → 'X'
 */
function getNestedValue(obj: any, path: string): unknown {
	return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Future: Set active locale
 * 
 * @param locale - Locale code (e.g. 'en', 'de')
 */
export function setLocale(locale: string): void {
	// TODO: Implement locale switching
	// For now: only 'de' supported
	if (locale !== 'de') {
		console.warn(`[copy] Locale '${locale}' not yet supported. Falling back to 'de'.`);
	}
}

// Re-export types for convenience
export type { CopyKeys } from './types.js';
