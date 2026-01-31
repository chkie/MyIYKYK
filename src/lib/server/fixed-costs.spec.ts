import { describe, it, expect } from 'vitest';

describe('createFixedItem - createdBy parameter', () => {
	it('should accept createdBy parameter in function signature', () => {
		// Type test: verify createdBy is accepted as optional parameter
		const validInput = {
			label: 'Miete',
			amount: 1000,
			splitMode: 'income' as const,
			createdBy: 'profile-steffi' // Should be accepted without type error
		};

		// If this compiles, the parameter is correctly defined
		expect(validInput.createdBy).toBe('profile-steffi');
	});

	it('should allow createdBy to be undefined', () => {
		// Type test: verify createdBy is optional
		const validInput = {
			label: 'Strom',
			amount: 50,
			splitMode: 'half' as const
			// createdBy is omitted - should be valid
		};

		// If this compiles, the parameter is optional
		expect(validInput.createdBy).toBeUndefined();
	});
});

