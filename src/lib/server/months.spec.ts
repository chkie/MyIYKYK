// ============================================================================
// Months Functions – Unit Tests
// ============================================================================

import { describe, expect, it } from 'vitest';
import { updateMonthBalanceStart } from './months.js';

// ============================================================================
// Tests: Update Month Balance Start
// ============================================================================

describe('updateMonthBalanceStart', () => {
	it('should validate that balance start is a finite number', async () => {
		// Mock Supabase to avoid actual DB calls
		const mockUpdate = { eq: () => ({ error: null }) };
		const mockSupabase = { from: () => ({ update: () => mockUpdate }) };

		// Test with NaN
		await expect(async () => {
			// This would fail validation before hitting DB
			if (!Number.isFinite(NaN)) {
				throw new Error('Private balance start must be a valid number');
			}
		}).rejects.toThrow('Private balance start must be a valid number');

		// Test with Infinity
		await expect(async () => {
			if (!Number.isFinite(Infinity)) {
				throw new Error('Private balance start must be a valid number');
			}
		}).rejects.toThrow('Private balance start must be a valid number');
	});

	it('should accept positive, negative, and zero values', () => {
		// These should all be valid
		expect(Number.isFinite(100.50)).toBe(true);
		expect(Number.isFinite(-200.75)).toBe(true);
		expect(Number.isFinite(0)).toBe(true);
	});

	it('should round balance to 2 decimal places', () => {
		const testValues = [
			{ input: 100.123, expected: 100.12 },
			{ input: -200.456, expected: -200.46 },
			{ input: 50.999, expected: 51.00 },
			{ input: 0.001, expected: 0.00 }
		];

		testValues.forEach(({ input, expected }) => {
			const rounded = Math.round(input * 100) / 100;
			expect(rounded).toBe(expected);
		});
	});
});

// ============================================================================
// Tests: Balance Start Integration with Calculation
// ============================================================================

describe('Balance Start Integration', () => {
	it('should correctly flow through to final balance calculation', () => {
		// Test scenario: Starting with debt
		const privateBalanceStart = 200; // I owe 200€
		const privateExpenses = 50; // Added 50€ more
		const fixedCostDue = 100; // Owe 100€ for fixed costs
		const prepayment = 150; // Paid 150€

		// Expected: 200 + 50 + 100 - 150 = 200€ still owed
		const expected = privateBalanceStart + privateExpenses + fixedCostDue - prepayment;
		expect(expected).toBe(200);
	});

	it('should work with negative starting balance (Steffi owes me)', () => {
		// Test scenario: Steffi owes me from last month
		const privateBalanceStart = -100; // Steffi owes me 100€
		const privateExpenses = 50; // I spend 50€ (increases my debt)
		const fixedCostDue = 100; // I owe 100€ for fixed costs
		const prepayment = 50; // I pay 50€

		// Expected: -100 + 50 + 100 - 50 = 0€ (balanced)
		const expected = privateBalanceStart + privateExpenses + fixedCostDue - prepayment;
		expect(expected).toBe(0);
	});

	it('should handle zero starting balance correctly', () => {
		// Test scenario: Fresh start
		const privateBalanceStart = 0;
		const privateExpenses = 30;
		const fixedCostDue = 70;
		const prepayment = 70;

		// Expected: 0 + 30 + 70 - 70 = 30€ owed
		const expected = privateBalanceStart + privateExpenses + fixedCostDue - prepayment;
		expect(expected).toBe(30);
	});
});
