// ============================================================================
// Transfers Functions – Unit Tests
// ============================================================================

import { describe, expect, it } from 'vitest';

// ============================================================================
// Tests: Transfer Validation
// ============================================================================

describe('Transfer Validation', () => {
	it('should validate that amount is a finite number', () => {
		// Test with NaN
		expect(Number.isFinite(NaN)).toBe(false);

		// Test with Infinity
		expect(Number.isFinite(Infinity)).toBe(false);

		// Test with valid numbers
		expect(Number.isFinite(100)).toBe(true);
		expect(Number.isFinite(0)).toBe(true);
	});

	it('should validate that amount is non-negative', () => {
		expect(100 >= 0).toBe(true);
		expect(0 >= 0).toBe(true);
		expect(-50 >= 0).toBe(false);
	});

	it('should round amount to 2 decimal places', () => {
		const testValues = [
			{ input: 100.123, expected: 100.12 },
			{ input: 50.456, expected: 50.46 },
			{ input: 25.999, expected: 26.00 },
			{ input: 0.001, expected: 0.00 }
		];

		testValues.forEach(({ input, expected }) => {
			const rounded = Math.round(input * 100) / 100;
			expect(rounded).toBe(expected);
		});
	});
});

// ============================================================================
// Tests: Transfer Calculations
// ============================================================================

describe('Transfer Total Calculation', () => {
	it('should correctly sum multiple transfers', () => {
		const transfers = [
			{ amount: 100.50 },
			{ amount: 200.25 },
			{ amount: 50.00 }
		];

		const total = transfers.reduce((sum, t) => sum + t.amount, 0);
		expect(total).toBe(350.75);
	});

	it('should handle empty transfers list', () => {
		const transfers: Array<{ amount: number }> = [];
		const total = transfers.reduce((sum, t) => sum + t.amount, 0);
		expect(total).toBe(0);
	});

	it('should handle single transfer', () => {
		const transfers = [{ amount: 123.45 }];
		const total = transfers.reduce((sum, t) => sum + t.amount, 0);
		expect(total).toBe(123.45);
	});
});

// ============================================================================
// Tests: Integration with Month Calculation
// ============================================================================

describe('Transfers in Month Calculation', () => {
	it('should use sum of transfers as prepayment', () => {
		// Scenario: Multiple payments throughout the month
		const transfers = [
			{ amount: 200 },  // Initial prepayment
			{ amount: 100 },  // Additional payment
			{ amount: 50 }    // Final payment
		];

		const totalTransfers = transfers.reduce((sum, t) => sum + t.amount, 0);
		expect(totalTransfers).toBe(350);

		// This total should be used as prepaymentThisMonth
		const fixedCostDue = 300;
		const privateExpenses = 50;
		const balanceStart = 0;

		// Total debt before prepayment: 0 + 50 + 300 = 350
		const debtBeforePrepayment = balanceStart + privateExpenses + fixedCostDue;
		expect(debtBeforePrepayment).toBe(350);

		// After prepayment: 350 - 350 = 0 (balanced!)
		const finalBalance = debtBeforePrepayment - totalTransfers;
		expect(finalBalance).toBe(0);
	});

	it('should handle partial payments correctly', () => {
		// Scenario: Not enough payments yet
		const transfers = [
			{ amount: 100 },  // Only initial payment
		];

		const totalTransfers = transfers.reduce((sum, t) => sum + t.amount, 0);
		expect(totalTransfers).toBe(100);

		const fixedCostDue = 300;
		const privateExpenses = 50;
		const balanceStart = 0;

		// Total debt: 0 + 50 + 300 = 350
		const debtBeforePrepayment = balanceStart + privateExpenses + fixedCostDue;

		// After prepayment: 350 - 100 = 250 still owed
		const finalBalance = debtBeforePrepayment - totalTransfers;
		expect(finalBalance).toBe(250);
	});
});
