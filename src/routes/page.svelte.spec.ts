import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

// Minimal-but-complete PageData mock — +page.svelte greift auf computed/month/
// history/privateExpenses zu; ohne vollständiges data wirft das Rendering.
const mockData = {
	month: { id: 'month-2026-01', month: 1, year: 2026, status: 'open' },
	computed: {
		shareMe: 0.5,
		sharePartner: 0.5,
		totalFixedCosts: 0,
		myFixedShare: 0,
		privateAddedThisMonth: 0,
		privateBalanceStart: 0,
		privateBalanceEnd: 0,
		prepaymentThisMonth: 0,
		fixedCostDue: 0,
		fixedCostShortfall: 0,
		fixedCostOverpayment: 0,
		privateTotalDueBeforePrepayment: 0,
		recommendedPrepayment: 0
	},
	privateExpenses: [],
	history: { fullMonthList: [], last5: [], totalCount: 0 }
};

describe('/+page.svelte', () => {
	it('should render h1', async () => {
		// target wird von vitest-browser-svelte intern gesetzt; Cast umgeht den zu strengen Mount-Typ
		render(Page, { props: { data: mockData } } as any);

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
	});
});
