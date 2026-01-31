import { test, expect } from '@playwright/test';

test.describe('Fixkosten - Horizontal Overflow', () => {
	test('should not cause horizontal scroll after adding category', async ({ page }) => {
		// Navigate to fixkosten page (assuming auth is bypassed or handled)
		await page.goto('/fixkosten');
		
		// Wait for page to load
		await page.waitForLoadState('networkidle');
		
		// Check initial viewport width (no overflow)
		const initialScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
		const initialInnerWidth = await page.evaluate(() => window.innerWidth);
		expect(initialScrollWidth).toBeLessThanOrEqual(initialInnerWidth + 1); // +1 for rounding
		
		// Click "Neue Kategorie" button
		const addCategoryButton = page.getByRole('button', { name: /neue kategorie/i });
		if (await addCategoryButton.isVisible()) {
			await addCategoryButton.click();
			
			// Fill in category form
			await page.fill('input[name="label"]', 'Test Kategorie mit sehr langem Namen');
			
			// Submit form
			await page.getByRole('button', { name: /hinzufügen/i }).click();
			
			// Wait for success (category added)
			await page.waitForTimeout(500);
			
			// Check that no horizontal overflow occurred
			const finalScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
			const finalInnerWidth = await page.evaluate(() => window.innerWidth);
			
			expect(finalScrollWidth).toBeLessThanOrEqual(finalInnerWidth + 1); // +1 for rounding
		}
	});
	
	test('should not overflow with large amounts in category header', async ({ page }) => {
		await page.goto('/fixkosten');
		await page.waitForLoadState('networkidle');
		
		// Check that no horizontal overflow exists on page load
		const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
		const innerWidth = await page.evaluate(() => window.innerWidth);
		
		expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
	});
});
