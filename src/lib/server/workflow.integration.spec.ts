/**
 * WORKFLOW INTEGRATION TEST
 * Testet kompletten Monats-Lifecycle:
 * 1. Monat starten (Balance: 0)
 * 2. Default-Fixkosten vorhanden
 * 3. Einträge hinzufügen (Private Expenses)
 * 4. Vorauszahlung setzen
 * 5. Monatsabschluss → Carryover berechnen
 * 6. Nächster Monat → Carryover übernommen
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MonthInputs } from '$lib/domain/types';
import { calculateMonth } from '$lib/domain/finance';

describe('Workflow Integration: Complete Month Lifecycle', () => {
	/**
	 * WORKFLOW TEST W1-P0: Vollständiger 2-Monats-Zyklus mit Carryover
	 * 
	 * Szenario:
	 * - Monat 1: Gehälter 3000/2000, Fixkosten 1000€ (income), Privatausgaben 200€, Vorauszahlung 400€
	 * - Erwartung: Balance -400€ (Carryover für Monat 2)
	 * - Monat 2: Gleiche Gehälter, gleiche Fixkosten, keine neuen Ausgaben, Vorauszahlung 600€
	 * - Erwartung: Carryover berücksichtigt, finale Balance korrekt
	 */
	it('W1-P0: Complete 2-month cycle with carryover and prepayment', () => {
		// ===== MONAT 1: Initial Setup =====
		const month1Inputs: MonthInputs = {
			me: {
				id: 'me-1',
				profileId: 'profile-me',
				name: 'Christian',
				netIncome: 3000
			},
			partner: {
				id: 'partner-1',
				profileId: 'profile-partner',
				name: 'Steffi',
				netIncome: 2000
			},
			fixedCategories: [
				{
					id: 'cat-1',
					label: 'Wohnen',
					sortOrder: 0,
					items: [
						{
							id: 'fixed-1',
							label: 'Miete',
							amount: 1000,
							splitMode: 'income',
							isDefault: true
						}
					]
				}
			],
			privateExpenses: [
				{
					id: 'priv-1',
					label: 'Supermarkt',
					amount: 200,
					createdBy: 'me'
				}
			],
			privateBalanceStart: 0, // Neu: keine Altschuld
			prepaymentThisMonth: 400 // Christian zahlt 400€ vor
		};

		const month1Result = calculateMonth(month1Inputs);

		// Assertions Monat 1
		expect(month1Result.shareMe).toBeCloseTo(0.6, 5); // 3000 / 5000 = 60%
		expect(month1Result.myFixedShare).toBe(600); // 1000 × 0.6
		expect(month1Result.fixedCostDue).toBe(600); // Income-Mode: 60%
		expect(month1Result.privateTotalDueBeforePrepayment).toBe(800); // 0 + 200 + 600
		
		// Vorauszahlung 400€ → Shortfall 400€
		expect(month1Result.fixedCostShortfall).toBe(200); // 600 - 400
		expect(month1Result.privateBalanceEnd).toBe(400); // 0 + 200 + 600 - 400

		// ===== MONATSABSCHLUSS: Carryover =====
		const carryoverToMonth2 = month1Result.privateBalanceEnd; // 400€

		// ===== MONAT 2: Mit Carryover =====
		const month2Inputs: MonthInputs = {
			me: {
				id: 'me-2',
				profileId: 'profile-me',
				name: 'Christian',
				netIncome: 3000 // Gleich
			},
			partner: {
				id: 'partner-2',
				profileId: 'profile-partner',
				name: 'Steffi',
				netIncome: 2000 // Gleich
			},
			fixedCategories: [
				{
					id: 'cat-2',
					label: 'Wohnen',
					sortOrder: 0,
					items: [
						{
							id: 'fixed-2',
							label: 'Miete',
							amount: 1000, // Gleich
							splitMode: 'income',
							isDefault: true
						}
					]
				}
			],
			privateExpenses: [], // Keine neuen Ausgaben
			privateBalanceStart: carryoverToMonth2, // 400€ Altschuld!
			prepaymentThisMonth: 600 // Christian zahlt mehr vor
		};

		const month2Result = calculateMonth(month2Inputs);

		// Assertions Monat 2
		expect(month2Result.shareMe).toBeCloseTo(0.6, 5);
		expect(month2Result.myFixedShare).toBe(600);
		expect(month2Result.fixedCostDue).toBe(600);
		
		// Gesamtschuld: 400 (Carryover) + 0 (keine priv. Ausgaben) + 600 (Fixkosten) - 600 (Vorauszahlung)
		expect(month2Result.privateTotalDueBeforePrepayment).toBe(1000); // 400 + 600
		expect(month2Result.privateBalanceEnd).toBe(400); // 400 + 600 - 600

		// Carryover wurde korrekt übernommen
		expect(month2Result.privateBalanceStart).toBe(400);
	});

	/**
	 * WORKFLOW TEST W2-P0: splitMode='me' in Lifecycle
	 * 
	 * Testet, dass 'me'-Kosten korrekt als 100% Schuld gewertet werden über 2 Monate
	 */
	it('W2-P0: splitMode=me creates full debt in multi-month cycle', () => {
		// Monat 1: Christian trägt "persönliche" Fixkosten ein
		const month1: MonthInputs = {
			me: { id: '1', profileId: 'p1', name: 'Christian', netIncome: 2000 },
			partner: { id: '2', profileId: 'p2', name: 'Steffi', netIncome: 2000 },
			fixedCategories: [
				{
					id: 'c1',
					label: 'Persönlich',
					sortOrder: 0,
					items: [
						{ id: 'i1', label: 'Christian Handy', amount: 50, splitMode: 'me', isDefault: true }
					]
				}
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			prepaymentThisMonth: 0
		};

		const result1 = calculateMonth(month1);

		// splitMode='me' → 100% Schuld
		expect(result1.fixedCostDue).toBe(50);
		expect(result1.privateBalanceEnd).toBe(50);

		// Monat 2: Carryover + neue 'me'-Kosten
		const month2: MonthInputs = {
			...month1,
			privateBalanceStart: result1.privateBalanceEnd, // 50€
			fixedCategories: [
				{
					id: 'c1',
					label: 'Persönlich',
					sortOrder: 0,
					items: [
						{ id: 'i2', label: 'Christian Netflix', amount: 15, splitMode: 'me', isDefault: true }
					]
				}
			],
			prepaymentThisMonth: 30
		};

		const result2 = calculateMonth(month2);

		// Carryover 50€ + neue Schuld 15€ - Vorauszahlung 30€ = 35€
		expect(result2.privateBalanceStart).toBe(50);
		expect(result2.fixedCostDue).toBe(15);
		expect(result2.privateTotalDueBeforePrepayment).toBe(65); // 50 + 15
		expect(result2.privateBalanceEnd).toBe(35); // 50 + 15 - 30
	});

	/**
	 * WORKFLOW TEST W3-P1: Mixed Split-Modes über 2 Monate
	 * 
	 * Kombination: income + me + partner über Lifecycle
	 */
	it('W3-P1: Mixed split-modes across months with carryover', () => {
		// Monat 1: Mix aus allen Split-Modi
		const month1: MonthInputs = {
			me: { id: '1', profileId: 'p1', name: 'Christian', netIncome: 3000 },
			partner: { id: '2', profileId: 'p2', name: 'Steffi', netIncome: 2000 },
			fixedCategories: [
				{
					id: 'c1',
					label: 'Mixed',
					sortOrder: 0,
					items: [
						{ id: 'i1', label: 'Miete', amount: 1000, splitMode: 'income', isDefault: true },
						{ id: 'i2', label: 'Christian Handy', amount: 50, splitMode: 'me', isDefault: true },
						{ id: 'i3', label: 'Steffi Gym', amount: 30, splitMode: 'partner', isDefault: true }
					]
				}
			],
			privateExpenses: [
				{ id: 'p1', label: 'Einkauf', amount: 100, createdBy: 'me' }
			],
			privateBalanceStart: 0,
			prepaymentThisMonth: 500
		};

		const result1 = calculateMonth(month1);

		// Share: 3000 / 5000 = 0.6
		// fixedCostDue: 1000×0.6 + 50×1.0 + 30×0 = 600 + 50 = 650
		// Privatausgaben: 100
		// Total: 0 + 100 + 650 - 500 = 250
		expect(result1.shareMe).toBeCloseTo(0.6, 5);
		expect(result1.fixedCostDue).toBe(650);
		expect(result1.privateTotalDueBeforePrepayment).toBe(750); // 0 + 100 + 650
		expect(result1.privateBalanceEnd).toBe(250); // 750 - 500

		// Monat 2: Carryover + neue Werte
		const month2: MonthInputs = {
			me: { id: '1', profileId: 'p1', name: 'Christian', netIncome: 3000 },
			partner: { id: '2', profileId: 'p2', name: 'Steffi', netIncome: 2000 },
			fixedCategories: [
				{
					id: 'c1',
					label: 'Mixed',
					sortOrder: 0,
					items: [
						{ id: 'i1', label: 'Miete', amount: 1000, splitMode: 'income', isDefault: true },
						{ id: 'i2', label: 'Christian Handy', amount: 50, splitMode: 'me', isDefault: true }
						// Steffi Gym entfällt
					]
				}
			],
			privateExpenses: [],
			privateBalanceStart: result1.privateBalanceEnd, // 250€
			prepaymentThisMonth: 700
		};

		const result2 = calculateMonth(month2);

		// fixedCostDue: 600 + 50 = 650
		// Total: 250 + 0 + 650 - 700 = 200
		expect(result2.privateBalanceStart).toBe(250);
		expect(result2.fixedCostDue).toBe(650);
		expect(result2.privateTotalDueBeforePrepayment).toBe(900); // 250 + 650
		expect(result2.privateBalanceEnd).toBe(200); // 900 - 700
	});

	/**
	 * WORKFLOW TEST W4-P1: Overpayment Lifecycle
	 * 
	 * Christian zahlt zu viel vor → Guthaben im nächsten Monat
	 */
	it('W4-P1: Overpayment creates negative balance (credit) in next month', () => {
		// Monat 1: Überzahlung
		const month1: MonthInputs = {
			me: { id: '1', profileId: 'p1', name: 'Christian', netIncome: 2000 },
			partner: { id: '2', profileId: 'p2', name: 'Steffi', netIncome: 2000 },
			fixedCategories: [
				{
					id: 'c1',
					label: 'Wohnen',
					sortOrder: 0,
					items: [
						{ id: 'i1', label: 'Miete', amount: 1000, splitMode: 'income', isDefault: true }
					]
				}
			],
			privateExpenses: [],
			privateBalanceStart: 0,
			prepaymentThisMonth: 700 // Schuld nur 500€!
		};

		const result1 = calculateMonth(month1);

		// Share: 50%
		// fixedCostDue: 500
		// Vorauszahlung: 700 → Overpayment 200€
		expect(result1.fixedCostDue).toBe(500);
		expect(result1.fixedCostOverpayment).toBe(200);
		expect(result1.privateBalanceEnd).toBe(-200); // Guthaben!

		// Monat 2: Guthaben wird verrechnet
		const month2: MonthInputs = {
			...month1,
			privateBalanceStart: result1.privateBalanceEnd, // -200€ (Guthaben)
			prepaymentThisMonth: 400
		};

		const result2 = calculateMonth(month2);

		// fixedCostDue: 500
		// Total: -200 + 0 + 500 - 400 = -100 (immer noch Guthaben)
		expect(result2.privateBalanceStart).toBe(-200);
		expect(result2.privateTotalDueBeforePrepayment).toBe(300); // -200 + 500
		expect(result2.privateBalanceEnd).toBe(-100); // Guthaben reduziert
	});
});
