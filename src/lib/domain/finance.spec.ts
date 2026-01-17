// ============================================================================
// Finance Functions – Unit Tests
// ============================================================================

import { describe, expect, it } from 'vitest';
import {
	calculateIncomeShares,
	calculateMonth,
	calculateMyFixedShare,
	calculateMyShareForFixedItem,
	roundMoney
} from './finance.js';
import type { FixedCategory, FixedItem, MonthInputs, Person } from './types.js';

// ============================================================================
// Helper Functions for Test Data
// ============================================================================

function createPerson(role: 'me' | 'partner', netIncome: number): Person {
	return {
		role,
		name: role === 'me' ? 'Me' : 'Partner',
		netIncome
	};
}

function createFixedItem(
	amount: number,
	splitMode: 'income' | 'me' | 'partner' | 'half' = 'income'
): FixedItem {
	return {
		id: `item-${Math.random()}`,
		label: 'Test Item',
		amount,
		splitMode
	};
}

function createFixedCategory(items: FixedItem[]): FixedCategory {
	return {
		id: `cat-${Math.random()}`,
		label: 'Test Category',
		items
	};
}

// ============================================================================
// Tests: Income Shares
// ============================================================================

describe('calculateIncomeShares', () => {
	it('TEST A: income shares default (both incomes zero)', () => {
		const result = calculateIncomeShares(0, 0);

		expect(result.shareMe).toBe(0.5);
		expect(result.sharePartner).toBe(0.5);
	});

	it('handles only me having income', () => {
		const result = calculateIncomeShares(1000, 0);

		expect(result.shareMe).toBe(1);
		expect(result.sharePartner).toBe(0);
	});

	it('handles only partner having income', () => {
		const result = calculateIncomeShares(0, 2000);

		expect(result.shareMe).toBe(0);
		expect(result.sharePartner).toBe(1);
	});

	it('calculates proportional shares correctly', () => {
		const result = calculateIncomeShares(2000, 3000);

		expect(result.shareMe).toBeCloseTo(0.4, 5);
		expect(result.sharePartner).toBeCloseTo(0.6, 5);
	});

	it('TEST E: Nur einer hat Einkommen - only me', () => {
		const result = calculateIncomeShares(4000, 0);

		expect(result.shareMe).toBe(1);
		expect(result.sharePartner).toBe(0);
	});

	it('TEST E: Nur einer hat Einkommen - only partner', () => {
		const result = calculateIncomeShares(0, 4000);

		expect(result.shareMe).toBe(0);
		expect(result.sharePartner).toBe(1);
	});
});

// ============================================================================
// Tests: Split Modes
// ============================================================================

describe('calculateMyShareForFixedItem', () => {
	it('TEST B: splitMode wirkt - mode "me"', () => {
		const item = createFixedItem(100, 'me');
		const myShare = calculateMyShareForFixedItem(item, 0.25);

		expect(myShare).toBe(100);
	});

	it('TEST B: splitMode wirkt - mode "partner"', () => {
		const item = createFixedItem(100, 'partner');
		const myShare = calculateMyShareForFixedItem(item, 0.25);

		expect(myShare).toBe(0);
	});

	it('TEST B: splitMode wirkt - mode "half" (legacy, now treated as income)', () => {
		const item = createFixedItem(100, 'half');
		const myShare = calculateMyShareForFixedItem(item, 0.25);

		// Now treated as income-based: 100 * 0.25 = 25
		expect(myShare).toBe(25);
	});

	it('TEST B: splitMode wirkt - mode "income" with shareMe=0.25', () => {
		const item = createFixedItem(100, 'income');
		const myShare = calculateMyShareForFixedItem(item, 0.25);

		expect(myShare).toBe(25);
	});

	it('TEST G: Rundung auf 2 Dezimalstellen - income with 50% share', () => {
		const item = createFixedItem(10.01, 'income');
		const myShare = calculateMyShareForFixedItem(item, 0.5);

		// 50% of 10.01 = 5.005, should round to 5.01 (not 5.00)
		expect(myShare).toBe(5.01);
	});

	it('TEST G: Rundung auf 2 Dezimalstellen - income split with decimals', () => {
		const item = createFixedItem(33.33, 'income');
		const myShare = calculateMyShareForFixedItem(item, 0.333);

		// 33.33 * 0.333 = 11.09889, should round to 11.10
		expect(myShare).toBe(11.1);
	});
});

describe('calculateMyFixedShare', () => {
	it('calculates total fixed share across multiple items and categories', () => {
		const categories = [
			createFixedCategory([createFixedItem(100, 'me'), createFixedItem(200, 'income')]),
			createFixedCategory([createFixedItem(100, 'income')])
		];

		const myShare = calculateMyFixedShare(categories, 0.4);

		// 100 (me) + 80 (40% of 200) + 40 (40% of 100) = 220
		expect(myShare).toBe(220);
	});
});

// ============================================================================
// Tests: Month Calculation - Core Scenarios
// ============================================================================

describe('calculateMonth', () => {
	it('TEST C: Unterzahlung wandert in Schulden', () => {
		// Setup: myFixedShare will be 1100, but only 1000 transferred
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(2200, 'half') // My share: 1100
				])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			totalTransferThisMonth: 1000
		};

		const result = calculateMonth(inputs);

		// Assertions
		expect(result.myFixedShare).toBe(1100);
		expect(result.missingFixed).toBe(100); // 1100 - 1000
		expect(result.surplusForPrivates).toBe(0); // No surplus
		expect(result.privateAddedThisMonth).toBe(0); // No private expenses
		expect(result.privateTotalDueBeforePayment).toBe(100); // 0 + 0 + 100
		expect(result.privateBalanceEnd).toBe(100); // 100 - 0
	});

	it('TEST D: Überzahlung tilgt Schulden', () => {
		// Setup: myFixedShare=1100, overpayment of 400 goes to privates
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(2200, 'half') // My share: 1100
				])
			],
			privateExpenses: [
				{
					id: 'exp1',
					dateISO: '2024-01-15',
					description: 'Groceries',
					amount: 100
				},
				{
					id: 'exp2',
					dateISO: '2024-01-20',
					description: 'Pharmacy',
					amount: 100
				}
			],
			privateBalanceStart: 300,
			totalTransferThisMonth: 1500
		};

		const result = calculateMonth(inputs);

		// Assertions
		expect(result.myFixedShare).toBe(1100);
		expect(result.privateAddedThisMonth).toBe(200); // 100 + 100
		expect(result.missingFixed).toBe(0); // No missing fixed costs
		expect(result.surplusForPrivates).toBe(400); // 1500 - 1100
		expect(result.privateTotalDueBeforePayment).toBe(500); // 300 + 200 + 0
		expect(result.privateBalanceEnd).toBe(100); // 500 - 400
	});

	it('handles zero transfers with existing debt', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 3000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(1000, 'income') // My share: 600 (60%)
				])
			],
			privateExpenses: [
				{
					id: 'exp1',
					dateISO: '2024-01-10',
					description: 'Test',
					amount: 50
				}
			],
			privateBalanceStart: 200,
			totalTransferThisMonth: 0
		};

		const result = calculateMonth(inputs);

		expect(result.shareMe).toBeCloseTo(0.6, 5);
		expect(result.myFixedShare).toBe(600);
		expect(result.privateAddedThisMonth).toBe(50);
		expect(result.missingFixed).toBe(600); // All fixed costs missing
		expect(result.surplusForPrivates).toBe(0);
		expect(result.privateTotalDueBeforePayment).toBe(850); // 200 + 50 + 600
		expect(result.privateBalanceEnd).toBe(850); // 850 - 0
	});

	it('handles exact payment (no surplus, no missing)', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(1000, 'half') // My share: 500
				])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			totalTransferThisMonth: 500
		};

		const result = calculateMonth(inputs);

		expect(result.myFixedShare).toBe(500);
		expect(result.missingFixed).toBe(0);
		expect(result.surplusForPrivates).toBe(0);
		expect(result.privateTotalDueBeforePayment).toBe(0);
		expect(result.privateBalanceEnd).toBe(0);
	});

	it('TEST F: Negative privateBalanceStart ist erlaubt', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(200, 'half') // My share: 100
				])
			],
			privateExpenses: [],
			privateBalanceStart: -50, // Negative start balance (partner owes me)
			totalTransferThisMonth: 100
		};

		const result = calculateMonth(inputs);

		expect(result.myFixedShare).toBe(100);
		expect(result.missingFixed).toBe(0); // Paid exactly what's needed
		expect(result.surplusForPrivates).toBe(0); // No surplus
		expect(result.privateTotalDueBeforePayment).toBe(-50); // -50 + 0 + 0
		expect(result.privateBalanceEnd).toBe(-50); // -50 - 0
	});

	it('privateBalanceStart is preserved in computed result', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 2000),
			fixedCategories: [],
			privateExpenses: [],
			privateBalanceStart: -50, // Negative balance
			totalTransferThisMonth: 0
		};

		const result = calculateMonth(inputs);

		// privateBalanceStart must be in the computed result and match the input
		expect(result.privateBalanceStart).toBe(-50);
	});

	it('splitMode="me" does not create debt towards partner', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(100, 'me') // Christian's personal cost
				])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			totalTransferThisMonth: 0
		};

		const result = calculateMonth(inputs);

		// Total and myFixedShare still include 'me' items for tracking
		expect(result.totalFixedCosts).toBe(100);
		expect(result.myFixedShare).toBe(100);
		// But transfer logic excludes 'me' items - no debt towards partner
		expect(result.missingFixed).toBe(0);
		expect(result.surplusForPrivates).toBe(0);
		expect(result.privateBalanceEnd).toBe(0);
	});

	it('splitMode="me" does not contribute to missingFixed in mixed scenario', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(1000, 'income'), // Shared: 50% each = 500€ for me
					createFixedItem(100, 'me') // Personal: 100% me
				])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			totalTransferThisMonth: 400 // Underpayment of 100€ for shared costs only
		};

		const result = calculateMonth(inputs);

		// Total includes all items
		expect(result.totalFixedCosts).toBe(1100); // 1000 + 100
		// myFixedShare includes personal costs for display
		expect(result.myFixedShare).toBe(600); // 500 (income) + 100 (me)
		// Transfer logic only considers shared costs (500)
		// Missing: 500 - 400 = 100 (not 600 - 400 = 200)
		expect(result.missingFixed).toBe(100);
		expect(result.surplusForPrivates).toBe(0);
		// Debt accumulates only from shared underpayment
		expect(result.privateTotalDueBeforePayment).toBe(100);
		expect(result.privateBalanceEnd).toBe(100);
	});
});

// ============================================================================
// Tests: Rounding
// ============================================================================

describe('roundMoney', () => {
	it('rounds to 2 decimal places', () => {
		expect(roundMoney(1.234)).toBe(1.23);
		expect(roundMoney(1.235)).toBe(1.24);
		expect(roundMoney(1.236)).toBe(1.24);
	});

	it('handles negative values', () => {
		expect(roundMoney(-1.234)).toBe(-1.23);
		expect(roundMoney(-1.235)).toBe(-1.24);
	});

	it('handles zero', () => {
		expect(roundMoney(0)).toBe(0);
		expect(roundMoney(-0)).toBe(-0); // JavaScript -0 === 0, but Object.is distinguishes them
	});

	it('defensive guards: handles NaN', () => {
		expect(roundMoney(NaN)).toBe(0);
	});

	it('defensive guards: handles Infinity', () => {
		expect(roundMoney(Infinity)).toBe(0);
		expect(roundMoney(-Infinity)).toBe(0);
	});
});
