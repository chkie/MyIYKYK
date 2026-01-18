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
		const shareMe = 0.6; // I earn 60% of total income

		const result = calculateMyShareForFixedItem(item, shareMe);

		expect(result).toBe(100); // I pay 100% when mode is "me"
	});

	it('TEST B: splitMode wirkt - mode "partner"', () => {
		const item = createFixedItem(100, 'partner');
		const shareMe = 0.6;

		const result = calculateMyShareForFixedItem(item, shareMe);

		expect(result).toBe(0); // I pay 0% when mode is "partner"
	});

	it('TEST B: splitMode wirkt - mode "income"', () => {
		const item = createFixedItem(100, 'income');
		const shareMe = 0.6;

		const result = calculateMyShareForFixedItem(item, shareMe);

		expect(result).toBe(60); // I pay 60% when mode is "income"
	});

	it('handles legacy "half" mode as income-based', () => {
		const item = createFixedItem(100, 'half');
		const shareMe = 0.6;

		const result = calculateMyShareForFixedItem(item, shareMe);

		expect(result).toBe(60); // Legacy "half" treated as "income"
	});
});

// ============================================================================
// Tests: Fixed Costs Summation
// ============================================================================

describe('calculateMyFixedShare', () => {
	it('TEST C: Mit mehreren Items & Kategorien', () => {
		const categories: FixedCategory[] = [
			createFixedCategory([createFixedItem(100, 'income'), createFixedItem(200, 'me')]),
			createFixedCategory([createFixedItem(300, 'partner'), createFixedItem(400, 'income')])
		];
		const shareMe = 0.6; // 60% income share

		const result = calculateMyFixedShare(categories, shareMe);

		// (100 * 0.6) + 200 + 0 + (400 * 0.6) = 60 + 200 + 0 + 240 = 500
		expect(result).toBe(500);
	});

	it('handles empty categories', () => {
		const result = calculateMyFixedShare([], 0.5);
		expect(result).toBe(0);
	});

	it('handles single category with multiple items', () => {
		const categories: FixedCategory[] = [
			createFixedCategory([createFixedItem(100, 'income'), createFixedItem(50, 'income')])
		];

		const result = calculateMyFixedShare(categories, 0.4);

		// (100 * 0.4) + (50 * 0.4) = 40 + 20 = 60
		expect(result).toBe(60);
	});
});

// ============================================================================
// Tests: Month Calculation (Prepayment Model)
// ============================================================================

describe('calculateMonth - Prepayment Model', () => {
	it('TEST D: Integration test with prepayment covering all costs', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 3000),
			partner: createPerson('partner', 2000), // My share: 60%
			fixedCategories: [
				createFixedCategory([
					createFixedItem(500, 'income'), // My share: 300
					createFixedItem(1000, 'income') // My share: 600
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
					description: 'Gas',
					amount: 100
				}
			],
			privateBalanceStart: 300, // Old debt
			prepaymentThisMonth: 1100 // Prepaid 1100€ (covers my 900€ fixed costs + 200€ extra)
		};

		const result = calculateMonth(inputs);

		// Assertions
		expect(result.shareMe).toBeCloseTo(0.6, 5);
		expect(result.myFixedShare).toBe(900); // Total: 300 + 600
		expect(result.fixedCostDue).toBe(900); // What I owe for shared costs
		expect(result.prepaymentThisMonth).toBe(1100);
		expect(result.privateAddedThisMonth).toBe(200); // 100 + 100
		expect(result.fixedCostShortfall).toBe(0); // No underpayment (1100 >= 900)
		expect(result.fixedCostOverpayment).toBe(200); // Overpaid by 200
		
		// Debt calculation: oldDebt + privateExpenses + fixedCosts - prepayment
		// = 300 + 200 + 900 - 1100 = 300
		expect(result.privateTotalDueBeforePrepayment).toBe(1400); // 300 + 200 + 900
		expect(result.privateBalanceEnd).toBe(300); // 1400 - 1100
	});

	it('handles zero prepayment with existing debt', () => {
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
			prepaymentThisMonth: 0 // No prepayment
		};

		const result = calculateMonth(inputs);

		expect(result.shareMe).toBeCloseTo(0.6, 5);
		expect(result.myFixedShare).toBe(600);
		expect(result.fixedCostDue).toBe(600);
		expect(result.privateAddedThisMonth).toBe(50);
		expect(result.fixedCostShortfall).toBe(600); // All fixed costs unpaid
		expect(result.fixedCostOverpayment).toBe(0);
		
		// Debt: 200 + 50 + 600 - 0 = 850
		expect(result.privateTotalDueBeforePrepayment).toBe(850);
		expect(result.privateBalanceEnd).toBe(850);
	});

	it('handles exact prepayment (no shortfall, no overpayment)', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(1000, 'income') // My share: 500 (50%)
				])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			prepaymentThisMonth: 500 // Exactly covers fixed costs
		};

		const result = calculateMonth(inputs);

		expect(result.myFixedShare).toBe(500);
		expect(result.fixedCostDue).toBe(500);
		expect(result.fixedCostShortfall).toBe(0);
		expect(result.fixedCostOverpayment).toBe(0);
		
		// Debt: 0 + 0 + 500 - 500 = 0
		expect(result.privateTotalDueBeforePrepayment).toBe(500);
		expect(result.privateBalanceEnd).toBe(0);
	});

	it('TEST F: Negative privateBalanceStart ist erlaubt (partner owes me)', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(200, 'income') // My share: 100
				])
			],
			privateExpenses: [],
			privateBalanceStart: -50, // Partner owes me 50€
			prepaymentThisMonth: 100 // Cover fixed costs
		};

		const result = calculateMonth(inputs);

		expect(result.myFixedShare).toBe(100);
		expect(result.fixedCostDue).toBe(100);
		expect(result.fixedCostShortfall).toBe(0);
		expect(result.fixedCostOverpayment).toBe(0);
		
		// Debt: -50 + 0 + 100 - 100 = -50 (still in my favor)
		expect(result.privateTotalDueBeforePrepayment).toBe(50); // -50 + 0 + 100
		expect(result.privateBalanceEnd).toBe(-50); // 50 - 100
	});

	it('privateBalanceStart is preserved in computed result', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 2000),
			fixedCategories: [],
			privateExpenses: [],
			privateBalanceStart: -50,
			prepaymentThisMonth: 0
		};

		const result = calculateMonth(inputs);

		expect(result.privateBalanceStart).toBe(-50);
	});

	it('splitMode="me" does not create debt towards partner', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(100, 'me') // Personal cost, not shared
				])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			prepaymentThisMonth: 0
		};

		const result = calculateMonth(inputs);

		// myFixedShare includes 'me' items for display
		expect(result.totalFixedCosts).toBe(100);
		expect(result.myFixedShare).toBe(100);
		
		// But transfer logic excludes 'me' items - no debt towards partner
		expect(result.fixedCostDue).toBe(0); // No shared costs
		expect(result.fixedCostShortfall).toBe(0);
		expect(result.fixedCostOverpayment).toBe(0);
		expect(result.privateBalanceEnd).toBe(0);
	});

	it('splitMode="me" does not contribute to fixedCostDue in mixed scenario', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(1000, 'income'), // Shared: 50% = 500€ for me
					createFixedItem(100, 'me') // Personal: doesn't count for debt
				])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			prepaymentThisMonth: 400 // Underpaid by 100€
		};

		const result = calculateMonth(inputs);

		expect(result.totalFixedCosts).toBe(1100);
		expect(result.myFixedShare).toBe(600); // 500 (shared) + 100 (personal)
		expect(result.fixedCostDue).toBe(500); // Only shared costs count
		expect(result.fixedCostShortfall).toBe(100); // 500 - 400
		expect(result.fixedCostOverpayment).toBe(0);
		
		// Debt: 0 + 0 + 500 - 400 = 100
		expect(result.privateTotalDueBeforePrepayment).toBe(500);
		expect(result.privateBalanceEnd).toBe(100);
	});

	it('overpayment scenario reduces debt', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([createFixedItem(1000, 'income')]) // My share: 500
			],
			privateExpenses: [
				{ id: 'exp1', dateISO: '2024-01-15', description: 'Test', amount: 100 }
			],
			privateBalanceStart: 200,
			prepaymentThisMonth: 800 // Overpaid by 300€
		};

		const result = calculateMonth(inputs);

		expect(result.fixedCostDue).toBe(500);
		expect(result.fixedCostShortfall).toBe(0);
		expect(result.fixedCostOverpayment).toBe(300); // 800 - 500
		expect(result.privateAddedThisMonth).toBe(100);
		
		// Debt: 200 + 100 + 500 - 800 = 0
		expect(result.privateTotalDueBeforePrepayment).toBe(800);
		expect(result.privateBalanceEnd).toBe(0);
	});

	it('recommendedPrepayment reflects transfer-relevant fixed costs', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 3000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(1000, 'income'), // My share: 600
					createFixedItem(200, 'me') // Personal, excluded
				])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			prepaymentThisMonth: 0
		};

		const result = calculateMonth(inputs);

		// Recommended prepayment should only include shared costs
		expect(result.recommendedPrepayment).toBe(600); // Not 720 (which would include 'me' item)
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
		expect(roundMoney(-0)).toBe(-0);
	});

	it('handles integers', () => {
		expect(roundMoney(5)).toBe(5);
		expect(roundMoney(-10)).toBe(-10);
	});

	it('guards against NaN and Infinity', () => {
		expect(roundMoney(NaN)).toBe(0);
		expect(roundMoney(Infinity)).toBe(0);
		expect(roundMoney(-Infinity)).toBe(0);
	});
});
