// ============================================================================
// Finance Functions – Pure calculation logic
// ============================================================================

import type {
	FixedCategory,
	FixedItem,
	MonthComputed,
	MonthInputs,
	PrivateExpense
} from './types.js';

// ============================================================================
// Money Utilities
// ============================================================================

/**
 * Rounds a monetary value to 2 decimal places.
 * Uses standard rounding (Math.round), not banker's rounding.
 *
 * Defensive: Returns 0 for NaN or Infinity values.
 *
 * @param value - The value to round
 * @returns The rounded value
 *
 * @example
 * roundMoney(1.234) // 1.23
 * roundMoney(1.235) // 1.24
 * roundMoney(NaN) // 0
 * roundMoney(Infinity) // 0
 */
export function roundMoney(value: number): number {
	// Defensive guards for edge cases
	if (!isFinite(value)) {
		return 0;
	}
	return Math.round(value * 100) / 100;
}

// ============================================================================
// Income Share Calculation
// ============================================================================

/**
 * Calculates income shares between me and partner.
 *
 * Rules:
 * - If both incomes <= 0: 50/50 split
 * - If only incomeMe > 0: 100/0 split
 * - If only incomePartner > 0: 0/100 split
 * - Otherwise: proportional to income
 *
 * @param incomeMe - My net income
 * @param incomePartner - Partner's net income
 * @returns Object with shareMe and sharePartner (raw values 0..1, not rounded)
 *
 * @example
 * calculateIncomeShares(2000, 3000) // { shareMe: 0.4, sharePartner: 0.6 }
 * calculateIncomeShares(0, 0) // { shareMe: 0.5, sharePartner: 0.5 }
 */
export function calculateIncomeShares(
	incomeMe: number,
	incomePartner: number
): { shareMe: number; sharePartner: number } {
	// Both incomes are zero or negative
	if (incomeMe <= 0 && incomePartner <= 0) {
		return { shareMe: 0.5, sharePartner: 0.5 };
	}

	// Only I have income
	if (incomeMe > 0 && incomePartner <= 0) {
		return { shareMe: 1, sharePartner: 0 };
	}

	// Only partner has income
	if (incomeMe <= 0 && incomePartner > 0) {
		return { shareMe: 0, sharePartner: 1 };
	}

	// Both have income: proportional split
	const total = incomeMe + incomePartner;
	const shareMe = incomeMe / total;
	const sharePartner = 1 - shareMe;

	return { shareMe, sharePartner };
}

// ============================================================================
// Cost Summation
// ============================================================================

/**
 * Calculates the total of all fixed costs across all categories.
 *
 * @param categories - Array of fixed cost categories
 * @returns Total fixed costs (rounded)
 *
 * @example
 * sumFixedCosts([
 *   { id: '1', label: 'Housing', items: [{ amount: 1000, ... }] }
 * ]) // 1000
 */
export function sumFixedCosts(categories: FixedCategory[]): number {
	const total = categories.reduce((sum, category) => {
		const categorySum = category.items.reduce((itemSum, item) => itemSum + item.amount, 0);
		return sum + categorySum;
	}, 0);

	return roundMoney(total);
}

/**
 * Calculates the total of all private expenses.
 *
 * @param expenses - Array of private expenses
 * @returns Total private expenses (rounded)
 *
 * @example
 * sumPrivateExpenses([
 *   { id: '1', amount: 50, ... },
 *   { id: '2', amount: 30, ... }
 * ]) // 80
 */
export function sumPrivateExpenses(expenses: PrivateExpense[]): number {
	const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
	return roundMoney(total);
}

// ============================================================================
// Fixed Cost Share Calculation
// ============================================================================

/**
 * Calculates my share of a single fixed item based on its split mode.
 *
 * Split modes:
 * - 'income': Proportional to my income share (fair split for shared costs)
 * - 'me': I pay the full amount
 * - 'partner': Partner pays (I pay 0)
 *
 * @param item - The fixed item
 * @param shareMe - My income share (0..1)
 * @returns My share of this item (rounded)
 *
 * @example
 * calculateMyShareForFixedItem(
 *   { amount: 1000, splitMode: 'income', ... },
 *   0.4
 * ) // 400
 */
export function calculateMyShareForFixedItem(item: FixedItem, shareMe: number): number {
	let myShare: number;

	switch (item.splitMode) {
		case 'income':
			myShare = item.amount * shareMe;
			break;
		case 'me':
			myShare = item.amount;
			break;
		case 'partner':
			myShare = 0;
			break;
		default:
			// Fallback for legacy 'half' mode: treat as income-based
			myShare = item.amount * shareMe;
			break;
	}

	return roundMoney(myShare);
}

/**
 * Calculates my total share of all fixed costs across all categories.
 *
 * @param categories - Array of fixed cost categories
 * @param shareMe - My income share (0..1)
 * @returns My total fixed cost share (rounded)
 *
 * @example
 * calculateMyFixedShare(
 *   [{ items: [{ amount: 1000, splitMode: 'half', ... }] }],
 *   0.4
 * ) // 500
 */
export function calculateMyFixedShare(categories: FixedCategory[], shareMe: number): number {
	const total = categories.reduce((sum, category) => {
		const categorySum = category.items.reduce((itemSum, item) => {
			return itemSum + calculateMyShareForFixedItem(item, shareMe);
		}, 0);
		return sum + categorySum;
	}, 0);

	return roundMoney(total);
}

/**
 * Calculates my share of transfer-relevant fixed costs (excludes splitMode='me').
 *
 * Items with splitMode='me' are personal costs paid directly from my account
 * and should not contribute to the transfer balance with the partner.
 *
 * @param categories - Array of fixed cost categories
 * @param shareMe - My income share (0..1)
 * @returns My transfer-relevant fixed cost share (rounded)
 *
 * @example
 * calculateMyTransferFixedShare(
 *   [{ items: [{ amount: 1000, splitMode: 'income', ... }, { amount: 100, splitMode: 'me', ... }] }],
 *   0.4
 * ) // 400 (only the 'income' item, 'me' is excluded)
 */
export function calculateMyTransferFixedShare(
	categories: FixedCategory[],
	shareMe: number
): number {
	const total = categories.reduce((sum, category) => {
		const categorySum = category.items.reduce((itemSum, item) => {
			// Skip personal costs (splitMode='me') as they don't contribute to partner balance
			if (item.splitMode === 'me') {
				return itemSum;
			}
			return itemSum + calculateMyShareForFixedItem(item, shareMe);
		}, 0);
		return sum + categorySum;
	}, 0);

	return roundMoney(total);
}

// ============================================================================
// Month Calculation
// ============================================================================

/**
 * Calculates all financial values for a month based on inputs.
 *
 * This is the main orchestration function that combines all helper functions
 * to compute the complete monthly financial picture.
 *
 * PREPAYMENT MODEL:
 * - At month start, I prepay my expected fixed cost share to partner
 * - During month, private expenses are paid by partner and added to my debt
 * - At month end: debt = oldDebt + privateExpenses + fixedShare - prepayment
 *
 * @param inputs - All input data for the month
 * @returns Complete computed month data
 *
 * @example
 * const result = calculateMonth({
 *   me: { role: 'me', name: 'Me', netIncome: 2000 },
 *   partner: { role: 'partner', name: 'Partner', netIncome: 3000 },
 *   fixedCategories: [...],
 *   privateExpenses: [...],
 *   privateBalanceStart: 0,
 *   prepaymentThisMonth: 1000
 * });
 */
export function calculateMonth(inputs: MonthInputs): MonthComputed {
	// a) Calculate income shares
	const { shareMe, sharePartner } = calculateIncomeShares(
		inputs.me.netIncome,
		inputs.partner.netIncome
	);

	// b) Calculate total fixed costs
	const totalFixedCosts = sumFixedCosts(inputs.fixedCategories);

	// c) Calculate my fixed share (total including 'me' items for display)
	const myFixedShare = calculateMyFixedShare(inputs.fixedCategories, shareMe);

	// c2) Calculate transfer-relevant fixed share (excludes splitMode='me')
	// This is what I actually owe to partner for shared costs
	const myTransferFixedShare = calculateMyTransferFixedShare(inputs.fixedCategories, shareMe);

	// d) Calculate private expenses added this month
	const privateAddedThisMonth = sumPrivateExpenses(inputs.privateExpenses);

	// e) Round and preserve private balance start
	const privateBalanceStart = roundMoney(inputs.privateBalanceStart);

	// f) Calculate what I owe for fixed costs (transfer-relevant only)
	const fixedCostDue = roundMoney(myTransferFixedShare);

	// g) Calculate prepayment amount this month
	const prepaymentThisMonth = roundMoney(inputs.prepaymentThisMonth);

	// h) Calculate underpayment or overpayment of fixed costs
	const fixedCostShortfall = roundMoney(Math.max(0, fixedCostDue - prepaymentThisMonth));
	const fixedCostOverpayment = roundMoney(Math.max(0, prepaymentThisMonth - fixedCostDue));

	// i) Calculate total debt before prepayment is applied
	// Debt increases by: private expenses + fixed costs owed
	const privateTotalDueBeforePrepayment = roundMoney(
		privateBalanceStart + privateAddedThisMonth + fixedCostDue
	);

	// j) Calculate final private balance after prepayment
	// Debt decreases by: prepayment made
	const privateBalanceEnd = roundMoney(privateTotalDueBeforePrepayment - prepaymentThisMonth);

	// k) Calculate recommended prepayment for next month (for UI guidance)
	const recommendedPrepayment = roundMoney(myTransferFixedShare);

	return {
		shareMe,
		sharePartner,
		totalFixedCosts,
		myFixedShare,
		privateAddedThisMonth,
		privateBalanceStart,
		privateBalanceEnd,
		prepaymentThisMonth,
		fixedCostDue,
		fixedCostShortfall,
		fixedCostOverpayment,
		privateTotalDueBeforePrepayment,
		recommendedPrepayment
	};
}
