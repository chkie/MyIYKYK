// ============================================================================
// Domain Types – MyIYKYK
// ============================================================================

/**
 * Money type – represents EUR with 2 decimal places.
 * Internally stored as number.
 */
export type Money = number;

/**
 * Person role in the relationship.
 */
export type PersonRole = 'me' | 'partner';

/**
 * Split mode determines how expenses are divided between partners.
 * - 'income': Split proportional to net income (fair split for shared costs)
 * - 'me': Paid entirely by me
 * - 'partner': Paid entirely by partner
 * 
 * Note: 'half' was removed - all shared costs use income-based split for fairness
 */
export type SplitMode = 'income' | 'me' | 'partner';

// ============================================================================
// Core Entities
// ============================================================================

/**
 * Person represents one partner in the relationship.
 */
export interface Person {
	role: PersonRole;
	name: string;
	netIncome: Money; // >= 0
}

/**
 * FixedItem represents a recurring expense (e.g., rent, utilities).
 */
export interface FixedItem {
	id: string;
	label: string;
	amount: Money; // >= 0
	splitMode: SplitMode; // default: 'income'
}

/**
 * FixedCategory groups related fixed items (e.g., "Housing", "Insurance").
 */
export interface FixedCategory {
	id: string;
	label: string;
	items: FixedItem[];
}

/**
 * PrivateExpense represents a one-time private expense.
 */
export interface PrivateExpense {
	id: string;
	dateISO: string; // YYYY-MM-DD
	description: string;
	amount: Money; // >= 0
}

// ============================================================================
// Month Calculation Data
// ============================================================================

/**
 * MonthInputs contains all input data for a monthly calculation.
 */
export interface MonthInputs {
	me: Person;
	partner: Person;
	fixedCategories: FixedCategory[];
	privateExpenses: PrivateExpense[];
	privateBalanceStart: Money; // can be negative
	totalTransferThisMonth: Money; // >= 0
}

/**
 * MonthComputed contains all calculated values for a month.
 */
export interface MonthComputed {
	shareMe: number; // 0..1 (income proportion)
	sharePartner: number; // 0..1 (income proportion)
	totalFixedCosts: Money;
	myFixedShare: Money;
	privateAddedThisMonth: Money;
	missingFixed: Money;
	surplusForPrivates: Money;
	privateTotalDueBeforePayment: Money;
	privateBalanceStart: Money; // can be negative
	privateBalanceEnd: Money;
}

