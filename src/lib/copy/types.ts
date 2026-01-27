/**
 * TypeScript Types for Copy System
 */
import type { DeTranslations } from './de.js';

/**
 * Parameters for template string interpolation
 * Example: t('confirm.deleteExpense', { name: 'Brot' })
 */
export type Params = Record<string, string | number>;

/**
 * Copy keys as string literals
 * 
 * Note: Full type inference causes "excessively deep" TS errors due to nesting.
 * We use a simpler string type for now, with runtime validation.
 * Auto-completion still works via JSDoc in most editors.
 */
export type CopyKeys = string;
