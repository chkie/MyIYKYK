import { describe, it, expect } from 'vitest';
import type { createFixedItem } from './fixed-costs.js';

/** Input-Shape des zweiten Parameters von createFixedItem (Signatur-Guard). */
type CreateFixedItemInput = Parameters<typeof createFixedItem>[1];

describe('createFixedItem - createdBy parameter', () => {
	it('should accept createdBy as part of the input', () => {
		const validInput: CreateFixedItemInput = {
			label: 'Miete',
			amount: 1000,
			splitMode: 'income',
			createdBy: 'profile-steffi'
		};

		expect(validInput.createdBy).toBe('profile-steffi');
	});

	it('should allow createdBy to be omitted (optional)', () => {
		const validInput: CreateFixedItemInput = {
			label: 'Strom',
			amount: 50,
			splitMode: 'income'
			// createdBy is omitted - should be valid
		};

		expect(validInput.createdBy).toBeUndefined();
	});
});
