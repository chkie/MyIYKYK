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
import type { FixedCategory, FixedItem, MonthInputs, Person, PrivateExpense } from './types.js';

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
	splitMode: 'income' | 'me' | 'partner' = 'income'
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

	it('splitMode="me" creates FULL debt towards partner (100%)', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(100, 'me') // Steffi pays from her account, Christian owes 100%
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
		
		// Transfer logic: 'me' items create FULL debt (Steffi pays, Christian owes)
		expect(result.fixedCostDue).toBe(100); // 'me' = 100% debt
		expect(result.fixedCostShortfall).toBe(100);
		expect(result.fixedCostOverpayment).toBe(0);
		expect(result.privateBalanceEnd).toBe(100);
	});

	it('splitMode="me" contributes 100% to fixedCostDue in mixed scenario', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(1000, 'income'), // Shared: 50% = 500€ for me
					createFixedItem(100, 'me') // Personal: 100% debt!
				])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			prepaymentThisMonth: 400 // Underpaid by 200€
		};

		const result = calculateMonth(inputs);

		expect(result.totalFixedCosts).toBe(1100);
		expect(result.myFixedShare).toBe(600); // 500 (shared) + 100 (personal)
		expect(result.fixedCostDue).toBe(600); // 500 (income) + 100 (me)
		expect(result.fixedCostShortfall).toBe(200); // 600 - 400
		expect(result.fixedCostOverpayment).toBe(0);
		
		// Debt: 0 + 0 + 600 - 400 = 200
		expect(result.privateTotalDueBeforePrepayment).toBe(600);
		expect(result.privateBalanceEnd).toBe(200);
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

		// Recommended prepayment includes 'me' items (they create debt!)
		expect(result.recommendedPrepayment).toBe(800); // 600 + 200 (me item)
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

// ============================================================================
// Tests: P0 Test-Matrix Cases (Phase B - Rechenlogik Audit)
// ============================================================================

describe('P0 Test-Matrix: Complete Scenarios', () => {
	/**
	 * TEST 1 (P0): Proportional Split – Basic Case
	 * Input: Christian 2000€, Steffi 3000€, Fixkosten 100€ proportional
	 * Expected: Christian schuldet 40€
	 */
	it('T1-P0: Proportional Basic (2000/3000 → 40/60 Split)', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 3000),
			fixedCategories: [
				createFixedCategory([createFixedItem(100, 'income')])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			prepaymentThisMonth: 0
		};

		const result = calculateMonth(inputs);

		// Anteil: 2000 / 5000 = 0.4 (40%)
		expect(result.shareMe).toBeCloseTo(0.4, 5);
		expect(result.sharePartner).toBeCloseTo(0.6, 5);

		// Fixkosten: 100€ × 0.4 = 40€
		expect(result.myFixedShare).toBe(40);
		expect(result.fixedCostDue).toBe(40);

		// Schuld: 0 + 0 + 40 - 0 = 40€
		expect(result.privateBalanceEnd).toBe(40);

		// Empfehlung
		expect(result.recommendedPrepayment).toBe(40);
	});

	/**
	 * TEST 2 (P0): Christian 100% – Persönliche Kosten
	 * Input: Fixkosten 100€ splitMode='me'
	 * Expected: Keine Partner-Schuld (0€)
	 */
	it('T2-P0: Christian 100% (persönliche Kosten, keine Partner-Schuld)', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 3000),
			fixedCategories: [
				createFixedCategory([createFixedItem(100, 'me')])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			prepaymentThisMonth: 0
		};

		const result = calculateMonth(inputs);

		// Display: Christian zahlt 100€
		expect(result.myFixedShare).toBe(100);
		expect(result.totalFixedCosts).toBe(100);

		// Partner-Schuld: 100€ (splitMode='me' = 100% debt!)
		expect(result.fixedCostDue).toBe(100);
		expect(result.privateBalanceEnd).toBe(100);

		// Empfehlung: 100€ ('me' items create debt)
		expect(result.recommendedPrepayment).toBe(100);
	});

	/**
	 * TEST 3 (P0): Steffi 100% – Partner zahlt alles
	 * Input: Fixkosten 100€ splitMode='partner'
	 * Expected: Keine Schuld von Christian (0€)
	 */
	it('T3-P0: Steffi 100% (Partner zahlt alles)', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 3000),
			fixedCategories: [
				createFixedCategory([createFixedItem(100, 'partner')])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			prepaymentThisMonth: 0
		};

		const result = calculateMonth(inputs);

		// Christian zahlt nichts
		expect(result.myFixedShare).toBe(0);
		expect(result.fixedCostDue).toBe(0);
		expect(result.privateBalanceEnd).toBe(0);

		// Total Fixkosten existieren
		expect(result.totalFixedCosts).toBe(100);
	});

	/**
	 * TEST 4 (P0): Multi-Category Mix
	 * Input: 2 Kategorien mit gemischten Split-Modi
	 * Expected: Korrekte Summen inkl./exkl. persönlicher Kosten
	 */
	it('T4-P0: Mixed Positions + Multiple Categories', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 3000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(1000, 'income'), // Miete
					createFixedItem(150, 'income')    // Strom
				]),
				createFixedCategory([
					createFixedItem(50, 'me'),        // Christian Handy
					createFixedItem(30, 'partner')    // Steffi Gym
				])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			prepaymentThisMonth: 0
		};

		const result = calculateMonth(inputs);

		// Anteil: 3000 / 5000 = 0.6 (60%)
		expect(result.shareMe).toBeCloseTo(0.6, 5);

		// Kategorie 1: 1000×0.6 + 150×0.6 = 600 + 90 = 690€
		// Kategorie 2: 50 (me) + 0 (partner) = 50€
		// Total Display: 690 + 50 = 740€
		expect(result.myFixedShare).toBe(740);

		// Partner-Schuld (inkl. 'me'): 740€
		expect(result.fixedCostDue).toBe(740);
		expect(result.privateBalanceEnd).toBe(740);

		// Total Fixkosten: 1000 + 150 + 50 + 30 = 1230€
		expect(result.totalFixedCosts).toBe(1230);

		// Empfehlung: all transfer-relevant costs (inkl. 'me')
		expect(result.recommendedPrepayment).toBe(740);
	});

	/**
	 * TEST 5 (P0): Vorauszahlung – Underpayment
	 * Input: Fixkosten 1000€ (400€ Anteil), Vorauszahlung 300€
	 * Expected: Schuld 100€, Unterzahlung 100€
	 */
	it('T5-P0: Underpayment (Vorauszahlung zu niedrig)', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 3000),
			fixedCategories: [
				createFixedCategory([createFixedItem(1000, 'income')])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			prepaymentThisMonth: 300 // Zu wenig!
		};

		const result = calculateMonth(inputs);

		// Anteil: 0.4 → 1000×0.4 = 400€
		expect(result.fixedCostDue).toBe(400);

		// Unterzahlung: 400 - 300 = 100€
		expect(result.fixedCostShortfall).toBe(100);
		expect(result.fixedCostOverpayment).toBe(0);

		// Schuld: 0 + 0 + 400 - 300 = 100€
		expect(result.privateBalanceEnd).toBe(100);

		// Empfehlung: 400€
		expect(result.recommendedPrepayment).toBe(400);
	});

	/**
	 * TEST 6 (P0): Vorauszahlung – Overpayment
	 * Input: Fixkosten 1000€ (400€ Anteil), Vorauszahlung 500€
	 * Expected: Guthaben -100€ (Steffi schuldet Christian)
	 */
	it('T6-P0: Overpayment (Guthaben-Szenario)', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 3000),
			fixedCategories: [
				createFixedCategory([createFixedItem(1000, 'income')])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			prepaymentThisMonth: 500 // Zu viel!
		};

		const result = calculateMonth(inputs);

		// Anteil: 400€
		expect(result.fixedCostDue).toBe(400);

		// Überzahlung: 500 - 400 = 100€
		expect(result.fixedCostShortfall).toBe(0);
		expect(result.fixedCostOverpayment).toBe(100);

		// Guthaben: 0 + 0 + 400 - 500 = -100€
		expect(result.privateBalanceEnd).toBe(-100);

		// Interpretation: Steffi schuldet Christian 100€
	});

	/**
	 * TEST 7 (P0): Monatsabschluss + Carryover
	 * Input: Monat 1 schließt mit 100€ Schuld → Monat 2 startet mit 100€ Altschuld
	 * Expected: Altschuld + neue Fixkosten = kumulierte Schuld
	 */
	it('T7-P0: Carryover (Altschuld aus Vormonat)', () => {
		// Monat 1: Berechnung (nur zur Dokumentation)
		const month1: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 3000),
			fixedCategories: [
				createFixedCategory([createFixedItem(1000, 'income')])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			prepaymentThisMonth: 300
		};
		const result1 = calculateMonth(month1);
		// → privateBalanceEnd = 100€ (wird in DB gespeichert)

		// Monat 2: Startet mit Carryover
		const month2: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 3000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(1000, 'income'), // Aus Vormonat kopiert
					createFixedItem(200, 'income')   // Neue Position
				])
			],
			privateExpenses: [],
			privateBalanceStart: result1.privateBalanceEnd, // 100€ Carryover!
			prepaymentThisMonth: 0
		};

		const result2 = calculateMonth(month2);

		// Altschuld
		expect(result2.privateBalanceStart).toBe(100);

		// Neue Fixkosten: 1000×0.4 + 200×0.4 = 400 + 80 = 480€
		expect(result2.fixedCostDue).toBe(480);

		// Gesamtschuld: 100 (alt) + 480 (neu) - 0 = 580€
		expect(result2.privateTotalDueBeforePrepayment).toBe(580);
		expect(result2.privateBalanceEnd).toBe(580);

		// Empfehlung: nur neue Fixkosten
		expect(result2.recommendedPrepayment).toBe(480);
	});

	/**
	 * TEST 10 (P1): Rounding – Krumme Beträge
	 * Input: Krumme Gehälter + krumme Beträge
	 * Expected: Korrekte Rundung auf 2 Dezimalen, keine Cent-Abweichung
	 */
	it('T10-P1: Rounding Edge Cases (krumme Beträge)', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2222),
			partner: createPerson('partner', 3333),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(99.99, 'income'),
					createFixedItem(0.01, 'income'),
					createFixedItem(33.33, 'income')
				])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			prepaymentThisMonth: 0
		};

		const result = calculateMonth(inputs);

		// Anteil: 2222 / 5555 ≈ 0.3996... ≈ 0.4
		expect(result.shareMe).toBeCloseTo(0.4, 2);

		// Position A: 99.99 × 0.4 = 39.996 → 40.00€
		// Position B: 0.01 × 0.4 = 0.004 → 0.00€
		// Position C: 33.33 × 0.4 = 13.332 → 13.33€
		// Summe: 40.00 + 0.00 + 13.33 = 53.33€
		expect(result.fixedCostDue).toBe(53.33);
		expect(result.privateBalanceEnd).toBe(53.33);

		// Verify: Alle Beträge auf 2 Dezimalen
		expect(result.myFixedShare).toBe(53.33);
	});

	/**
	 * TEST 12 (P2): Große Beträge – Precision Check
	 * Input: Große Beträge (9999.99€)
	 * Expected: Kein Float-Overflow, korrekte Rundung
	 */
	it('T12-P2: Large Numbers (kein Float-Overflow)', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 8000),
			partner: createPerson('partner', 12000),
			fixedCategories: [
				createFixedCategory([createFixedItem(9999.99, 'income')])
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			prepaymentThisMonth: 0
		};

		const result = calculateMonth(inputs);

		// Anteil: 8000 / 20000 = 0.4
		expect(result.shareMe).toBe(0.4);

		// Fixkosten: 9999.99 × 0.4 = 3999.996 → 4000.00€
		expect(result.fixedCostDue).toBe(4000.00);
		expect(result.privateBalanceEnd).toBe(4000.00);
	});

	/**
	 * TEST 13 (P0): Workflow Scenario – User Described
	 * Input:
	 * - Einkommen: ich=2000, partner=3000 → share: 0.4 / 0.6
	 * - Fixkosten Position A: 1000€ splitMode=income → 400€ für mich
	 * - Fixkosten Position B: 200€ splitMode=me → 200€ für mich (100%)
	 * - Fixkosten Position C: 300€ splitMode=partner → 0€ für mich (0%)
	 * - Privatausgaben: 50€ (erstellt von mir) → 50€ für mich
	 * - Vorauszahlung: 100€ → reduziert meine Schuld
	 * - Carryover: 75€ aus Vormonat
	 * Expected:
	 * - Total Fixed Share: 400 + 200 + 0 = 600€
	 * - Private Due: 50€
	 * - Total Before Prepayment: 75 + 50 + 600 = 725€
	 * - Balance End: 725 - 100 = 625€
	 */
	it('T13-P0: Workflow Scenario - User Described (splitMode me/partner/income + prepayment + carryover)', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 3000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(1000, 'income'),  // Position A: 40% = 400€
					createFixedItem(200, 'me'),       // Position B: 100% = 200€
					createFixedItem(300, 'partner')   // Position C: 0% = 0€
				])
			],
			privateExpenses: [
				{
					id: 'exp-1',
					amount: 50,
					label: 'Private Ausgabe',
					createdBy: 'me' // 100% für mich
				}
			],
			privateBalanceStart: 75,  // Carryover aus Vormonat
			prepaymentThisMonth: 100  // Vorauszahlung reduziert Schuld
		};

		const result = calculateMonth(inputs);

		// Income shares
		expect(result.shareMe).toBeCloseTo(0.4, 5); // 2000 / 5000 = 0.4
		expect(result.sharePartner).toBeCloseTo(0.6, 5);

		// Fixed costs breakdown
		// Position A (income): 1000 × 0.4 = 400€
		// Position B (me): 200 × 1.0 = 200€
		// Position C (partner): 300 × 0.0 = 0€
		// Total: 400 + 200 + 0 = 600€
		expect(result.myFixedShare).toBe(600);
		expect(result.fixedCostDue).toBe(600);

		// Private expenses (always 100% for creator)
		expect(result.privateAddedThisMonth).toBe(50);

		// Total calculation
		// Balance Start: 75€ (carryover)
		// Private Expenses: 50€
		// Fixed Costs: 600€
		// Total Before Prepayment: 75 + 50 + 600 = 725€
		expect(result.privateTotalDueBeforePrepayment).toBe(725);

		// After prepayment
		// 725 - 100 = 625€
		expect(result.prepaymentThisMonth).toBe(100);
		expect(result.privateBalanceEnd).toBe(625);

		// Verify carryover would be 625 for next month
		expect(result.privateBalanceEnd).toBe(625);
	});

	/**
	 * T14-P0: Negative Starting Balance (Steffi owes me from previous month)
	 */
	it('T14-P0: Should handle negative starting balance correctly (Steffi owes Christian)', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 2000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(500, 'income')  // 50% split = 250€ each
				])
			],
			privateExpenses: [
				{
					id: 'exp-1',
					amount: 100,
					dateISO: '2026-01-15',
					description: 'Private expense'
				}
			],
			privateBalanceStart: -150,  // Steffi owes me 150€ from last month
			prepaymentThisMonth: 200
		};

		const result = calculateMonth(inputs);

		// Income shares should be equal (50/50)
		expect(result.shareMe).toBe(0.5);
		expect(result.sharePartner).toBe(0.5);

		// Fixed costs: 500 × 0.5 = 250€
		expect(result.myFixedShare).toBe(250);
		expect(result.fixedCostDue).toBe(250);

		// Private expenses: 100€
		expect(result.privateAddedThisMonth).toBe(100);

		// Balance start: -150€ (Steffi owes me)
		expect(result.privateBalanceStart).toBe(-150);

		// Total before prepayment: -150 + 100 + 250 = 200€
		expect(result.privateTotalDueBeforePrepayment).toBe(200);

		// After prepayment: 200 - 200 = 0€ (balanced!)
		expect(result.privateBalanceEnd).toBe(0);
	});

	/**
	 * T15-P0: Starting with debt (Christian owes Steffi from day one)
	 */
	it('T15-P0: Should handle positive starting balance in first month (Christian owes Steffi)', () => {
		const inputs: MonthInputs = {
			me: createPerson('me', 3000),
			partner: createPerson('partner', 2000),
			fixedCategories: [
				createFixedCategory([
					createFixedItem(1000, 'income')  // 60/40 split = 600€ for me
				])
			],
			privateExpenses: [],  // No private expenses this month
			privateBalanceStart: 200,  // I owe Steffi 200€ from before we started tracking
			prepaymentThisMonth: 500
		};

		const result = calculateMonth(inputs);

		// Income shares: 3000/(3000+2000) = 0.6
		expect(result.shareMe).toBe(0.6);
		expect(result.sharePartner).toBe(0.4);

		// Fixed costs: 1000 × 0.6 = 600€
		expect(result.myFixedShare).toBe(600);
		expect(result.fixedCostDue).toBe(600);

		// No private expenses
		expect(result.privateAddedThisMonth).toBe(0);

		// Balance start: 200€ (I owe Steffi)
		expect(result.privateBalanceStart).toBe(200);

		// Total before prepayment: 200 + 0 + 600 = 800€
		expect(result.privateTotalDueBeforePrepayment).toBe(800);

		// After prepayment: 800 - 500 = 300€ (still owe 300€)
		expect(result.privateBalanceEnd).toBe(300);

		// Recommended prepayment should be 600€ (just the fixed costs)
		expect(result.recommendedPrepayment).toBe(600);
	});
});
