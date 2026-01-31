// ============================================================================
// Integration Tests – Home Page Server Load
// ============================================================================

import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { PageServerLoad } from './$types.js';

// Mock Supabase module
vi.mock('$lib/server/supabase.js', () => ({
	getSupabaseServerClient: vi.fn(),
	getProfileIdByRole: vi.fn()
}));

// Mock months module
vi.mock('$lib/server/months.js', () => ({
	getOrCreateCurrentMonth: vi.fn(),
	ensureMonthIncomes: vi.fn(),
	listClosedMonths: vi.fn()
}));

// Mock fixed-costs module
vi.mock('$lib/server/fixed-costs.js', () => ({
	listFixedCategoriesWithItems: vi.fn()
}));

// Mock private-expenses module
vi.mock('$lib/server/private-expenses.js', () => ({
	listPrivateExpenses: vi.fn()
}));

// Mock history module
vi.mock('$lib/server/history.js', () => ({
	getMonthHistory: vi.fn()
}));

// Import after mocks
import { load } from './+page.server.js';
import * as supabaseModule from '$lib/server/supabase.js';
import * as monthsModule from '$lib/server/months.js';
import * as fixedCostsModule from '$lib/server/fixed-costs.js';
import * as privateExpensesModule from '$lib/server/private-expenses.js';
import * as historyModule from '$lib/server/history.js';

// ============================================================================
// Test Fixtures
// ============================================================================

const FIXTURES = {
	profiles: [
		{ id: 'profile-me-id', role: 'me', name: 'Christian' },
		{ id: 'profile-partner-id', role: 'partner', name: 'Steffi' }
	],
	
	month: {
		id: 'month-2026-01',
		year: 2026,
		month: 1,
		status: 'open',
		private_balance_start: 0,
		total_transfer_this_month: 0
	},
	
	incomes: [
		{ id: 'income-me', month_id: 'month-2026-01', profile_id: 'profile-me-id', net_income: 2000 },
		{ id: 'income-partner', month_id: 'month-2026-01', profile_id: 'profile-partner-id', net_income: 3000 }
	],
	
	fixedCategories: [
		{
			id: 'cat-1',
			label: 'Wohnen',
			sortOrder: 0,
			items: [
				{ id: 'item-1', label: 'Miete', amount: 1000, splitMode: 'income' }
			]
		}
	],
	
	privateExpenses: [],
	
	closedMonths: [],
	
	history: { entries: [] }
};

// ============================================================================
// Helper: Setup Mocks
// ============================================================================

function setupMocks(overrides: any = {}) {
	const fixtures = { ...FIXTURES, ...overrides };
	
	// Mock Supabase client
	const mockSupabaseClient = {
		from: vi.fn((table: string) => {
			if (table === 'profiles') {
				return {
					select: vi.fn(() => ({
						order: vi.fn(() => ({
							data: fixtures.profiles,
							error: null
						}))
					}))
				};
			}
			return {
				select: vi.fn(() => ({ data: [], error: null }))
			};
		})
	};
	
	vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue(mockSupabaseClient as any);
	vi.mocked(monthsModule.getOrCreateCurrentMonth).mockResolvedValue(fixtures.month as any);
	vi.mocked(monthsModule.ensureMonthIncomes).mockResolvedValue(fixtures.incomes as any);
	vi.mocked(monthsModule.listClosedMonths).mockResolvedValue(fixtures.closedMonths as any);
	vi.mocked(fixedCostsModule.listFixedCategoriesWithItems).mockResolvedValue(fixtures.fixedCategories as any);
	vi.mocked(privateExpensesModule.listPrivateExpenses).mockResolvedValue(fixtures.privateExpenses as any);
	vi.mocked(historyModule.getMonthHistory).mockResolvedValue(fixtures.history as any);
}

// ============================================================================
// Tests: Integration – Server Load
// ============================================================================

describe('Integration: Home Page Server Load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	/**
	 * TEST I1 (P0): Basic Load – Christian schuldet Steffi
	 * Fixture: Christian 2000€, Steffi 3000€, Fixkosten 1000€ proportional
	 * Expected: Christian schuldet 400€ (40% von 1000€)
	 */
	it('I1-P0: Basic Load - Christian schuldet Steffi (no prepayment)', async () => {
		setupMocks({
			incomes: [
				{ id: 'income-me', profile_id: 'profile-me-id', net_income: 2000 },
				{ id: 'income-partner', profile_id: 'profile-partner-id', net_income: 3000 }
			],
			fixedCategories: [
				{
					id: 'cat-1',
					label: 'Wohnen',
					sortOrder: 0,
					items: [
						{ id: 'item-1', label: 'Miete', amount: 1000, splitMode: 'income' }
					]
				}
			],
			month: {
				id: 'month-2026-01',
				year: 2026,
				month: 1,
				status: 'open',
				private_balance_start: 0,
				total_transfer_this_month: 0
			}
		});

		const result = await load({ url: new URL('http://localhost:5173') } as any);

		// Verify computed values
		expect(result.computed).toBeDefined();
		expect(result.computed.shareMe).toBeCloseTo(0.4, 5); // 2000 / 5000 = 0.4
		expect(result.computed.fixedCostDue).toBe(400); // 1000 × 0.4
		expect(result.computed.privateBalanceEnd).toBe(400); // 0 + 0 + 400 - 0
		
		// Verify direction: Christian schuldet Steffi
		expect(result.computed.privateBalanceEnd).toBeGreaterThan(0);
	});

	/**
	 * TEST I2 (P0): Vorauszahlung wird abgezogen
	 * Fixture: Fixkosten 1000€ (400€ Anteil), Vorauszahlung 300€
	 * Expected: Christian schuldet 100€ (400 - 300)
	 */
	it('I2-P0: Vorauszahlung wird korrekt abgezogen', async () => {
		setupMocks({
			month: {
				id: 'month-2026-01',
				year: 2026,
				month: 1,
				status: 'open',
				private_balance_start: 0,
				total_transfer_this_month: 300 // Vorauszahlung!
			}
		});

		const result = await load({ url: new URL('http://localhost:5173') } as any);

		// Verify prepayment is applied
		expect(result.computed.prepaymentThisMonth).toBe(300);
		expect(result.computed.fixedCostDue).toBe(400);
		expect(result.computed.privateBalanceEnd).toBe(100); // 400 - 300
		expect(result.computed.fixedCostShortfall).toBe(100); // Underpayment
	});

	/**
	 * TEST I3 (P0): Vorauszahlung Overpayment → Steffi schuldet Christian
	 * Fixture: Fixkosten 1000€ (400€ Anteil), Vorauszahlung 500€
	 * Expected: Steffi schuldet Christian 100€ (Balance = -100)
	 */
	it('I3-P0: Overpayment - Steffi schuldet Christian (negative balance)', async () => {
		setupMocks({
			month: {
				id: 'month-2026-01',
				year: 2026,
				month: 1,
				status: 'open',
				private_balance_start: 0,
				total_transfer_this_month: 500 // Zu viel!
			}
		});

		const result = await load({ url: new URL('http://localhost:5173') } as any);

		// Verify overpayment creates credit (negative balance)
		expect(result.computed.prepaymentThisMonth).toBe(500);
		expect(result.computed.fixedCostDue).toBe(400);
		expect(result.computed.privateBalanceEnd).toBe(-100); // 400 - 500 = -100
		expect(result.computed.fixedCostOverpayment).toBe(100);
		
		// Verify direction: Steffi schuldet Christian
		expect(result.computed.privateBalanceEnd).toBeLessThan(0);
	});

	/**
	 * TEST I4 (P0): Carryover wird berücksichtigt
	 * Fixture: Altschuld 200€ aus Vormonat + neue Fixkosten 400€
	 * Expected: Gesamtschuld 600€
	 */
	it('I4-P0: Carryover - Altschuld aus Vormonat wird addiert', async () => {
		setupMocks({
			month: {
				id: 'month-2026-01',
				year: 2026,
				month: 1,
				status: 'open',
				private_balance_start: 200, // Carryover!
				total_transfer_this_month: 0
			}
		});

		const result = await load({ url: new URL('http://localhost:5173') } as any);

		// Verify carryover is included
		expect(result.computed.privateBalanceStart).toBe(200);
		expect(result.computed.fixedCostDue).toBe(400);
		expect(result.computed.privateTotalDueBeforePrepayment).toBe(600); // 200 + 0 + 400
		expect(result.computed.privateBalanceEnd).toBe(600); // 600 - 0
	});

	/**
	 * TEST I5 (P0): Mixed Split-Modes
	 * Fixture: proportional + 'me' + 'partner' Positionen
	 * Expected: Nur proportional zählt für Partner-Schuld
	 */
	it('I5-P0: Mixed Split-Modes - nur shared costs zählen', async () => {
		setupMocks({
			incomes: [
				{ id: 'income-me', profile_id: 'profile-me-id', net_income: 3000 },
				{ id: 'income-partner', profile_id: 'profile-partner-id', net_income: 2000 }
			],
			fixedCategories: [
				{
					id: 'cat-1',
					label: 'Wohnen',
					sortOrder: 0,
					items: [
						{ id: 'item-1', label: 'Miete', amount: 1000, splitMode: 'income' },
						{ id: 'item-2', label: 'Strom', amount: 150, splitMode: 'income' }
					]
				},
				{
					id: 'cat-2',
					label: 'Persönlich',
					sortOrder: 1,
					items: [
						{ id: 'item-3', label: 'Christian Handy', amount: 50, splitMode: 'me' },
						{ id: 'item-4', label: 'Steffi Gym', amount: 30, splitMode: 'partner' }
					]
				}
			]
		});

		const result = await load({ url: new URL('http://localhost:5173') } as any);

		// Anteil: 3000 / 5000 = 0.6 (60%)
		expect(result.computed.shareMe).toBeCloseTo(0.6, 5);

		// Fixkosten Display (inkl. 'me'): 1000×0.6 + 150×0.6 + 50 = 600 + 90 + 50 = 740
		expect(result.computed.myFixedShare).toBe(740);

		// Partner-Schuld (inkl. 'me'): 1000×0.6 + 150×0.6 + 50 = 690 + 50 = 740
		expect(result.computed.fixedCostDue).toBe(740);
		expect(result.computed.privateBalanceEnd).toBe(740);

		// Total Fixkosten: 1000 + 150 + 50 + 30 = 1230
		expect(result.computed.totalFixedCosts).toBe(1230);
	});

	/**
	 * TEST I6 (P0): Complete Scenario mit Carryover + Vorauszahlung
	 * Fixture: Altschuld 150€, Fixkosten 400€, Vorauszahlung 250€
	 * Expected: Restschuld 300€ (150 + 400 - 250)
	 */
	it('I6-P0: Complete - Carryover + Vorauszahlung kombiniert', async () => {
		setupMocks({
			month: {
				id: 'month-2026-01',
				year: 2026,
				month: 1,
				status: 'open',
				private_balance_start: 150, // Altschuld
				total_transfer_this_month: 250 // Vorauszahlung
			}
		});

		const result = await load({ url: new URL('http://localhost:5173') } as any);

		// Verify complete calculation
		expect(result.computed.privateBalanceStart).toBe(150);
		expect(result.computed.fixedCostDue).toBe(400);
		expect(result.computed.prepaymentThisMonth).toBe(250);
		
		// Rechnung: 150 (alt) + 0 (private) + 400 (fixed) - 250 (prepay) = 300
		expect(result.computed.privateTotalDueBeforePrepayment).toBe(550);
		expect(result.computed.privateBalanceEnd).toBe(300);
		
		// Underpayment: 400 - 250 = 150
		expect(result.computed.fixedCostShortfall).toBe(150);
	});

	/**
	 * TEST I7 (P1): Zero Income Fallback
	 * Fixture: Beide Gehälter = 0€
	 * Expected: 50/50 Split (Fallback)
	 */
	it('I7-P1: Zero Income - Fallback zu 50/50 Split', async () => {
		setupMocks({
			incomes: [
				{ id: 'income-me', profile_id: 'profile-me-id', net_income: 0 },
				{ id: 'income-partner', profile_id: 'profile-partner-id', net_income: 0 }
			]
		});

		const result = await load({ url: new URL('http://localhost:5173') } as any);

		// Fallback: 50/50
		expect(result.computed.shareMe).toBe(0.5);
		expect(result.computed.sharePartner).toBe(0.5);
		
		// Fixkosten: 1000 × 0.5 = 500
		expect(result.computed.fixedCostDue).toBe(500);
		expect(result.computed.privateBalanceEnd).toBe(500);
	});

	/**
	 * TEST I8 (P1): Data Mapping – DB → Domain
	 * Verify: Number() conversion, field mapping (date → dateISO)
	 */
	it('I8-P1: Data Mapping - DB types to Domain types', async () => {
		setupMocks({
			incomes: [
				{ id: 'income-me', profile_id: 'profile-me-id', net_income: '2000' }, // String from DB
				{ id: 'income-partner', profile_id: 'profile-partner-id', net_income: '3000' }
			],
			fixedCategories: [
				{
					id: 'cat-1',
					label: 'Wohnen',
					sortOrder: 0,
					items: [
						{ id: 'item-1', label: 'Miete', amount: '1000.00', splitMode: 'income' } // String from DB
					]
				}
			]
		});

		const result = await load({ url: new URL('http://localhost:5173') } as any);

		// Verify Number() conversion works
		expect(result.computed.shareMe).toBeCloseTo(0.4, 2); // 2000.5 / 5001.25
		expect(typeof result.computed.fixedCostDue).toBe('number');
		expect(result.computed.fixedCostDue).toBeCloseTo(400, 0); // 1000 × 0.382
	});
});
